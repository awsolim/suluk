import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the signed-in Supabase user on the server.
 * Returns null if no session/user exists server-side.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient(); // ✅ cookie-aware server client

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(); // ✅ reads user from session cookies

  if (error || !user) return null;
  return user;
}
