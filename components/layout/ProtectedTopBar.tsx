// components/layout/ProtectedTopBar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  /**
   * NEW: if true, we show "Back to dashboard" when the user is on a subpage.
   * On the dashboard itself ("/"), we keep it false so only "Sign out" shows.
   */
  showBackToDashboard?: boolean;
  /**
   * NEW: where the "Back to dashboard" button should go (your dashboard is "/").
   */
  dashboardHref?: string;
};

export default function ProtectedTopBar({
  showBackToDashboard = true, // NEW: default to true for protected subpages
  dashboardHref = "/", // NEW: default dashboard URL
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  // NEW: only show "Back to dashboard" when:
  // - caller wants it (subpages), AND
  // - user is not already on the dashboard
  const shouldShowBack =
    showBackToDashboard && pathname !== dashboardHref;

  const handleBack = () => {
    router.push(dashboardHref); // NEW: always return to dashboard ("/")
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient(); // NEW: client Supabase for sign-out
    await supabase.auth.signOut(); // NEW: clears session
    router.push("/"); // NEW: return to landing/dashboard smart page
    router.refresh(); // NEW: re-render server components with logged-out state
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          {shouldShowBack && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              Back to dashboard
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7a0c16] via-[#a10f23] to-[#7a0c16] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
