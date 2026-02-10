// components/home/TeacherHome.tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import SignOutButton from "@/components/auth/SignOutButton";

type TeacherProgram = {
  id: string;
  title: string;
  // Supabase "count" aggregate can return as array objects depending on select shape;
  // we normalize below.
  enrollments?: { count: number }[] | null;
};

export default async function TeacherHome() {
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-sm text-zinc-600">You’re not signed in.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{
              background:
                "linear-gradient(90deg, #e11d48 0%, #fb7185 55%, #e11d48 100%)",
            }}
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  // NEW: Fetch programs led by this teacher, plus count of enrolled students.
  // This depends on there being an enrollments table with program_id FK.
  const { data: programs, error } = await supabase
    .from("programs")
    .select("id,title,enrollments(count)")
    .eq("lead_teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const safePrograms: TeacherProgram[] = (programs ?? []) as TeacherProgram[];

  return (
    <main className="px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        {/* NEW: top buttons for this page only */}
        <div className="flex items-center justify-between gap-3">
          <div />
          <SignOutButton />
        </div>

        <div className="mt-8">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #e11d48 0%, #fb7185 55%, #e11d48 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Teacher Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600">Programs you lead and enrolled students.</p>
        </div>

        <div className="mt-8 grid gap-6">
          {/* SECTION 1: Programs you lead */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">Programs you lead</h2>

            {safePrograms.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">
                You don’t lead any programs yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {safePrograms.map((p) => {
                  // NEW: Normalize count (Supabase can return [{count: N}] for aggregates).
                  const count =
                    Array.isArray(p.enrollments) && p.enrollments[0]?.count != null
                      ? p.enrollments[0].count
                      : 0;

                  return (
                    <Link
                      key={p.id}
                      href={`/teacher/programs/${p.id}`}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{p.title}</div>
                        <div className="mt-1 text-xs text-zinc-600">
                          View enrolled students
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-semibold text-zinc-900 shadow-sm">
                        {/* NEW: simple icon + count */}
                        <span aria-hidden>👥</span>
                        <span>{count}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: Launch program */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">Launch a new program</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Create a program and assign details.
            </p>

            <div className="mt-4">
              <Link
                href="/teacher/programs/new"
                className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                style={{
                  background:
                    "linear-gradient(90deg, #e11d48 0%, #fb7185 55%, #e11d48 100%)",
                }}
              >
                Launch new program
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
