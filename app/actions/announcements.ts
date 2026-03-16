"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProgramAnnouncement(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim(); // Read the mosque slug so redirects stay tenant-scoped.
  const programId = String(formData.get("programId") ?? "").trim(); // Read the teacher-owned program id for the new announcement.
  const message = String(formData.get("message") ?? "").trim(); // Read the teacher's announcement message from the form.

  if (!slug || !programId || !message) {
    redirect(`/m/${slug}/teacher/programs/${programId}`); // Reject incomplete submissions with a safe teacher-page fallback.
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(); // Load the currently authenticated user.

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/teacher/programs/${programId}`)}`
    ); // Require login before allowing announcement posting.
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle(); // Load the teacher's profile row.

  if (profileError || !profile) {
    throw new Error("Could not load teacher profile.");
  }

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id")
    .eq("slug", slug)
    .maybeSingle(); // Load the tenant mosque so teacher membership can be validated.

  if (mosqueError || !mosque) {
    throw new Error("Could not load mosque.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle(); // Confirm the current user is a teacher in this mosque.

  if (membershipError || !membership || membership.role !== "teacher") {
    throw new Error("Only teachers can post announcements.");
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, teacher_profile_id, mosque_id")
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .eq("teacher_profile_id", profile.id)
    .maybeSingle(); // Confirm the program belongs to this mosque and is assigned to this teacher.

  if (programError || !program) {
    throw new Error("You can only post announcements to your own class.");
  }

  const { error: insertError } = await supabase
    .from("program_announcements")
    .insert({
      program_id: program.id,
      author_profile_id: profile.id,
      message,
    }); // Insert the teacher's announcement into this class feed.

  if (insertError) {
    throw new Error(`Failed to post announcement: ${insertError.message}`);
  }

  redirect(
    `/m/${slug}/teacher/programs/${programId}?posted=1`
  ); // Return to the teacher class page with a simple success indicator.
}