/**
 * End-to-end payment flow integration tests using real Stripe test mode API.
 *
 * Tests the full payment lifecycle:
 * 1. validateCheckout() — all pre-Stripe DB checks
 * 2. Stripe API — create products, prices, checkout sessions on connected accounts
 * 3. handleCheckoutCompleted() — webhook enrolls the student and creates subscription
 *
 * Uses sk_test_ keys so no real money is involved.
 *
 * Run: npx vitest run tests/stripe-payment-flow.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { randomUUID } from "crypto";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  if (!key.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY must be a test mode key (sk_test_)");
  return new Stripe(key, { typescript: true });
}

async function createAuthUser(
  supabase: ReturnType<typeof getServiceClient>,
  email: string,
  password: string,
  fullName: string
) {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Auth user creation failed: ${error.message}`);
  return data.user;
}

// Fixtures
let supabase: ReturnType<typeof getServiceClient>;
let stripe: Stripe;
let mosqueId: string;
let mosqueSlug: string;
let stripeAccountId: string;
let teacherId: string;
let studentId: string;
let parentId: string;
let childId: string;
let paidProgramId: string;
let stripePriceId: string;
const testEmails: string[] = [];

let validateCheckout: any;
let handleCheckoutCompleted: any;

beforeAll(async () => {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  const checkoutMod = await import("@/app/api/stripe/checkout/route");
  validateCheckout = checkoutMod.validateCheckout;

  const webhookMod = await import("@/app/api/stripe/webhook/route");
  handleCheckoutCompleted = webhookMod.handleCheckoutCompleted;

  supabase = getServiceClient();
  stripe = getStripe();

  // Create a real Stripe Connect test account
  const account = await stripe.accounts.create({
    type: "standard",
    country: "CA",
    business_profile: {
      name: "Test Mosque",
    },
  });
  stripeAccountId = account.id;

  // Create auth users
  const ts = Date.now();
  const teacherEmail = `teacher-sp-${ts}@test.suluk.dev`;
  const studentEmail = `student-sp-${ts}@test.suluk.dev`;
  const parentEmail = `parent-sp-${ts}@test.suluk.dev`;
  const childEmail = `child-sp-${ts}@test.suluk.dev`;
  testEmails.push(teacherEmail, studentEmail, parentEmail, childEmail);

  const teacherUser = await createAuthUser(supabase, teacherEmail, "TestPass123!", "SP Teacher");
  const studentUser = await createAuthUser(supabase, studentEmail, "TestPass123!", "SP Student");
  const parentUser = await createAuthUser(supabase, parentEmail, "TestPass123!", "SP Parent");
  const childUser = await createAuthUser(supabase, childEmail, "TestPass123!", "SP Child");

  teacherId = teacherUser.id;
  studentId = studentUser.id;
  parentId = parentUser.id;
  childId = childUser.id;

  await supabase.from("profiles").upsert([
    { id: teacherId, full_name: "SP Teacher", email: teacherEmail },
    { id: studentId, full_name: "SP Student", email: studentEmail },
    { id: parentId, full_name: "SP Parent", email: parentEmail },
    { id: childId, full_name: "SP Child", email: childEmail },
  ]);

  // Create mosque with real Stripe Connect account
  mosqueId = randomUUID();
  mosqueSlug = `stripe-test-${ts}`;
  await supabase.from("mosques").insert({
    id: mosqueId,
    name: "Stripe Test Mosque",
    slug: mosqueSlug,
    stripe_account_id: stripeAccountId,
  });

  await supabase.from("mosque_memberships").insert([
    { mosque_id: mosqueId, profile_id: teacherId, role: "teacher" },
    { mosque_id: mosqueId, profile_id: studentId, role: "student" },
    { mosque_id: mosqueId, profile_id: parentId, role: "student" },
    { mosque_id: mosqueId, profile_id: childId, role: "student" },
  ]);

  // Parent-child link
  await supabase.from("parent_child_links").insert({
    parent_profile_id: parentId,
    child_profile_id: childId,
    mosque_id: mosqueId,
  });

  // Create a Stripe product and price on the connected account
  const product = await stripe.products.create(
    { name: "Test Paid Program" },
    { stripeAccount: stripeAccountId }
  );

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: 2500,
      currency: "cad",
      recurring: { interval: "month" },
    },
    { stripeAccount: stripeAccountId }
  );
  stripePriceId = price.id;

  // Create paid program with the Stripe price
  paidProgramId = randomUUID();
  await supabase.from("programs").insert({
    id: paidProgramId,
    mosque_id: mosqueId,
    teacher_profile_id: teacherId,
    title: "Test Paid Program",
    is_active: true,
    is_paid: true,
    price_monthly_cents: 2500,
    stripe_product_id: product.id,
    stripe_price_id: stripePriceId,
  });
}, 30000); // 30s timeout for Stripe API calls

afterAll(async () => {
  // DB cleanup
  await supabase.from("program_subscriptions").delete().eq("program_id", paidProgramId);
  await supabase.from("enrollments").delete().eq("program_id", paidProgramId);
  await supabase.from("program_applications").delete().eq("program_id", paidProgramId);
  await supabase.from("parent_child_links").delete().eq("mosque_id", mosqueId);
  await supabase.from("programs").delete().eq("mosque_id", mosqueId);
  await supabase.from("mosque_memberships").delete().eq("mosque_id", mosqueId);
  await supabase.from("profiles").delete().in("id", [teacherId, studentId, parentId, childId]);
  await supabase.from("mosques").delete().eq("id", mosqueId);

  // Auth user cleanup
  const { data: users } = await supabase.auth.admin.listUsers();
  for (const email of testEmails) {
    const user = users?.users?.find((u: any) => u.email === email);
    if (user) await supabase.auth.admin.deleteUser(user.id);
  }

  // Delete Stripe test account
  try {
    await stripe.accounts.del(stripeAccountId);
  } catch {
    // May fail if account wasn't fully onboarded — that's fine
  }
}, 15000);

describe("Full Stripe payment flow — student pays for themselves", () => {
  it("validates checkout, creates Stripe session, and webhook enrolls student", async () => {
    // 1. Seed an accepted application
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: studentId,
      status: "accepted",
    });

    // 2. Validate checkout passes
    const validation = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect("error" in validation).toBe(false);
    if ("error" in validation) return;
    expect(validation.studentProfileId).toBe(studentId);
    expect(validation.mosque.stripe_account_id).toBe(stripeAccountId);

    // 3. Create a real Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        metadata: {
          program_id: paidProgramId,
          student_profile_id: studentId,
          payer_profile_id: studentId,
          mosque_id: mosqueId,
          slug: mosqueSlug,
        },
        subscription_data: {
          metadata: {
            program_id: paidProgramId,
            student_profile_id: studentId,
            mosque_id: mosqueId,
          },
        },
      },
      { stripeAccount: stripeAccountId }
    );

    // 4. Verify session was created correctly
    expect(session.id).toBeTruthy();
    expect(session.url).toBeTruthy();
    expect(session.metadata?.student_profile_id).toBe(studentId);
    expect(session.metadata?.program_id).toBe(paidProgramId);

    // 5. Simulate the webhook with a fake subscription ID
    //    (In production, Stripe sends this after the customer pays)
    const fakeWebhookSession = {
      ...session,
      subscription: "sub_test_student_" + Date.now(),
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(supabase, fakeWebhookSession);

    // 6. Assert: student is enrolled
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId)
      .maybeSingle();

    expect(enrollment).not.toBeNull();

    // 7. Assert: application updated to "joined"
    const { data: application } = await supabase
      .from("program_applications")
      .select("status")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId)
      .maybeSingle();

    expect(application!.status).toBe("joined");

    // 8. Assert: subscription record created
    const { data: subscription } = await supabase
      .from("program_subscriptions")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("profile_id", studentId)
      .maybeSingle();

    expect(subscription).not.toBeNull();
    expect(subscription!.status).toBe("active");
  }, 20000);
});

describe("Full Stripe payment flow — parent pays for child", () => {
  it("validates checkout with childProfileId, creates session, webhook enrolls child", async () => {
    // 1. Seed an accepted application for the child
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: childId,
      status: "accepted",
    });

    // 2. Validate checkout — parent paying for child
    const validation = await validateCheckout(supabase, {
      userId: parentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: childId,
    });
    expect("error" in validation).toBe(false);
    if ("error" in validation) return;
    expect(validation.studentProfileId).toBe(childId); // child, not parent

    // 3. Create real Stripe Checkout Session with child as student
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        metadata: {
          program_id: paidProgramId,
          student_profile_id: childId,
          payer_profile_id: parentId,
          mosque_id: mosqueId,
          slug: mosqueSlug,
        },
        subscription_data: {
          metadata: {
            program_id: paidProgramId,
            student_profile_id: childId,
            payer_profile_id: parentId,
            mosque_id: mosqueId,
          },
        },
      },
      { stripeAccount: stripeAccountId }
    );

    // 4. Verify session metadata
    expect(session.metadata?.student_profile_id).toBe(childId);
    expect(session.metadata?.payer_profile_id).toBe(parentId);

    // 5. Simulate webhook
    const fakeWebhookSession = {
      ...session,
      subscription: "sub_test_child_" + Date.now(),
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(supabase, fakeWebhookSession);

    // 6. Assert: CHILD is enrolled
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", childId)
      .maybeSingle();

    expect(enrollment).not.toBeNull();

    // 7. Assert: PARENT is NOT enrolled
    const { data: parentEnrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", parentId)
      .maybeSingle();

    expect(parentEnrollment).toBeNull();

    // 8. Assert: child's application → "joined"
    const { data: application } = await supabase
      .from("program_applications")
      .select("status")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", childId)
      .maybeSingle();

    expect(application!.status).toBe("joined");

    // 9. Assert: subscription under child's profile
    const { data: subscription } = await supabase
      .from("program_subscriptions")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("profile_id", childId)
      .maybeSingle();

    expect(subscription).not.toBeNull();
    expect(subscription!.status).toBe("active");
  }, 20000);
});
