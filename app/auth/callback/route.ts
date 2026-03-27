import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const slug = searchParams.get("slug");
  const role = searchParams.get("role");

  if (!code) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = slug
      ? `/m/${slug}/login?error=${encodeURIComponent(error.message)}`
      : `/login?error=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(new URL(errorUrl, origin));
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Upsert profile from OAuth metadata
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

    // If mosque-scoped login, auto-assign membership
    if (slug) {
      const { data: mosque } = await supabase
        .from("mosques")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (mosque) {
        // Only create membership if user doesn't already have one
        const { data: existingMembership } = await supabase
          .from("mosque_memberships")
          .select("id")
          .eq("profile_id", user.id)
          .eq("mosque_id", mosque.id)
          .maybeSingle();

        if (!existingMembership) {
          const memberRole = role === "parent" ? "parent" : "student";
          await supabase.from("mosque_memberships").insert({
            mosque_id: mosque.id,
            profile_id: user.id,
            role: memberRole,
          });
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
