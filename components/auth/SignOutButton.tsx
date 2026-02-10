// components/auth/SignOutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  /**
   * NEW: where to route after signing out
   * ("/" will show landing once logged out)
   */
  redirectTo?: string;
};

export default function SignOutButton({ redirectTo = "/" }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient(); // NEW: create client Supabase instance
    await supabase.auth.signOut(); // NEW: clears session in Supabase
    router.push(redirectTo); // NEW: go back to home
    router.refresh(); // NEW: ensure server components re-render with logged-out state
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#c5162f] via-[#e11d48] to-[#c5162f] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
    >
      Sign out
    </button>
  );
}
