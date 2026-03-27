/**
 * Integration tests for the Stripe checkout validation logic.
 *
 * Tests validateCheckout() which handles all pre-Stripe checks:
 * - Input validation (missing/invalid params)
 * - Mosque lookup and Stripe Connect status
 * - Program existence, paid status, active status
 * - Application status (must be "accepted")
 * - Duplicate enrollment prevention
 * - Parent-child link verification for parent-pays-for-child
 *
 * Run: npx vitest tests/checkout-validation.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function createAuthUser(
  supabase: ReturnType<typeof getServiceClient>,
  email: string,
  password: string,
  fullName: string
) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Auth user creation failed for ${email}: ${error.message}`);
  return data.user;
}

// Fixtures
let supabase: ReturnType<typeof getServiceClient>;
let mosqueId: string;
let mosqueSlug: string;
let teacherId: string;
let studentId: string;
let parentId: string;
let childId: string;
let paidProgramId: string;
let freeProgramId: string;
const testEmails: string[] = [];

let validateCheckout: (
  supabase: any,
  params: {
    userId: string;
    programId: string;
    slug: string;
    childProfileId: string | null;
  }
) => Promise<{ error: string; status: number } | { mosque: any; program: any; studentProfileId: string }>;

beforeAll(async () => {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  const mod = await import("@/app/api/stripe/checkout/route");
  validateCheckout = mod.validateCheckout;

  supabase = getServiceClient();

  // Create auth users
  const ts = Date.now();
  const teacherEmail = `teacher-co-${ts}@test.tareeqah.dev`;
  const studentEmail = `student-co-${ts}@test.tareeqah.dev`;
  const parentEmail = `parent-co-${ts}@test.tareeqah.dev`;
  const childEmail = `child-co-${ts}@test.tareeqah.dev`;
  testEmails.push(teacherEmail, studentEmail, parentEmail, childEmail);

  const teacherUser = await createAuthUser(supabase, teacherEmail, "TestPass123!", "CO Teacher");
  const studentUser = await createAuthUser(supabase, studentEmail, "TestPass123!", "CO Student");
  const parentUser = await createAuthUser(supabase, parentEmail, "TestPass123!", "CO Parent");
  const childUser = await createAuthUser(supabase, childEmail, "TestPass123!", "CO Child");

  teacherId = teacherUser.id;
  studentId = studentUser.id;
  parentId = parentUser.id;
  childId = childUser.id;

  // Upsert profiles
  await supabase.from("profiles").upsert([
    { id: teacherId, full_name: "CO Teacher", email: teacherEmail },
    { id: studentId, full_name: "CO Student", email: studentEmail },
    { id: parentId, full_name: "CO Parent", email: parentEmail },
    { id: childId, full_name: "CO Child", email: childEmail },
  ]);

  // Create mosque WITH stripe_account_id (needed for checkout)
  mosqueId = randomUUID();
  mosqueSlug = `checkout-test-${ts}`;
  const { error: mosqueErr } = await supabase.from("mosques").insert({
    id: mosqueId,
    name: "Checkout Test Mosque",
    slug: mosqueSlug,
    stripe_account_id: "acct_test_fake_123", // fake but non-null
  });
  if (mosqueErr) throw new Error(`Mosque insert failed: ${mosqueErr.message}`);

  // Memberships
  const { error: memberErr } = await supabase.from("mosque_memberships").insert([
    { mosque_id: mosqueId, profile_id: teacherId, role: "teacher" },
    { mosque_id: mosqueId, profile_id: studentId, role: "student" },
    { mosque_id: mosqueId, profile_id: parentId, role: "student" },
    { mosque_id: mosqueId, profile_id: childId, role: "student" },
  ]);
  if (memberErr) throw new Error(`Membership insert failed: ${memberErr.message}`);

  // Parent-child link
  const { error: linkErr } = await supabase.from("parent_child_links").insert({
    parent_profile_id: parentId,
    child_profile_id: childId,
    mosque_id: mosqueId,
  });
  if (linkErr) throw new Error(`Parent-child link insert failed: ${linkErr.message}. Apply migration: supabase/migrations/001_tags_parent_role.sql`);

  // Programs
  paidProgramId = randomUUID();
  freeProgramId = randomUUID();
  const { error: progErr } = await supabase.from("programs").insert([
    {
      id: paidProgramId,
      mosque_id: mosqueId,
      teacher_profile_id: teacherId,
      title: "Paid Checkout Test",
      is_active: true,
      is_paid: true,
      price_monthly_cents: 3000,
    },
    {
      id: freeProgramId,
      mosque_id: mosqueId,
      teacher_profile_id: teacherId,
      title: "Free Checkout Test",
      is_active: true,
      is_paid: false,
    },
  ]);
  if (progErr) throw new Error(`Program insert failed: ${progErr.message}`);
});

afterAll(async () => {
  await supabase.from("program_subscriptions").delete().eq("program_id", paidProgramId);
  await supabase.from("program_subscriptions").delete().eq("program_id", freeProgramId);
  await supabase.from("enrollments").delete().eq("program_id", paidProgramId);
  await supabase.from("enrollments").delete().eq("program_id", freeProgramId);
  await supabase.from("program_applications").delete().eq("program_id", paidProgramId);
  await supabase.from("program_applications").delete().eq("program_id", freeProgramId);
  await supabase.from("parent_child_links").delete().eq("mosque_id", mosqueId);
  await supabase.from("programs").delete().eq("mosque_id", mosqueId);
  await supabase.from("mosque_memberships").delete().eq("mosque_id", mosqueId);
  await supabase.from("profiles").delete().in("id", [teacherId, studentId, parentId, childId]);
  await supabase.from("mosques").delete().eq("id", mosqueId);

  const { data: users } = await supabase.auth.admin.listUsers();
  for (const email of testEmails) {
    const user = users?.users?.find((u: any) => u.email === email);
    if (user) await supabase.auth.admin.deleteUser(user.id);
  }
});

describe("validateCheckout — input validation", () => {
  it("rejects missing programId", async () => {
    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: "",
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect(result).toEqual({ error: "Missing programId or slug.", status: 400 });
  });

  it("rejects missing slug", async () => {
    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: "",
      childProfileId: null,
    });
    expect(result).toEqual({ error: "Missing programId or slug.", status: 400 });
  });

  it("rejects invalid programId format", async () => {
    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: "not-a-uuid",
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect(result).toEqual({ error: "Invalid programId.", status: 400 });
  });

  it("rejects invalid childProfileId format", async () => {
    const result = await validateCheckout(supabase, {
      userId: parentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: "bad-uuid",
    });
    expect(result).toEqual({ error: "Invalid childProfileId.", status: 400 });
  });
});

describe("validateCheckout — mosque and program checks", () => {
  it("rejects unknown mosque slug", async () => {
    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: "nonexistent-mosque",
      childProfileId: null,
    });
    expect(result).toEqual({ error: "Mosque not found.", status: 404 });
  });

  it("rejects mosque without Stripe Connect", async () => {
    // Create a mosque with no stripe_account_id
    const noStripeId = randomUUID();
    const noStripeSlug = `no-stripe-${Date.now()}`;
    await supabase.from("mosques").insert({
      id: noStripeId,
      name: "No Stripe Mosque",
      slug: noStripeSlug,
    });

    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: noStripeSlug,
      childProfileId: null,
    });
    expect(result).toEqual({
      error: "This mosque has not connected their Stripe account yet.",
      status: 400,
    });

    // Cleanup
    await supabase.from("mosques").delete().eq("id", noStripeId);
  });

  it("rejects nonexistent program", async () => {
    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: randomUUID(),
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect(result).toEqual({ error: "Program not found.", status: 404 });
  });

  it("rejects free program", async () => {
    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: freeProgramId,
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect(result).toEqual({ error: "This program is not a paid program.", status: 400 });
  });
});

describe("validateCheckout — application and enrollment checks", () => {
  it("rejects student with no application", async () => {
    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect(result).toEqual({
      error: "An accepted application is required before paying.",
      status: 403,
    });
  });

  it("rejects student with pending application", async () => {
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: studentId,
      status: "pending",
    });

    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect(result).toEqual({
      error: "An accepted application is required before paying.",
      status: 403,
    });

    // Cleanup
    await supabase.from("program_applications").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId);
  });

  it("succeeds for student with accepted application", async () => {
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: studentId,
      status: "accepted",
    });

    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: null,
    });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.studentProfileId).toBe(studentId);
      expect(result.mosque.id).toBe(mosqueId);
      expect(result.program.id).toBe(paidProgramId);
    }

    await supabase.from("program_applications").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId);
  });

  it("rejects already enrolled student", async () => {
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: studentId,
      status: "accepted",
    });
    await supabase.from("enrollments").insert({
      program_id: paidProgramId,
      student_profile_id: studentId,
    });

    const result = await validateCheckout(supabase, {
      userId: studentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: null,
    });
    expect(result).toEqual({ error: "Already enrolled in this program.", status: 400 });

    // Cleanup
    await supabase.from("enrollments").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId);
    await supabase.from("program_applications").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId);
  });
});

describe("validateCheckout — parent-pays-for-child", () => {
  it("succeeds when parent pays for linked child with accepted application", async () => {
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: childId,
      status: "accepted",
    });

    const result = await validateCheckout(supabase, {
      userId: parentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: childId,
    });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      // The CHILD is the student, not the parent
      expect(result.studentProfileId).toBe(childId);
    }

    await supabase.from("program_applications").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", childId);
  });

  it("rejects parent paying for unlinked child", async () => {
    // studentId is NOT linked to parentId
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: studentId,
      status: "accepted",
    });

    const result = await validateCheckout(supabase, {
      userId: parentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: studentId, // not a linked child
    });

    expect(result).toEqual({
      error: "This child is not linked to your account.",
      status: 403,
    });

    await supabase.from("program_applications").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", studentId);
  });

  it("rejects parent paying for child without accepted application", async () => {
    // Child has no application at all
    const result = await validateCheckout(supabase, {
      userId: parentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: childId,
    });

    expect(result).toEqual({
      error: "An accepted application is required before paying.",
      status: 403,
    });
  });

  it("rejects parent paying for already-enrolled child", async () => {
    await supabase.from("program_applications").insert({
      program_id: paidProgramId,
      student_profile_id: childId,
      status: "accepted",
    });
    await supabase.from("enrollments").insert({
      program_id: paidProgramId,
      student_profile_id: childId,
    });

    const result = await validateCheckout(supabase, {
      userId: parentId,
      programId: paidProgramId,
      slug: mosqueSlug,
      childProfileId: childId,
    });

    expect(result).toEqual({ error: "Already enrolled in this program.", status: 400 });

    await supabase.from("enrollments").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", childId);
    await supabase.from("program_applications").delete()
      .eq("program_id", paidProgramId)
      .eq("student_profile_id", childId);
  });
});
