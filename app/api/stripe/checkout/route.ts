import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Validates a checkout request against the database.
 * Exported for integration testing — tests can call this directly
 * without needing to mock Stripe or Next.js request objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function validateCheckout(
  supabase: any,
  params: {
    userId: string;
    programId: string;
    slug: string;
    childProfileId: string | null;
  }
): Promise<
  | { error: string; status: number }
  | {
      mosque: { id: string; slug: string; stripe_account_id: string };
      program: {
        id: string;
        title: string;
        is_paid: boolean;
        price_monthly_cents: number;
        stripe_price_id: string | null;
      };
      studentProfileId: string;
    }
> {
  const { userId, programId, slug, childProfileId } = params;

  if (!programId || !slug) {
    return { error: "Missing programId or slug.", status: 400 };
  }

  if (childProfileId && !UUID_RE.test(childProfileId)) {
    return { error: "Invalid childProfileId.", status: 400 };
  }

  if (!UUID_RE.test(programId)) {
    return { error: "Invalid programId.", status: 400 };
  }

  // Load the mosque and verify it has a connected Stripe account
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, slug, stripe_account_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!mosque) {
    return { error: "Mosque not found.", status: 404 };
  }

  if (!mosque.stripe_account_id) {
    return {
      error: "This mosque has not connected their Stripe account yet.",
      status: 400,
    };
  }

  // Verify the connected account can actually accept charges
  // (stripe_account_id exists ≠ onboarding is complete)
  try {
    const account = await stripe.accounts.retrieve(mosque.stripe_account_id);
    if (!account.charges_enabled) {
      return {
        error: "This mosque's Stripe account setup is incomplete. The admin needs to finish onboarding.",
        status: 400,
      };
    }
  } catch {
    return {
      error: "Unable to verify Stripe account status.",
      status: 500,
    };
  }

  // Load the program
  const { data: program } = await supabase
    .from("programs")
    .select(
      "id, mosque_id, title, is_paid, price_monthly_cents, stripe_price_id"
    )
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!program) {
    return { error: "Program not found.", status: 404 };
  }

  if (!program.is_paid || !program.price_monthly_cents) {
    return { error: "This program is not a paid program.", status: 400 };
  }

  // Determine the student being enrolled — either the user or their child
  const studentProfileId = childProfileId || userId;

  // If paying for a child, verify the parent-child link
  if (childProfileId) {
    const { data: link } = await supabase
      .from("parent_child_links")
      .select("id")
      .eq("parent_profile_id", userId)
      .eq("child_profile_id", childProfileId)
      .eq("mosque_id", mosque.id)
      .maybeSingle();

    if (!link) {
      return { error: "This child is not linked to your account.", status: 403 };
    }
  }

  // Verify the student has an accepted application
  const { data: application } = await supabase
    .from("program_applications")
    .select("id, status")
    .eq("student_profile_id", studentProfileId)
    .eq("program_id", programId)
    .maybeSingle();

  if (!application || application.status !== "accepted") {
    return {
      error: "An accepted application is required before paying.",
      status: 403,
    };
  }

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("program_id", programId)
    .eq("student_profile_id", studentProfileId)
    .maybeSingle();

  if (existingEnrollment) {
    return { error: "Already enrolled in this program.", status: 400 };
  }

  return { mosque, program, studentProfileId };
}

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for a paid program on the mosque's
 * connected account. The student must have an accepted application.
 *
 * Body: { programId: string, slug: string, childProfileId?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const programId = String(body.programId ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const childProfileId = body.childProfileId
    ? String(body.childProfileId).trim()
    : null;

  const result = await validateCheckout(supabase, {
    userId: user.id,
    programId,
    slug,
    childProfileId,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const { mosque, program, studentProfileId } = result;

  // Use server-derived origin and slug
  const origin = getAppOrigin();
  const mosqueSlug = mosque.slug;

  // Create or reuse a Stripe Price on the connected account
  let stripePriceId = program.stripe_price_id;

  if (!stripePriceId) {
    const product = await stripe.products.create(
      { name: program.title },
      { stripeAccount: mosque.stripe_account_id }
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: program.price_monthly_cents,
        currency: "cad",
        recurring: { interval: "month" },
      },
      { stripeAccount: mosque.stripe_account_id }
    );

    stripePriceId = price.id;

    // Save the price ID back to the program for reuse (conditional to prevent race)
    // Use service client to bypass RLS
    const serviceClient = createServiceClient();
    await serviceClient
      .from("programs")
      .update({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
      })
      .eq("id", program.id)
      .is("stripe_price_id", null);
  }

  // Create the Checkout Session on the connected account
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${origin}/m/${mosqueSlug}/programs/${programId}?payment=success`,
      cancel_url: `${origin}/m/${mosqueSlug}/programs/${programId}?payment=cancelled`,
      metadata: {
        program_id: programId,
        student_profile_id: studentProfileId,
        payer_profile_id: user.id,
        mosque_id: mosque.id,
        slug: mosqueSlug,
      },
      subscription_data: {
        metadata: {
          program_id: programId,
          student_profile_id: studentProfileId,
          payer_profile_id: user.id,
          mosque_id: mosque.id,
        },
      },
    },
    { stripeAccount: mosque.stripe_account_id }
  );

  return NextResponse.json({ url: session.url });
}
