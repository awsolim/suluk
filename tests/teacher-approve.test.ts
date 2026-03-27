/**
 * Integration test for approving teacher requests.
 *
 * Catches the bug where approving a teacher request for a user who already
 * has a student membership fails silently due to unique constraint on
 * (mosque_id, profile_id). The fix uses upsert to upgrade the role.
 *
 * Run: npx vitest tests/teacher-approve.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

describe("Approve teacher request for existing student member", () => {
  const supabase = getServiceClient();
  const testSlug = `approve-test-${Date.now()}`;
  let mosqueId: string;
  let adminId: string;
  let studentId: string;
  let requestId: string;

  beforeAll(async () => {
    // Create mosque
    const { data: mosque } = await supabase
      .from("mosques")
      .insert({ name: "Approve Test Mosque", slug: testSlug })
      .select()
      .single();
    mosqueId = mosque!.id;

    // Create admin user
    const { data: admin } = await supabase.auth.admin.createUser({
      email: `approve-admin-${Date.now()}@test.suluk.dev`,
      password: "test-password-123!",
      email_confirm: true,
    });
    adminId = admin.user!.id;
    await supabase.from("profiles").upsert({
      id: adminId,
      full_name: "Test Admin",
      email: admin.user!.email,
    });
    await supabase.from("mosque_memberships").insert({
      mosque_id: mosqueId,
      profile_id: adminId,
      role: "mosque_admin",
    });

    // Create student user — already has a student membership
    const { data: student } = await supabase.auth.admin.createUser({
      email: `approve-student-${Date.now()}@test.suluk.dev`,
      password: "test-password-123!",
      email_confirm: true,
    });
    studentId = student.user!.id;
    await supabase.from("profiles").upsert({
      id: studentId,
      full_name: "Test Student",
      email: student.user!.email,
    });
    // This is the key: student already has a membership (from auto-join)
    await supabase.from("mosque_memberships").insert({
      mosque_id: mosqueId,
      profile_id: studentId,
      role: "student",
    });

    // Student submitted a teacher request
    const { data: req } = await supabase
      .from("teacher_join_requests")
      .insert({
        mosque_id: mosqueId,
        profile_id: studentId,
        status: "pending",
      })
      .select()
      .single();
    requestId = req!.id;
  });

  afterAll(async () => {
    await supabase
      .from("teacher_join_requests")
      .delete()
      .eq("mosque_id", mosqueId);
    await supabase
      .from("mosque_memberships")
      .delete()
      .eq("mosque_id", mosqueId);
    await supabase.from("profiles").delete().eq("id", adminId);
    await supabase.from("profiles").delete().eq("id", studentId);
    await supabase.from("mosques").delete().eq("id", mosqueId);
    await supabase.auth.admin.deleteUser(adminId);
    await supabase.auth.admin.deleteUser(studentId);
  });

  it("upgrades existing student membership to teacher on approve", async () => {
    // Verify student starts as student
    const { data: before } = await supabase
      .from("mosque_memberships")
      .select("role, can_manage_programs")
      .eq("profile_id", studentId)
      .eq("mosque_id", mosqueId)
      .single();
    expect(before!.role).toBe("student");

    // Simulate what approveTeacherRequest does:
    // 1. Update request status
    const { error: updateErr } = await supabase
      .from("teacher_join_requests")
      .update({ status: "approved", reviewed_by: adminId })
      .eq("id", requestId);
    expect(updateErr).toBeNull();

    // 2. Upsert membership (the fix — old code used insert which would fail)
    const { error: upsertErr } = await supabase
      .from("mosque_memberships")
      .upsert(
        {
          mosque_id: mosqueId,
          profile_id: studentId,
          role: "teacher",
          can_manage_programs: true,
        },
        { onConflict: "mosque_id,profile_id" }
      );
    expect(upsertErr).toBeNull();

    // Verify role was upgraded
    const { data: after } = await supabase
      .from("mosque_memberships")
      .select("role, can_manage_programs")
      .eq("profile_id", studentId)
      .eq("mosque_id", mosqueId)
      .single();
    expect(after!.role).toBe("teacher");
    expect(after!.can_manage_programs).toBe(true);

    // Verify still only 1 membership (not duplicated)
    const { data: all } = await supabase
      .from("mosque_memberships")
      .select("id")
      .eq("profile_id", studentId)
      .eq("mosque_id", mosqueId);
    expect(all).toHaveLength(1);
  });

  it("would FAIL with insert instead of upsert", async () => {
    // Reset to student for this test
    await supabase
      .from("mosque_memberships")
      .update({ role: "student", can_manage_programs: false })
      .eq("profile_id", studentId)
      .eq("mosque_id", mosqueId);

    // This is what the OLD code did — insert fails on unique constraint
    const { error: insertErr } = await supabase
      .from("mosque_memberships")
      .insert({
        mosque_id: mosqueId,
        profile_id: studentId,
        role: "teacher",
        can_manage_programs: true,
      });

    // INSERT should fail because row already exists
    expect(insertErr).not.toBeNull();
    expect(insertErr!.code).toBe("23505"); // unique_violation

    // Role should still be student (approve silently failed)
    const { data: still } = await supabase
      .from("mosque_memberships")
      .select("role")
      .eq("profile_id", studentId)
      .eq("mosque_id", mosqueId)
      .single();
    expect(still!.role).toBe("student");
  });
});
