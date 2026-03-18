"use server";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Create a new program for the current mosque.
 * Allowed for mosque admins and teachers with can_manage_programs enabled.
 */
export async function createProgram(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isActive = formData.get("is_active") === "on";
  const teacherProfileIdRaw = String(formData.get("teacher_profile_id") || "").trim();
  const teacherProfileId = teacherProfileIdRaw || null;
  const scheduleRaw = String(formData.get("schedule") || "").trim();
  const scheduleTimezone =
    String(formData.get("schedule_timezone") || "").trim() || "America/Edmonton";

  if (!slug || !title) {
    redirect("/");
  }

  let schedule: Array<{ day: string; start: string; end: string }> = [];

  try {
    const parsed = JSON.parse(scheduleRaw);

    if (!Array.isArray(parsed)) {
      throw new Error("Schedule must be an array.");
    }

    const allowedDays = new Set([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);

    const usedDays = new Set<string>();

    schedule = parsed.map((item) => {
      const day = String(item?.day || "").trim().toLowerCase();
      const start = String(item?.start || "").trim();
      const end = String(item?.end || "").trim();

      const timePattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

      if (!allowedDays.has(day)) {
        throw new Error("Schedule contains an invalid day.");
      }

      if (usedDays.has(day)) {
        throw new Error("Schedule cannot contain the same day more than once.");
      }

      if (!timePattern.test(start) || !timePattern.test(end)) {
        throw new Error("Schedule times must use HH:MM:SS format.");
      }

      if (start >= end) {
        throw new Error("Each schedule row must end after it starts.");
      }

      usedDays.add(day);

      return { day, start, end };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid schedule payload.";

    throw new Error(message);
  }

  if (schedule.length === 0) {
    throw new Error("Please add at least one weekly schedule row.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/admin/programs/new`)}`
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load current profile.");
  }

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound();
  }

  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role, can_manage_programs")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to verify program management access: ${membershipError.message}`
    );
  }

  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacher = membership?.role === "teacher";
  const isLeadTeacher = membership?.role === "lead_teacher";
  const canManagePrograms =
    isMosqueAdmin || isLeadTeacher || (isTeacher && membership?.can_manage_programs);

  if (!canManagePrograms) {
    notFound();
  }

  if (teacherProfileId) {
    const { data: teacherMembership, error: teacherMembershipError } = await supabase
      .from("mosque_memberships")
      .select("profile_id, role")
      .eq("profile_id", teacherProfileId)
      .eq("mosque_id", mosque.id)
      .in("role", ["teacher", "lead_teacher"])
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

  const { error: insertError } = await supabase.from("programs").insert({
    mosque_id: mosque.id,
    title,
    description: description || null,
    is_active: isActive,
    teacher_profile_id: teacherProfileId,
    schedule,
    schedule_timezone: scheduleTimezone,
  });

  if (insertError) {
    throw new Error(`Failed to create program: ${insertError.message}`);
  }

  redirect(`/m/${slug}/admin/programs`);
}

export async function updateProgram(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  const programId = String(formData.get("programId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isActive = formData.get("is_active") === "on";
  const teacherProfileIdRaw = String(formData.get("teacher_profile_id") || "").trim();
  const teacherProfileId = teacherProfileIdRaw || null;

  if (!slug || !programId || !title) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/admin/programs/${programId}/edit`
      )}`
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load current profile.");
  }

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (mosqueError || !mosque) {
    notFound();
  }

  const { data: membership, error: membershipError } = await supabase
    .from("mosque_memberships")
    .select("role, can_manage_programs")
    .eq("profile_id", profile.id)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to verify program management access: ${membershipError.message}`);
  }

  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacher = membership?.role === "teacher";
  const canManagePrograms =
    isMosqueAdmin || (isTeacher && membership?.can_manage_programs);

  if (!canManagePrograms) {
    notFound();
  }

  const { data: existingProgram, error: existingProgramError } = await supabase
    .from("programs")
    .select("id, mosque_id")
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .maybeSingle();

  if (existingProgramError || !existingProgram) {
    notFound();
  }

  if (teacherProfileId) {
    const { data: teacherMembership, error: teacherMembershipError } = await supabase
      .from("mosque_memberships")
      .select("profile_id, role")
      .eq("profile_id", teacherProfileId)
      .eq("mosque_id", mosque.id)
      .in("role", ["teacher", "lead_teacher"])
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

  const { error: updateError } = await supabase
    .from("programs")
    .update({
      title,
      description: description || null,
      is_active: isActive,
      teacher_profile_id: teacherProfileId,
    })
    .eq("id", programId)
    .eq("mosque_id", mosque.id);

  if (updateError) {
    throw new Error(`Failed to update program: ${updateError.message}`);
  }

  redirect(`/m/${slug}/admin/programs`);
}

export async function updateTeacherProgram(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  const programId = String(formData.get("programId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!slug || !programId || !title) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/teacher/programs/${programId}/edit`
      )}`
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Could not load current profile.");
  }

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, slug")
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
    throw new Error(`Failed to verify teacher access: ${membershipError.message}`);
  }

  if (!membership || membership.role !== "teacher") {
    notFound();
  }

  const { data: existingProgram, error: existingProgramError } = await supabase
    .from("programs")
    .select("id, mosque_id, teacher_profile_id")
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .eq("teacher_profile_id", profile.id)
    .maybeSingle();

  if (existingProgramError || !existingProgram) {
    notFound();
  }

  const { error: updateError } = await supabase
    .from("programs")
    .update({
      title,
      description: description || null,
    })
    .eq("id", programId)
    .eq("mosque_id", mosque.id)
    .eq("teacher_profile_id", profile.id);

  if (updateError) {
    throw new Error(`Failed to update teacher program: ${updateError.message}`);
  }

  redirect(`/m/${slug}/teacher/programs/${programId}`);
}