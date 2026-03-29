"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestToJoinAsTeacher(mosqueId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Check if user already has a teacher or admin role in this mosque
  const { data: existingMembership } = await supabase
    .from("mosque_memberships")
    .select("id, role")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (existingMembership?.role === "teacher" || existingMembership?.role === "lead_teacher") {
    return { error: "You already have a teacher role." };
  }
  if (existingMembership?.role === "mosque_admin") {
    return { error: "You are already a mosque admin." };
  }

  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from("teacher_join_requests")
    .select("id, status")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      return { error: "You already have a pending request for this mosque." };
    }
    if (existingRequest.status === "approved") {
      return { error: "Your request was already approved." };
    }
    // If rejected, delete old request so we can insert a new one
    if (existingRequest.status === "rejected") {
      await supabase
        .from("teacher_join_requests")
        .delete()
        .eq("id", existingRequest.id);
    }
  }

  const { error: insertError } = await supabase
    .from("teacher_join_requests")
    .insert({
      mosque_id: mosqueId,
      profile_id: user.id,
      status: "pending",
    });

  if (insertError) {
    return { error: `Failed to submit request: ${insertError.message}` };
  }

  revalidateTag("teacher-requests", "max");

  return { success: true };
}

export async function approveTeacherRequest(
  requestId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Verify caller is mosque_admin
  const { data: callerMembership } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can approve teacher requests." };
  }

  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("teacher_join_requests")
    .select("id, profile_id, status")
    .eq("id", requestId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (requestError || !request) {
    return { error: "Request not found." };
  }

  if (request.status !== "pending") {
    return { error: "This request has already been reviewed." };
  }

  // Update request status
  const { error: updateError } = await supabase
    .from("teacher_join_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { error: `Failed to approve request: ${updateError.message}` };
  }

  // Create or upgrade to teacher membership
  const { error: membershipError } = await supabase
    .from("mosque_memberships")
    .upsert(
      {
        mosque_id: mosqueId,
        profile_id: request.profile_id,
        role: "teacher",
        can_manage_programs: true,
      },
      { onConflict: "mosque_id,profile_id" }
    );

  if (membershipError) {
    return { error: `Failed to create membership: ${membershipError.message}` };
  }

  revalidateTag("teacher-requests", "max");
  revalidateTag("members", "max");

  return { success: true };
}

export async function rejectTeacherRequest(
  requestId: string,
  mosqueId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Verify caller is mosque_admin
  const { data: callerMembership } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", user.id)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (callerMembership?.role !== "mosque_admin") {
    return { error: "Only mosque admins can reject teacher requests." };
  }

  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("teacher_join_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("mosque_id", mosqueId)
    .maybeSingle();

  if (requestError || !request) {
    return { error: "Request not found." };
  }

  if (request.status !== "pending") {
    return { error: "This request has already been reviewed." };
  }

  const { error: updateError } = await supabase
    .from("teacher_join_requests")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { error: `Failed to reject request: ${updateError.message}` };
  }

  revalidateTag("teacher-requests", "max");

  return { success: true };
}
