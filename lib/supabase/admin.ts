import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * IMPORTANT: this bypasses RLS and can manage auth users.
 * Never import this into client components.
 */
export function createSupabaseAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // NEW: read from env at runtime (server-only)
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables."); // NEW: clear error if env not set
  }

  return createClient(env.supabaseUrl, serviceKey, {
    auth: {
      persistSession: false, // NEW: no session storage needed for server admin client
      autoRefreshToken: false, // NEW: admin client does not need refresh logic
    },
  });
}
