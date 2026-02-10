import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  // NEW: sign-out server action (runs on server, clears auth cookies)
  async function signOut() {
    "use server";

    const supabase = await createServerSupabaseClient(); // NEW: create server client in action scope
    await supabase.auth.signOut(); // NEW: clears session cookies
    redirect("/login"); // NEW: return to login after signing out
  }

  // NEW: basic auth guard (extra safety even if middleware exists)
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login"); // NEW: unauthenticated users go to login

  return (
    <AppShell>
      {/* NEW: global top-right sign out for all protected pages */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/70">
        <div className="mx-auto flex max-w-5xl items-center justify-end px-6 py-3">
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-5xl">{children}</div>
    </AppShell>
  );
}
