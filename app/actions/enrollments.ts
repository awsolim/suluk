"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function enrollInProgram(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();
  const nextPath = `/m/${slug}/programs/${programId}`;

  if (!slug || !programId) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(nextPath)}`);
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
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound();
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

  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Could not verify mosque role: ${membershipError.message}`);
  }

  const isTeacher = membership?.role === "teacher";
  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isParent = membership?.role === "parent";

  if (isTeacher || isMosqueAdmin || isParent) {
    throw new Error("Only student accounts can enroll in programs.");
  }

  const { data: existingEnrollment, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("program_id", programId)
    .eq("student_profile_id", profile.id)
    .maybeSingle();

  if (existingError) {
    throw new Error("Could not check enrollment status.");
  }

  if (!existingEnrollment) {
    const { error: insertError } = await supabase.from("enrollments").insert({
      program_id: programId,
      student_profile_id: profile.id,
    });

    if (insertError) {
      throw new Error(`Failed to enroll: ${insertError.message}`);
    }
  }

  revalidatePath(`/m/${slug}/dashboard`);
  revalidatePath(`/m/${slug}/classes`);
  revalidatePath(`/m/${slug}/classes/${programId}`);
  revalidatePath(`/m/${slug}/programs`);
  revalidatePath(`/m/${slug}/programs/${programId}`);

  redirect(nextPath);
}

export async function withdrawFromProgram(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  const fallbackPath = `/m/${slug}/programs/${programId}`;
  const nextPath = returnTo || fallbackPath;

  if (!slug || !programId) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load student profile.");
  }

  const { data: existingEnrollment, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("program_id", programId)
    .eq("student_profile_id", profile.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not check current enrollment: ${existingError.message}`);
  }

  if (!existingEnrollment) {
    revalidatePath(`/m/${slug}/dashboard`);
    revalidatePath(`/m/${slug}/classes`);
    revalidatePath(`/m/${slug}/classes/${programId}`);
    revalidatePath(`/m/${slug}/programs`);
    revalidatePath(`/m/${slug}/programs/${programId}`);
    redirect(nextPath);
  }

  // Cancel any active Stripe subscription for this student/program
  const { data: activeSub } = await supabase
    .from("program_subscriptions")
    .select("id, stripe_subscription_id, status")
    .eq("profile_id", profile.id)
    .eq("program_id", programId)
    .eq("status", "active")
    .maybeSingle();

  if (activeSub?.stripe_subscription_id) {
    await stripe.subscriptions.cancel(activeSub.stripe_subscription_id);

    await supabase
      .from("program_subscriptions")
      .update({
        status: "canceled",
        ended_at: new Date().toISOString(),
      })
      .eq("id", activeSub.id);
  }

  const { error: deleteError } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", existingEnrollment.id);

  if (deleteError) {
    throw new Error(`Failed to withdraw: ${deleteError.message}`);
  }

  revalidatePath(`/m/${slug}/dashboard`);
  revalidatePath(`/m/${slug}/classes`);
  revalidatePath(`/m/${slug}/classes/${programId}`);
  revalidatePath(`/m/${slug}/programs`);
  revalidatePath(`/m/${slug}/programs/${programId}`);

  redirect(nextPath);
}

export async function removeStudentFromProgram(
  programId: string,
  studentProfileId: string
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

  // Look up the program to get the mosque_id and teacher
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, mosque_id, teacher_profile_id")
    .eq("id", programId)
    .maybeSingle();

  if (programError || !program) {
    return { error: "Program not found." };
  }

  // Verify caller is teacher of this program or mosque admin
  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("mosque_id", program.mosque_id)
    .maybeSingle();

  if (membershipError) {
    return { error: `Could not verify membership: ${membershipError.message}` };
  }

  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacherOfProgram =
    (membership?.role === "teacher" || membership?.role === "lead_teacher") &&
    program.teacher_profile_id === profile.id;

  if (!isMosqueAdmin && !isTeacherOfProgram) {
    return { error: "You do not have permission to remove students from this program." };
  }

  // Cancel any active Stripe subscription for this student/program
  const { data: activeSub } = await supabase
    .from("program_subscriptions")
    .select("id, stripe_subscription_id, status")
    .eq("profile_id", studentProfileId)
    .eq("program_id", programId)
    .eq("status", "active")
    .maybeSingle();

  if (activeSub?.stripe_subscription_id) {
    await stripe.subscriptions.cancel(activeSub.stripe_subscription_id);

    await supabase
      .from("program_subscriptions")
      .update({
        status: "canceled",
        ended_at: new Date().toISOString(),
      })
      .eq("id", activeSub.id);
  }

  // Delete the enrollment
  const { error: deleteError } = await supabase
    .from("enrollments")
    .delete()
    .eq("program_id", programId)
    .eq("student_profile_id", studentProfileId);

  if (deleteError) {
    return { error: `Failed to remove student: ${deleteError.message}` };
  }

  // Update program_application status to 'rejected' to allow re-application
  await supabase
    .from("program_applications")
    .update({ status: "rejected" })
    .eq("program_id", programId)
    .eq("student_profile_id", studentProfileId);

  // Get the mosque slug for revalidation
  const { data: mosque } = await supabase
    .from("mosques")
    .select("slug")
    .eq("id", program.mosque_id)
    .maybeSingle();

  if (mosque?.slug) {
    revalidatePath(`/m/${mosque.slug}/programs/${programId}`);
    revalidatePath(`/m/${mosque.slug}/admin/programs/${programId}`);
    revalidatePath(`/m/${mosque.slug}/teacher/programs/${programId}`);
  }

  return { success: true };
}