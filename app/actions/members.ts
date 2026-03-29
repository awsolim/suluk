"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { isAdminOrTeacher, TEACHER_ASSIGNABLE_ROLES, PROTECTED_ROLES } from "@/lib/permissions";

export async function changeMemberRole(
  membershipId: string,
  mosqueId: string,
  newRole: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Could not load current profile." };
  }

  // Verify caller is admin of this mosque
  const { data: callerMembership, error: callerMembershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (callerMembershipError) {
    return { error: `Could not verify admin access: ${callerMembershipError.message}` };
  }

  if (!isAdminOrTeacher(callerMembership?.role)) {
    return { error: "Only admins and teachers can change member roles." };
  }

  // Teachers can only assign student or parent roles
  if (
    callerMembership?.role !== "mosque_admin" &&
    !TEACHER_ASSIGNABLE_ROLES.includes(newRole as typeof TEACHER_ASSIGNABLE_ROLES[number])
  ) {
    return { error: "Teachers can only assign student or parent roles." };
  }

  const validRoles = ["student", "teacher", "lead_teacher", "mosque_admin"];
  if (!validRoles.includes(newRole)) {
    return { error: "Invalid role." };
  }

  const { error: updateError } = await supabase
    .from("mosque_memberships")
    .update({ role: newRole })
    .eq("id", membershipId)
    .eq("mosque_id", mosqueId);

  if (updateError) {
    return { error: `Failed to change role: ${updateError.message}` };
  }

  revalidateTag("members", "max");

  return { success: true };
}

export async function toggleCanManagePrograms(
  membershipId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Could not load current profile." };
  }

  // Verify caller is admin of this mosque
  const { data: callerMembership, error: callerMembershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (callerMembershipError) {
    return { error: `Could not verify admin access: ${callerMembershipError.message}` };
  }

  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can toggle program management permissions." };
  }

  // Get current value
  const { data: targetMembership, error: targetError } = await supabase
    .from("mosque_memberships")
    .select("can_manage_programs")
    .eq("id", membershipId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (targetError || !targetMembership) {
    return { error: "Membership not found." };
  }

  const { error: updateError } = await supabase
    .from("mosque_memberships")
    .update({ can_manage_programs: !targetMembership.can_manage_programs })
    .eq("id", membershipId)
    .eq("mosque_id", mosqueId);

  if (updateError) {
    return { error: `Failed to toggle permission: ${updateError.message}` };
  }

  revalidateTag("members", "max");

  return { success: true };
}

export async function removeMemberFromMosque(
  membershipId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Could not load current profile." };
  }

  // Verify caller is admin of this mosque
  const { data: callerMembership, error: callerMembershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (callerMembershipError) {
    return { error: `Could not verify admin access: ${callerMembershipError.message}` };
  }

  if (!isAdminOrTeacher(callerMembership?.role)) {
    return { error: "Only admins and teachers can remove members." };
  }

  // Get the target membership to find their profile_id
  const { data: targetMembership, error: targetError } = await supabase
    .from("mosque_memberships")
    .select("profile_id")
    .eq("id", membershipId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (targetError || !targetMembership) {
    return { error: "Membership not found." };
  }

  // Teachers cannot remove other teachers or admins
  if (callerMembership?.role !== "mosque_admin") {
    const { data: targetMembershipRole } = await supabase
      .from("mosque_memberships")
      .select("role")
      .eq("id", membershipId)
      .eq("mosque_id", mosqueId)
      .maybeSingle();

    if (
      targetMembershipRole &&
      PROTECTED_ROLES.includes(targetMembershipRole.role as typeof PROTECTED_ROLES[number])
    ) {
      return { error: "Teachers cannot remove other teachers or admins." };
    }
  }

  // Delete any enrollments for this user's programs in this mosque
  const { data: mosquePrograms } = await supabase
    .from("programs")
    .select("id")
    .eq("mosque_id", mosqueId);

  if (mosquePrograms && mosquePrograms.length > 0) {
    const programIds = mosquePrograms.map((p) => p.id);

    await supabase
      .from("enrollments")
      .delete()
      .eq("student_profile_id", targetMembership.profile_id)
      .in("program_id", programIds);
  }

  // Delete the membership
  const { error: deleteError } = await supabase
    .from("mosque_memberships")
    .delete()
    .eq("id", membershipId)
    .eq("mosque_id", mosqueId);

  if (deleteError) {
    return { error: `Failed to remove member: ${deleteError.message}` };
  }

  revalidateTag("members", "max");
  revalidateTag("enrollments", "max");

  return { success: true };
}
