"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function applyToProgram(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();

  if (!slug || !programId) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/programs/${programId}`)}`
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load student profile.");
  }

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound();
  }

  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Could not verify mosque role: ${membershipError.message}`);
  }

  if (membership?.role === "teacher" || membership?.role === "mosque_admin") {
    throw new Error("Only student accounts can apply to programs.");
  }

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

  const { data: existingEnrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("program_id", programId)
    .eq("student_profile_id", profile.id)
    .maybeSingle();

  if (enrollmentError) {
    throw new Error(`Could not check enrollment: ${enrollmentError.message}`);
  }

  if (existingEnrollment) {
    redirect(`/m/${slug}/programs/${programId}`);
  }

  const { data: existingApplication, error: existingApplicationError } =
    await supabase
      .from("program_applications")
      .select("id, status")
      .eq("program_id", programId)
      .eq("student_profile_id", profile.id)
      .maybeSingle();

  if (existingApplicationError) {
    throw new Error(
      `Could not check application status: ${existingApplicationError.message}`
    );
  }

  if (!existingApplication) {
    const { error: insertError } = await supabase
      .from("program_applications")
      .insert({
        program_id: programId,
        student_profile_id: profile.id,
        status: "pending",
      });

    if (insertError) {
      throw new Error(`Failed to apply: ${insertError.message}`);
    }
  }

  revalidatePath(`/m/${slug}/programs`);
  revalidatePath(`/m/${slug}/programs/${programId}`);
  revalidatePath(`/m/${slug}/dashboard`);
  revalidatePath(`/m/${slug}/teacher/programs/${programId}`);

  redirect(`/m/${slug}/programs/${programId}`);
}

export async function acceptProgramApplication(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const applicationId = String(formData.get("applicationId") ?? "").trim();

  if (!slug || !applicationId) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/dashboard`)}`);
  }

  const { error } = await supabase
    .from("program_applications")
    .update({
      status: "accepted",
      reviewed_at: new Date().toISOString(),
      reviewed_by_profile_id: user.id,
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to accept application: ${error.message}`);
  }

  revalidatePath(`/m/${slug}/dashboard`);
  redirect(`/m/${slug}/dashboard`);
}

export async function rejectProgramApplication(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const applicationId = String(formData.get("applicationId") ?? "").trim();

  if (!slug || !applicationId) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/dashboard`)}`);
  }

  const { error } = await supabase
    .from("program_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by_profile_id: user.id,
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to reject application: ${error.message}`);
  }

  revalidatePath(`/m/${slug}/dashboard`);
  redirect(`/m/${slug}/dashboard`);
}

export async function joinApprovedFreeProgram(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();

  if (!slug || !programId) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/dashboard`)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load student profile.");
  }

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, is_paid")
    .eq("id", programId)
    .maybeSingle();

  if (programError || !program) {
    throw new Error("Program not found.");
  }

  if (program.is_paid) {
    throw new Error("Paid programs cannot be joined directly.");
  }

  const { data: application, error: applicationError } = await supabase
    .from("program_applications")
    .select("id, status")
    .eq("program_id", programId)
    .eq("student_profile_id", profile.id)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error("Application not found.");
  }

  if (application.status !== "accepted") {
    throw new Error("This application is not approved yet.");
  }

  const { data: existingEnrollment, error: existingEnrollmentError } =
    await supabase
      .from("enrollments")
      .select("id")
      .eq("program_id", programId)
      .eq("student_profile_id", profile.id)
      .maybeSingle();

  if (existingEnrollmentError) {
    throw new Error(
      `Could not check current enrollment: ${existingEnrollmentError.message}`
    );
  }

  if (!existingEnrollment) {
    const { error: insertError } = await supabase.from("enrollments").insert({
      program_id: programId,
      student_profile_id: profile.id,
    });

    if (insertError) {
      throw new Error(`Failed to join class: ${insertError.message}`);
    }
  }

  const { error: updateError } = await supabase
    .from("program_applications")
    .update({
      status: "joined",
    })
    .eq("id", application.id);

  if (updateError) {
    throw new Error(`Failed to finalize application: ${updateError.message}`);
  }

  revalidatePath(`/m/${slug}/dashboard`);
  revalidatePath(`/m/${slug}/classes`);
  revalidatePath(`/m/${slug}/classes/${programId}`);
  revalidatePath(`/m/${slug}/programs`);
  revalidatePath(`/m/${slug}/programs/${programId}`);

  redirect(`/m/${slug}/classes/${programId}`);
}