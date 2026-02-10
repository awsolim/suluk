// components/home/StudentHome.tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import SignOutButton from "@/components/auth/SignOutButton";

type EnrolledProgram = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
};

export default async function StudentHome() {
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser();

  if (!user) {
    // NEW: Student home should never render without a logged-in user.
    // If middleware ever misses, this keeps things safe.
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

  // NEW: Fetch enrolled programs from enrollments -> programs.
  // We do it as 2 queries to avoid depending on FK naming in Supabase select() expansions.
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select("program_id")
    .eq("student_id", user.id);

  if (enrollmentsError) throw new Error(enrollmentsError.message);

  const programIds = Array.from(
    new Set(
      (enrollments ?? [])
        .map((e: any) => e.program_id as string | null)
        .filter((v: string | null): v is string => Boolean(v))
    )
  );

  let enrolledPrograms: EnrolledProgram[] = [];

  if (programIds.length > 0) {
    const { data: programs, error: programsError } = await supabase
      .from("programs")
      .select("id,title,description,location")
      .in("id", programIds)
      .order("created_at", { ascending: false });

    if (programsError) throw new Error(programsError.message);

    enrolledPrograms = (programs ?? []) as EnrolledProgram[];
  }

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
            Student Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your registered programs and quick actions.
          </p>
        </div>

        <div className="mt-8 grid gap-6">
          {/* SECTION 1: Registered programs */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">Registered programs</h2>

            {enrolledPrograms.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">
                You’re not registered in any programs yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {enrolledPrograms.map((p) => (
                  <details
                    key={p.id}
                    className="group rounded-2xl border border-zinc-200 bg-white px-4 py-3"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900">
                      <span className="mr-2 inline-block transition group-open:rotate-90">
                        ▶
                      </span>
                      {p.title}
                      <span className="ml-2 text-xs font-medium text-zinc-500">
                        {p.location ? `• ${p.location}` : ""}
                      </span>
                    </summary>

                    {p.description ? (
                      <p className="mt-3 text-sm text-zinc-600">{p.description}</p>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-600">No description provided.</p>
                    )}

                    <div className="mt-3">
                      <Link
                        href={`/programs/${p.id}`}
                        className="text-sm font-semibold text-rose-600 hover:opacity-90"
                      >
                        View program →
                      </Link>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 2: Browse */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">Browse programs</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Explore available programs and enroll.
            </p>

            <div className="mt-4">
              <Link
                href="/programs"
                className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                style={{
                  background:
                    "linear-gradient(90deg, #e11d48 0%, #fb7185 55%, #e11d48 100%)",
                }}
              >
                Browse programs
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
