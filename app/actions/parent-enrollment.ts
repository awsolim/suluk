"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getMosqueBySlug,
  getMosqueMembershipForUser,
  verifyParentChildLink,
  getEnrollmentForStudent,
  getProgramApplicationForStudent,
  getProgramByIdForMosque,
} from "@/lib/supabase/queries";
import { redirect } from "next/navigation";

export async function enrollChildInProgram(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const slug = String(formData.get("slug") || "").trim();
  const childProfileId = String(formData.get("child_profile_id") || "").trim();
  const programId = String(formData.get("program_id") || "").trim();

  if (!slug || !childProfileId || !programId) {
    return { error: "Missing required fields." };
  }

  const mosque = await getMosqueBySlug(slug);
  if (!mosque) return { error: "Mosque not found." };

  const membership = await getMosqueMembershipForUser(user.id, mosque.id);
  if (membership?.role !== "parent") {
    return { error: "Only parent accounts can enroll children." };
  }

  const isLinked = await verifyParentChildLink(user.id, childProfileId, mosque.id);
  if (!isLinked) {
    return { error: "This child is not linked to your account." };
  }

  const program = await getProgramByIdForMosque(programId, mosque.id);
  if (!program) return { error: "Program not found." };

  const existing = await getEnrollmentForStudent(programId, childProfileId);
  if (existing) return { error: "Child is already enrolled in this program." };

  if (program.is_paid) {
    return { error: "Paid enrollment requires checkout. Use the checkout flow." };
  }

  const { error } = await supabase
    .from("enrollments")
    .insert({
      program_id: programId,
      student_profile_id: childProfileId,
    });

  if (error) return { error: "Failed to enroll child." };
  return { success: true };
}

export async function applyForChild(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const slug = String(formData.get("slug") || "").trim();
  const childProfileId = String(formData.get("child_profile_id") || "").trim();
  const programId = String(formData.get("program_id") || "").trim();

  if (!slug || !childProfileId || !programId) {
    return { error: "Missing required fields." };
  }

  const mosque = await getMosqueBySlug(slug);
  if (!mosque) return { error: "Mosque not found." };

  const membership = await getMosqueMembershipForUser(user.id, mosque.id);
  if (membership?.role !== "parent") {
    return { error: "Only parent accounts can apply on behalf of children." };
  }

  const isLinked = await verifyParentChildLink(user.id, childProfileId, mosque.id);
  if (!isLinked) {
    return { error: "This child is not linked to your account." };
  }

  const existing = await getProgramApplicationForStudent(childProfileId, programId);
  if (existing) return { error: "An application already exists for this child." };

  const { error } = await supabase
    .from("program_applications")
    .insert({
      program_id: programId,
      student_profile_id: childProfileId,
      status: "pending",
    });

  if (error) return { error: "Failed to submit application." };
  return { success: true };
}
