// app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";

import StudentHome from "@/components/home/StudentHome";
import TeacherHome from "@/components/home/TeacherHome";
import AdminHome from "@/components/home/AdminHome";

export default async function HomePage() {
  const user = await getCurrentUser(); // NEW: decide logged-in vs logged-out at "/"

  // Logged out -> landing page
  if (!user) {
    return (
      <main className="min-h-[calc(100vh-1px)] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
            <h1 className="text-4xl font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-[#ff2a55] via-[#ff3b30] to-[#ff2a55] bg-clip-text text-transparent">
                Suluk
              </span>
            </h1>

            <p className="mt-3 max-w-2xl text-base text-zinc-600">
              Manage Qur’an memorization programs with clarity—applications, enrollments, and dashboards for students,
              teachers, and admins.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff2a55] via-[#ff3b30] to-[#ff2a55] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                Log in
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              >
                Sign up
              </Link>
            </div>

            <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700">
              <div className="font-semibold text-zinc-900">Internal use</div>
              <div className="mt-1">
                Built for mosque ḥifẓ programs: structured enrollments now, payments later.
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Logged in -> render the role dashboard on "/" (no URL change)
  const role = await getCurrentRole(); // NEW: choose which dashboard to show on "/"

  if (role === "student") return <StudentHome />;

  if (role === "teacher") return <TeacherHome />;

  if (role === "admin") {
    return (
      <AdminHome
        userId={user.id} // NEW: AdminHome currently requires userId, so we pass it here
      />
    );
  }

  // If role is missing/unknown, send to account setup
  redirect("/account-setup");
}
