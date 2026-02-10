import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Returns the current user's role from the `profiles` table.
 * - Returns "admin" | "teacher" | "student" when available
 * - Returns null if the user is not signed in or profile is inaccessible
 */
export async function getCurrentRole(): Promise<"admin" | "teacher" | "student" | null> {
  const supabase = await createServerSupabaseClient(); // ✅ cookie-aware server client

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(); // ✅ server-side user lookup (needs cookies)

  if (userError || !user) {
    // If server doesn't see a user, auth cookies aren't being read correctly.
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id) // ✅ ensures we fetch exactly THIS user's profile
    .maybeSingle(); // ✅ avoids throwing if row missing; returns null instead

  if (profileError || !profile?.role) {
    return null;
  }

  // ✅ Narrow to expected union values only
  if (profile.role === "admin" || profile.role === "teacher" || profile.role === "student") {
    return profile.role;
  }

  return null;
}
