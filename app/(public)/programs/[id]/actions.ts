// app/(public)/programs/[id]/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

// NEW: enroll the current user into a program (no payments yet)
export async function enrollInProgram(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "").trim(); // NEW: read program id from the form
  if (!programId) return; // NEW: safety guard

  const supabase = await createServerSupabaseClient(); // NEW: server supabase client
  const user = await getCurrentUser(); // NEW: current logged-in user
  if (!user) return; // NEW: must be logged in

  // NEW: insert enrollment (assumes enrollments table: student_id, program_id)
  const { error } = await supabase.from("enrollments").insert({
    student_id: user.id,
    program_id: programId,
  });

  // NEW: ignore duplicate enrollment gracefully if you have a unique constraint (recommended)
  // If you don't, this will still work, but you might get duplicates.
  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }

  // NEW: refresh the program details + programs list so ENROLLED overlays update
  revalidatePath(`/programs/${programId}`);
  revalidatePath(`/programs`);
  revalidatePath(`/student`);
}

// NEW: withdraw the current user from a program
export async function withdrawFromProgram(formData: FormData) {
  const programId = String(formData.get("program_id") ?? "").trim(); // NEW: read program id from the form
  if (!programId) return; // NEW: safety guard

  const supabase = await createServerSupabaseClient(); // NEW: server supabase client
  const user = await getCurrentUser(); // NEW: current logged-in user
  if (!user) return; // NEW: must be logged in

  // NEW: delete enrollment row
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", user.id)
    .eq("program_id", programId);

  if (error) throw new Error(error.message);

  // NEW: refresh affected pages
  revalidatePath(`/programs/${programId}`);
  revalidatePath(`/programs`);
  revalidatePath(`/student`);
}
