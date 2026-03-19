"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can change member roles." };
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

  // Get mosque slug for revalidation
  const { data: mosque } = await supabase
    .from("mosques")
    .select("slug")
    .eq("id", mosqueId)
    .maybeSingle();

  if (mosque?.slug) {
    revalidatePath(`/m/${mosque.slug}/admin/members`);
  }

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

  // Get mosque slug for revalidation
  const { data: mosque } = await supabase
    .from("mosques")
    .select("slug")
    .eq("id", mosqueId)
    .maybeSingle();

  if (mosque?.slug) {
    revalidatePath(`/m/${mosque.slug}/admin/members`);
  }

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

  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can remove members." };
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

  // Get mosque slug for revalidation
  const { data: mosque } = await supabase
    .from("mosques")
    .select("slug")
    .eq("id", mosqueId)
    .maybeSingle();

  if (mosque?.slug) {
    revalidatePath(`/m/${mosque.slug}/admin/members`);
  }

  return { success: true };
}
