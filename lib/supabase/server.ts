import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Creates a Supabase client for Server Components / Route Handlers
 * using the Next.js App Router cookie store.
 *
 * This is CRITICAL for RLS + auth.uid() to work on the server,
 * because Supabase needs access to the user's session cookies.
 */
export async function createServerSupabaseClient() {
  // In newer Next.js versions, cookies() may be async; awaiting is safe either way.
  const cookieStore = await cookies(); // ✅ reads request cookies on the server

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      // ✅ Supabase reads auth cookies from the request via getAll()
      getAll() {
        return cookieStore.getAll();
      },

      // ✅ Supabase may need to set refreshed/rotated cookies on the response via setAll()
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options); // updates cookies when Next.js allows it
          });
        } catch {
          // In Server Components, Next.js can block setting cookies.
          // That's okay — middleware/route handlers can still handle cookie updates.
        }
      },
    },
  });
}
