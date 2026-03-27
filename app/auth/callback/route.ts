import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const slug = searchParams.get("slug");
  const role = searchParams.get("role");

  if (!code) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Collect cookies set during the exchange so they land on the final redirect
  const responseCookies: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];

  // Mutable store: starts with request cookies, accumulates any cookies set by
  // the Supabase client (session tokens) so subsequent queries see them too.
  const cookieMap = new Map<string, { name: string; value: string }>();
  request.cookies.getAll().forEach((c) => cookieMap.set(c.name, c));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Array.from(cookieMap.values());
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieMap.set(name, { name, value });
            responseCookies.push({ name, value, options });
          });
        },
      },
    },
  );

  // --- Exchange the OAuth code for a session (uses PKCE verifier from cookie) ---
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorPath = slug
      ? `/m/${slug}/login?error=${encodeURIComponent(error.message)}`
      : `/login?error=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(new URL(errorPath, origin));
  }

  // --- Post-auth: profile upsert + membership logic ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const fullName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split("@")[0] ??
      "";

    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      email: user.email ?? null,
    });

    // Mosque-scoped login: auto-assign membership
    if (slug) {
      const { data: mosque } = await supabase
        .from("mosques")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (mosque) {
        const { data: existing } = await supabase
          .from("mosque_memberships")
          .select("id")
          .eq("profile_id", user.id)
          .eq("mosque_id", mosque.id)
          .maybeSingle();

        if (!existing) {
          const memberRole = role === "parent" ? "parent" : "student";
          await supabase.from("mosque_memberships").insert({
            mosque_id: mosque.id,
            profile_id: user.id,
            role: memberRole,
          });

          // Teacher signup via OAuth: create join request pending admin approval
          if (role === "teacher") {
            await supabase.from("teacher_join_requests").insert({
              mosque_id: mosque.id,
              profile_id: user.id,
              status: "pending",
            });
          }
        }
      }
    }

    // Global signup: redirect new users to create a masjid
    if (!slug) {
      const { data: memberships } = await supabase
        .from("mosque_memberships")
        .select("id")
        .eq("profile_id", user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        const res = NextResponse.redirect(
          new URL("/create-masjid", origin),
        );
        responseCookies.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
        return res;
      }
    }
  }

  // --- Redirect to the final destination with session cookies ---
  const response = NextResponse.redirect(new URL(next, origin));
  responseCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}
