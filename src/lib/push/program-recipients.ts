import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Everyone whose teacher inbox covers a program: the primary director/teacher
 * plus all active director and instructor assignments. Email delivery applies a
 * separate account-type filter so mosque admins are never emailed.
 */
export async function getProgramManagerProfileIds(
  supabase: SupabaseClient<Database>,
  program: { id: string; director_profile_id: string | null; teacher_profile_id: string | null },
): Promise<string[]> {
  const { data: teacherAssignments } = await supabase
    .from("program_teachers")
    .select("teacher_profile_id")
    .eq("program_id", program.id)
    .in("role", ["director", "instructor"])
    .not("teacher_profile_id", "is", null);

  return Array.from(
    new Set(
      [program.director_profile_id ?? program.teacher_profile_id, ...(teacherAssignments ?? []).map((row) => row.teacher_profile_id)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
}
