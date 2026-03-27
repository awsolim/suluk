import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * POST /api/stripe/connect
 *
 * Creates a Stripe Connect Express account for a mosque and returns
 * an onboarding link. Only mosque admins can call this.
 *
 * Body: { mosqueId: string, slug: string }
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
  const mosqueId = String(body.mosqueId ?? "").trim();
  const slug = String(body.slug ?? "").trim();

  if (!mosqueId || !slug) {
    return NextResponse.json(
      { error: "Missing mosqueId or slug." },
      { status: 400 }
    );
  }

  if (!UUID_RE.test(mosqueId)) {
    return NextResponse.json(
      { error: "Invalid mosqueId." },
      { status: 400 }
    );
  }

  // Verify the user is a mosque admin
  const { data: membership } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (!membership || membership.role !== "mosque_admin") {
    return NextResponse.json(
      { error: "Only mosque admins can connect a Stripe account." },
      { status: 403 }
    );
  }

  // Check if the mosque already has a connected Stripe account
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, slug, stripe_account_id")
    .eq("id", mosqueId)
    .maybeSingle();

  if (!mosque) {
    return NextResponse.json({ error: "Mosque not found." }, { status: 404 });
  }

  let stripeAccountId = mosque.stripe_account_id;

  // Create a new Express account if one doesn't exist
  if (!stripeAccountId) {
    try {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Stripe Connect account creation failed:", message);
      return NextResponse.json(
        { error: `Stripe error: ${message}` },
        { status: 500 }
      );
    }

    // Store the Stripe account ID on the mosque record
    // Use service client to bypass RLS — auth check already passed above
    const serviceClient = createServiceClient();
    const { error: updateError } = await serviceClient
      .from("mosques")
      .update({ stripe_account_id: stripeAccountId })
      .eq("id", mosqueId);

    if (updateError) {
      console.error("Failed to save Stripe account ID:", updateError.message);
      return NextResponse.json(
        { error: "Failed to save Stripe account." },
        { status: 500 }
      );
    }
  }

  // Generate an onboarding link using server-derived slug from the mosque record
  const origin = getAppOrigin();
  const mosqueSlug = mosque.slug || slug;

  try {
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/m/${mosqueSlug}/settings`,
      return_url: `${origin}/m/${mosqueSlug}/settings?stripe=connected`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe account link creation failed:", message);
    return NextResponse.json(
      { error: `Stripe error: ${message}` },
      { status: 500 }
    );
  }
}
