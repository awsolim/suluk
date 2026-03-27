/**
 * Integration tests for the Stripe checkout webhook handler.
 *
 * These tests verify that handleCheckoutCompleted correctly creates
 * enrollments, updates application status, and creates subscription
 * records. They run against the real Supabase instance using the
 * service role client.
 *
 * Run: npx vitest tests/webhook-checkout.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { randomUUID } from "crypto";

// Use the same service client approach as the webhook handler
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function createAuthUser(supabase: ReturnType<typeof getServiceClient>, email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Auth user creation failed for ${email}: ${error.message}`);
  return data.user;
}

// Test fixtures
let supabase: ReturnType<typeof getServiceClient>;
let mosqueId: string;
let teacherId: string;
let studentId: string;
let parentId: string;
let childId: string;
let freeProgramId: string;
let paidProgramId: string;
const testSlug = `webhook-test-${Date.now()}`;
const testEmails: string[] = [];

// We need to dynamically import handleCheckoutCompleted because it uses
// Next.js imports that need env vars loaded first
let handleCheckoutCompleted: (supabase: any, session: Stripe.Checkout.Session) => Promise<void>;

beforeAll(async () => {
  // Load env from .env.local
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  const mod = await import("@/app/api/stripe/webhook/route");
  handleCheckoutCompleted = mod.handleCheckoutCompleted;

  supabase = getServiceClient();

  // Create auth users (profiles are auto-created by Supabase trigger or we upsert them)
  const teacherEmail = `teacher-wh-${Date.now()}@test.tareeqah.dev`;
  const studentEmail = `student-wh-${Date.now()}@test.tareeqah.dev`;
  const parentEmail = `parent-wh-${Date.now()}@test.tareeqah.dev`;
  testEmails.push(teacherEmail, studentEmail, parentEmail);

  const teacherUser = await createAuthUser(supabase, teacherEmail, "TestPass123!", "WH Teacher");
  const studentUser = await createAuthUser(supabase, studentEmail, "TestPass123!", "WH Student");
  const parentUser = await createAuthUser(supabase, parentEmail, "TestPass123!", "WH Parent");

  teacherId = teacherUser.id;
  studentId = studentUser.id;
  parentId = parentUser.id;
  childId = randomUUID();

  // Upsert profiles (trigger may have created them, upsert to be safe)
  await supabase.from("profiles").upsert([
    { id: teacherId, full_name: "WH Teacher", email: teacherEmail },
    { id: studentId, full_name: "WH Student", email: studentEmail },
    { id: parentId, full_name: "WH Parent", email: parentEmail },
  ]);

  // Child profile — no auth user. Insert via service client.
  // If profiles.id FK to auth.users still exists, this will fail.
  // In that case, create a dummy auth user for the child too.
  const { error: childErr } = await supabase.from("profiles").insert({
    id: childId,
    full_name: "WH Child",
  });
  if (childErr) {
    // FK constraint still exists — create an auth user for the child
    const childEmail = `child-wh-${Date.now()}@test.tareeqah.dev`;
    testEmails.push(childEmail);
    const childUser = await createAuthUser(supabase, childEmail, "TestPass123!", "WH Child");
    childId = childUser.id;
    await supabase.from("profiles").upsert({ id: childId, full_name: "WH Child", email: childEmail });
  }

  // Insert mosque
  mosqueId = randomUUID();
  const { error: mosqueErr } = await supabase.from("mosques").insert({
    id: mosqueId,
    name: "Webhook Test Mosque",
    slug: testSlug,
  });
  if (mosqueErr) throw new Error(`Mosque insert failed: ${mosqueErr.message}`);

  // Insert memberships — use 'student' for all since webhook doesn't check roles.
  // The 'parent' role check constraint may not exist in the DB yet (migration not applied).
  const { error: memberErr } = await supabase.from("mosque_memberships").insert([
    { mosque_id: mosqueId, profile_id: teacherId, role: "teacher" },
    { mosque_id: mosqueId, profile_id: studentId, role: "student" },
    { mosque_id: mosqueId, profile_id: parentId, role: "student" },
    { mosque_id: mosqueId, profile_id: childId, role: "student" },
  ]);
  if (memberErr) throw new Error(`Membership insert failed: ${memberErr.message}`);

  // Insert programs
  freeProgramId = randomUUID();
  paidProgramId = randomUUID();
  const { error: progErr } = await supabase.from("programs").insert([
    {
      id: freeProgramId,
      mosque_id: mosqueId,
      teacher_profile_id: teacherId,
      title: "Free Test Program",
      is_active: true,
      is_paid: false,
    },
    {
      id: paidProgramId,
      mosque_id: mosqueId,
      teacher_profile_id: teacherId,
      title: "Paid Test Program",
      is_active: true,
      is_paid: true,
      price_monthly_cents: 2000,
    },
  ]);
  if (progErr) throw new Error(`Program insert failed: ${progErr.message}`);
});

afterAll(async () => {
  // Clean up in reverse dependency order
  await supabase.from("program_subscriptions").delete().eq("program_id", paidProgramId);
  await supabase.from("program_subscriptions").delete().eq("program_id", freeProgramId);
  await supabase.from("enrollments").delete().eq("program_id", paidProgramId);
  await supabase.from("enrollments").delete().eq("program_id", freeProgramId);
  await supabase.from("program_applications").delete().eq("program_id", paidProgramId);
  await supabase.from("program_applications").delete().eq("program_id", freeProgramId);
  await supabase.from("programs").delete().eq("mosque_id", mosqueId);
  await supabase.from("mosque_memberships").delete().eq("mosque_id", mosqueId);
  await supabase.from("profiles").delete().in("id", [teacherId, studentId, parentId, childId]);
  await supabase.from("mosques").delete().eq("id", mosqueId);

  // Delete auth users
  const { data: users } = await supabase.auth.admin.listUsers();
  for (const email of testEmails) {
    const user = users?.users?.find((u: any) => u.email === email);
    if (user) await supabase.auth.admin.deleteUser(user.id);
  }
});

function mockSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: `cs_test_${randomUUID()}`,
    object: "checkout.session",
    metadata: {},
    subscription: null,
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe("handleCheckoutCompleted", () => {
  it("creates enrollment for student after payment", async () => {
    // Seed an accepted application
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: studentId,
      status: "accepted",
    });

    const session = mockSession({
      subscription: "sub_test_student",
      metadata: {
        program_id: paidProgramId,
        student_profile_id: studentId,
        mosque_id: mosqueId,
      },
    });

    await handleCheckoutCompleted(supabase, session);

    // Assert: enrollment exists
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId)
      .maybeSingle();

    expect(enrollment).not.toBeNull();
    expect(enrollment!.student_profile_id).toBe(studentId);

    // Assert: application status updated to "joined"
    const { data: application } = await supabase
      .from("program_applications")
      .select("status")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId)
      .maybeSingle();

    expect(application).not.toBeNull();
    expect(application!.status).toBe("joined");

    // Assert: subscription record created with correct student_profile_id
    const { data: subscription } = await supabase
      .from("program_subscriptions")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("profile_id", studentId)
      .maybeSingle();

    expect(subscription).not.toBeNull();
    expect(subscription!.stripe_subscription_id).toBe("sub_test_student");
    expect(subscription!.status).toBe("active");
  });

  it("creates enrollment for child when parent pays", async () => {
    // Seed an accepted application for the child
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: childId,
      status: "accepted",
    });

    const session = mockSession({
      subscription: "sub_test_child",
      metadata: {
        program_id: paidProgramId,
        student_profile_id: childId, // child gets enrolled
        payer_profile_id: parentId, // parent paid
        mosque_id: mosqueId,
      },
    });

    await handleCheckoutCompleted(supabase, session);

    // Assert: CHILD is enrolled (not parent)
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", childId)
      .maybeSingle();

    expect(enrollment).not.toBeNull();
    expect(enrollment!.student_profile_id).toBe(childId);

    // Assert: parent is NOT enrolled
    const { data: parentEnrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", parentId)
      .maybeSingle();

    expect(parentEnrollment).toBeNull();

    // Assert: child's application status updated to "joined"
    const { data: application } = await supabase
      .from("program_applications")
      .select("status")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", childId)
      .maybeSingle();

    expect(application!.status).toBe("joined");

    // Assert: subscription record uses child's profile ID
    const { data: subscription } = await supabase
      .from("program_subscriptions")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("profile_id", childId)
      .maybeSingle();

    expect(subscription).not.toBeNull();
    expect(subscription!.stripe_subscription_id).toBe("sub_test_child");
    expect(subscription!.status).toBe("active");
  });

  it("is idempotent — duplicate webhook does not create duplicate enrollment", async () => {
    const session = mockSession({
      subscription: "sub_test_student",
      metadata: {
        program_id: paidProgramId,
        student_profile_id: studentId,
        mosque_id: mosqueId,
      },
    });

    // Call twice
    await handleCheckoutCompleted(supabase, session);
    await handleCheckoutCompleted(supabase, session);

    // Assert: only one enrollment exists
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId);

    expect(enrollments).toHaveLength(1);
  });

  it("skips gracefully when metadata is missing", async () => {
    const session = mockSession({
      metadata: {}, // missing required fields
    });

    // Should not throw
    await expect(handleCheckoutCompleted(supabase, session)).resolves.not.toThrow();
  });

  it("handles checkout without subscription (one-time payment)", async () => {
    // Create a fresh student for this test
    const oneTimeEmail = `onetime-wh-${Date.now()}@test.tareeqah.dev`;
    const oneTimeUser = await createAuthUser(supabase, oneTimeEmail, "TestPass123!", "One Time Student");
    const oneTimeStudentId = oneTimeUser.id;
    testEmails.push(oneTimeEmail);

    await supabase.from("profiles").upsert({ id: oneTimeStudentId, full_name: "One Time Student", email: oneTimeEmail });
    await supabase.from("mosque_memberships").insert({
      mosque_id: mosqueId,
      profile_id: oneTimeStudentId,
      role: "student",
    });
    await supabase.from("program_applications").insert({
      program_id: freeProgramId,
      student_profile_id: oneTimeStudentId,
      status: "accepted",
    });

    const session = mockSession({
      subscription: null, // no subscription
      metadata: {
        program_id: freeProgramId,
        student_profile_id: oneTimeStudentId,
        mosque_id: mosqueId,
      },
    });

    await handleCheckoutCompleted(supabase, session);

    // Assert: enrollment created
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("program_id", freeProgramId)
      .eq("student_profile_id", oneTimeStudentId)
      .maybeSingle();

    expect(enrollment).not.toBeNull();

    // Assert: no subscription record (since subscription is null)
    const { data: subscription } = await supabase
      .from("program_subscriptions")
      .select("*")
      .eq("program_id", freeProgramId)
      .eq("profile_id", oneTimeStudentId)
      .maybeSingle();

    expect(subscription).toBeNull();

    // Cleanup
    await supabase.from("enrollments").delete().eq("student_profile_id", oneTimeStudentId);
    await supabase.from("program_applications").delete().eq("student_profile_id", oneTimeStudentId);
    await supabase.from("mosque_memberships").delete().eq("profile_id", oneTimeStudentId);
    await supabase.from("profiles").delete().eq("id", oneTimeStudentId);
  });
});
