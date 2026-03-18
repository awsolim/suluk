"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  if (isTeacher || isMosqueAdmin) {
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