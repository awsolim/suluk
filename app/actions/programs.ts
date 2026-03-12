"use server";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Create a new program for the current mosque.
 * Only a mosque_admin for that mosque is allowed to do this.
 */
export async function createProgram(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim(); // Read the tenant slug so the action stays mosque-scoped.
  const title = String(formData.get("title") || "").trim(); // Read the program title from the form.
  const description = String(formData.get("description") || "").trim(); // Read the program description from the form.
  const isActive = formData.get("is_active") === "on"; // Read the checkbox state and convert it to a boolean.
  const teacherProfileIdRaw = String(formData.get("teacher_profile_id") || "").trim(); // Read the optional assigned teacher id from the form.
  const teacherProfileId = teacherProfileIdRaw || null; // Convert an empty dropdown selection into null for an unassigned program.

  if (!slug || !title) {
    redirect("/"); // Reject incomplete submissions with a safe fallback.
  }

  const supabase = await createClient();

  // Load the currently authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/admin/programs/new`)}`
    ); // Require login before allowing program creation.
  }

  // Load the current user's profile row.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load current profile.");
  }

  // Load the mosque for this tenant slug.
  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound(); // Hide the route if the tenant slug does not exist.
  }

  // Confirm that the current user is a mosque admin for this mosque.
  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to verify admin access: ${membershipError.message}`);
  }

  if (!membership || membership.role !== "mosque_admin") {
    notFound(); // Hide admin actions from non-admin users.
  }

  // If a teacher was selected, confirm that this teacher actually belongs to
  // this mosque and has the teacher role before saving the assignment.
  if (teacherProfileId) {
    const { data: teacherMembership, error: teacherMembershipError } = await supabase
      .from("mosque_memberships")
      .select("profile_id, role")
      .eq("profile_id", teacherProfileId)
      .eq("mosque_id", mosque.id)
      .eq("role", "teacher")
      .maybeSingle();

    if (teacherMembershipError) {
      throw new Error(
        `Failed to verify selected teacher: ${teacherMembershipError.message}`
      );
    }

    if (!teacherMembership) {
      throw new Error("Selected teacher is not valid for this mosque.");
    }
  }

  // Insert the new program for this mosque, including an optional assigned teacher.
  const { error: insertError } = await supabase.from("programs").insert({
    mosque_id: mosque.id,
    title,
    description: description || null,
    is_active: isActive,
    teacher_profile_id: teacherProfileId, // Save the selected teacher or null if left unassigned.
  });

  if (insertError) {
    throw new Error(`Failed to create program: ${insertError.message}`);
  }

  redirect(`/m/${slug}/admin/programs`); // Return to the admin programs list after a successful create.
}

export async function updateProgram(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim(); // Read the tenant slug so the update stays mosque-scoped.
  const programId = String(formData.get("programId") || "").trim(); // Read the target program id from the form.
  const title = String(formData.get("title") || "").trim(); // Read the updated title from the form.
  const description = String(formData.get("description") || "").trim(); // Read the updated description from the form.
  const isActive = formData.get("is_active") === "on"; // Read the checkbox state and convert it to a boolean.
  const teacherProfileIdRaw = String(formData.get("teacher_profile_id") || "").trim(); // Read the optional assigned teacher id from the form.
  const teacherProfileId = teacherProfileIdRaw || null; // Convert an empty dropdown selection into null for an unassigned program.

  if (!slug || !programId || !title) {
    redirect("/"); // Reject incomplete submissions with a safe fallback.
  }

  const supabase = await createClient();

  // Load the currently authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/admin/programs/${programId}/edit`
      )}`
    ); // Require login before allowing admin edits.
  }

  // Load the current user's profile row.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load current profile.");
  }

  // Load the mosque for this tenant slug.
  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound(); // Hide the route if the tenant slug does not exist.
  }

  // Confirm that the current user is a mosque admin for this mosque.
  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to verify admin access: ${membershipError.message}`);
  }

  if (!membership || membership.role !== "mosque_admin") {
    notFound(); // Hide admin actions from non-admin users.
  }

  // Confirm that the program belongs to this mosque before updating it.
  const { data: existingProgram, error: existingProgramError } = await supabase
    .from("programs")
    .select("id, mosque_id")
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (existingProgramError || !existingProgram) {
    notFound(); // Hide cross-tenant or invalid program ids.
  }

  // If a teacher was selected, confirm that this teacher actually belongs to
  // this mosque and has the teacher role before saving the assignment.
  if (teacherProfileId) {
    const { data: teacherMembership, error: teacherMembershipError } = await supabase
      .from("mosque_memberships")
      .select("profile_id, role")
      .eq("profile_id", teacherProfileId)
      .eq("mosque_id", mosque.id)
      .eq("role", "teacher")
      .maybeSingle();

    if (teacherMembershipError) {
      throw new Error(
        `Failed to verify selected teacher: ${teacherMembershipError.message}`
      );
    }

    if (!teacherMembership) {
      throw new Error("Selected teacher is not valid for this mosque.");
    }
  }

  // Update the program fields, including the optional assigned teacher.
  const { error: updateError } = await supabase
    .from("programs")
    .update({
      title,
      description: description || null,
      is_active: isActive,
      teacher_profile_id: teacherProfileId, // Save the selected teacher or null if the admin unassigns the program.
    })
    .eq("id", programId)
    .eq("mosque_id", mosque.id);

  if (updateError) {
    throw new Error(`Failed to update program: ${updateError.message}`);
  }

  redirect(`/m/${slug}/admin/programs`); // Return to the admin programs list after a successful update.
}

export async function updateTeacherProgram(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim(); // Read the tenant slug so the update stays mosque-scoped.
  const programId = String(formData.get("programId") || "").trim(); // Read the target teacher-owned program id from the form.
  const title = String(formData.get("title") || "").trim(); // Read the updated title from the form.
  const description = String(formData.get("description") || "").trim(); // Read the updated description from the form.

  if (!slug || !programId || !title) {
    redirect("/"); // Reject incomplete submissions with a safe fallback.
  }

  const supabase = await createClient();

  // Load the currently authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/teacher/programs/${programId}/edit`
      )}`
    ); // Require login before allowing teacher edits.
  }

  // Load the current user's profile row.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load current profile.");
  }

  // Load the mosque for this tenant slug.
  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound(); // Hide the route if the tenant slug does not exist.
  }

  // Confirm that the current user is a teacher for this mosque.
  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to verify teacher access: ${membershipError.message}`);
  }

  if (!membership || membership.role !== "teacher") {
    notFound(); // Hide teacher actions from non-teachers.
  }

  // Confirm that the target program belongs to this mosque and is assigned to this teacher.
  const { data: existingProgram, error: existingProgramError } = await supabase
    .from("programs")
    .select("id, mosque_id, teacher_profile_id")
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .eq("teacher_profile_id", profile.id)
    .maybeSingle();

  if (existingProgramError || !existingProgram) {
    notFound(); // Hide invalid, cross-tenant, or non-owned program ids.
  }

  // Update only the teacher-editable fields.
  const { error: updateError } = await supabase
    .from("programs")
    .update({
      title,
      description: description || null, // Save an empty description as null to keep the column clean.
    })
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .eq("teacher_profile_id", profile.id);

  if (updateError) {
    throw new Error(`Failed to update teacher program: ${updateError.message}`);
  }

  redirect(`/m/${slug}/teacher/programs/${programId}`); // Return to the teacher program detail page after a successful update.
}