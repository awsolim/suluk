"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const supabase = createClient();

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") ?? "/";
      const slug = params.get("slug");
      const role = params.get("role");

      if (!code) {
        router.replace(next);
        return;
      }

      // Exchange code for session — client-side, so PKCE verifier is available
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        const errorUrl = slug
          ? `/m/${slug}/login?error=${encodeURIComponent(error.message)}`
          : `/login?error=${encodeURIComponent(error.message)}`;
        router.replace(errorUrl);
        return;
      }

      // Get the authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(next);
        return;
      }

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

      // For global signup, redirect new users to create a masjid
      if (!slug) {
        const { data: memberships } = await supabase
          .from("mosque_memberships")
          .select("id")
          .eq("profile_id", user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          router.replace("/create-masjid");
          return;
        }
      }

      router.replace(next);
    }

    handleCallback();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Signing you in...</p>
    </main>
  );
}
