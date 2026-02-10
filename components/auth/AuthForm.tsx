"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";


type AuthMode = "login" | "register";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient(); // Uses anon key in the browser (safe)

  const [fullName, setFullName] = useState(""); // NEW: full name captured on registration
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (!fullName.trim()) {
          // NEW: enforce full name for registration
          setErrorMsg("Please enter your full name.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        const userId = data.user?.id; // NEW: used to update profiles.full_name
        if (userId) {
          // NEW: store full name in profiles after signup
          const { error: profileErr } = await supabase
            .from("profiles")
            .update({ full_name: fullName.trim() })
            .eq("id", userId);

          if (profileErr) throw profileErr;
        }

        router.push("/dashboard"); // Existing flow: let middleware/role router send them correctly
        router.refresh();
        return;
      }

      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className="block text-sm font-medium text-black">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
            placeholder="e.g. Amr Saleh"
            autoComplete="name"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-black">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-black">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
          placeholder="••••••••"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
      >
        {loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
