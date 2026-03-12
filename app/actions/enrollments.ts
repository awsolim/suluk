"use server";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function enrollInProgram(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim(); // Read the tenant slug so enrollment stays mosque-scoped.
  const programId = String(formData.get("programId") ?? "").trim(); // Read the target program id from the form.
  const nextPath = `/m/${slug}/programs/${programId}`; // Build the return path for this program details page.

  if (!slug || !programId) {
    redirect("/"); // Reject malformed submissions with a safe fallback.
  }

  const supabase = await createClient();

  // Load the currently authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, send the user to the tenant login page and preserve the return path.
  if (!user) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(nextPath)}`);
  }

  // Load the current user's profile row.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load student profile.");
  }

  // Load the mosque for this tenant slug so we can verify mosque-scoped role restrictions.
  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound(); // Hide invalid tenant slugs behind a normal 404.
  }

  // Confirm the target program exists, belongs to this mosque, and is publicly active.
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, mosque_id, is_active")
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .eq("is_active", true)
    .maybeSingle();

  if (programError || !program) {
    throw new Error("Program not found.");
  }

  // Check whether the current user has an internal mosque role that should block enrollment.
  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Could not verify mosque role: ${membershipError.message}`);
  }

  const isTeacher = membership?.role === "teacher"; // Teachers should not enroll in programs.
  const isMosqueAdmin = membership?.role === "mosque_admin"; // Mosque admins should not enroll in programs.

  if (isTeacher || isMosqueAdmin) {
    throw new Error("Only student accounts can enroll in programs.");
  }

  // Check whether the student is already enrolled.
  const { data: existingEnrollment, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("program_id", programId)
    .eq("student_profile_id", profile.id)
    .maybeSingle();

  if (existingError) {
    throw new Error("Could not check enrollment status.");
  }

  // Insert the enrollment only if it does not already exist.
  if (!existingEnrollment) {
    const { error: insertError } = await supabase.from("enrollments").insert({
      program_id: programId,
      student_profile_id: profile.id,
    });

    if (insertError) {
      throw new Error(`Failed to enroll: ${insertError.message}`);
    }
  }

  // Return the user to the same program details page after enrolling.
  redirect(nextPath);
}