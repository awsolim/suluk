// components/auth/AuthForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();

  const [fullName, setFullName] = useState(""); // NEW: store full name for register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRegister = mode === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient(); // NEW: client supabase instance

      if (isRegister) {
        // NEW: basic validation so we don't create users without names
        if (!fullName.trim()) {
          setErrorMsg("Please enter your full name.");
          setLoading(false);
          return;
        }

        // NEW: create auth user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // NEW: store name in auth user metadata too (helpful for future)
            data: { full_name: fullName.trim() },
          },
        });

        if (error) throw error;

        const userId = data.user?.id;
        if (!userId) {
          // NEW: very defensive fallback
          throw new Error("Signup succeeded but no user id was returned.");
        }

        // NEW: ensure a profile row exists and contains the full name
        // This fixes “Unnamed” in admin users list and missing teacher names.
        const { error: profileErr } = await supabase.from("profiles").upsert(
          {
            id: userId,
            full_name: fullName.trim(),
            // NEW: do NOT force role here; keep whatever your DB defaults / admin sets later.
            // role: "student",
          },
          { onConflict: "id" } // NEW: ensures we update existing row if it already exists
        );

        if (profileErr) throw profileErr;

        router.push("/"); // NEW: go to smart dashboard/landing
        router.refresh(); // NEW: refresh server components
        return;
      }

      // Login flow
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/"); // NEW: go to smart dashboard
      router.refresh(); // NEW: refresh server components
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold">
        <span className="bg-gradient-to-r from-[#c5162f] via-[#e11d48] to-[#c5162f] bg-clip-text text-transparent">
          {isRegister ? "Create account" : "Log in"}
        </span>
      </h1>

      <p className="mt-2 text-sm text-zinc-600">
        {isRegister
          ? "Create your Suluk account."
          : "Sign in to your Suluk account."}
      </p>

      <div className="mt-6 space-y-4">
        {isRegister && (
          <div>
            <label className="block text-sm font-semibold text-zinc-800">
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)} // NEW: track full name
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-300"
              placeholder="e.g. Amr Soliman"
              autoComplete="name"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-zinc-800">
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-300"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-800">
            Password
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-300"
            placeholder="••••••••"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[#c5162f] via-[#e11d48] to-[#c5162f] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
        >
          {loading ? "Please wait..." : isRegister ? "Sign up" : "Log in"}
        </button>
      </div>
    </form>
  );
}
