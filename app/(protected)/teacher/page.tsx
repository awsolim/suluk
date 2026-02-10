// app/(protected)/teacher/page.tsx
import Link from "next/link";
import PageTopActions from "@/components/layout/PageTopActions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Program = {
  id: string;
  title: string;
};

export default async function TeacherDashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // NEW: fetch programs this teacher leads
  const { data: programs, error: progErr } = await supabase
    .from("programs")
    .select("id,title")
    .eq("lead_teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (progErr) throw new Error(progErr.message);

  const safePrograms: Program[] = (programs ?? []) as any;
  const programIds = safePrograms.map((p) => p.id);

  // NEW: fetch all enrollments for these programs, then count in JS (reliable + simple)
  const { data: enrollRows, error: enrollErr } = await supabase
    .from("enrollments")
    .select("program_id")
    .in("program_id", programIds.length ? programIds : ["00000000-0000-0000-0000-000000000000"]); // NEW: prevents "in([])" edge case

  if (enrollErr) throw new Error(enrollErr.message);

  const counts = new Map<string, number>(); // NEW: program_id -> count
  for (const row of enrollRows ?? []) {
    const pid = (row as any).program_id as string;
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  }

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <PageTopActions showSignOut={true} />

        <h1 className="mt-6 text-2xl font-semibold text-zinc-900">Teacher Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">Programs you lead and enrolled students.</p>

        <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          {safePrograms.length === 0 ? (
            <p className="text-sm text-zinc-600">You are not assigned as lead teacher to any programs yet.</p>
          ) : (
            <div className="space-y-3">
              {safePrograms.map((p) => {
                const count = counts.get(p.id) ?? 0;
                return (
                  <Link
                    key={p.id}
                    href={`/teacher/programs/${p.id}`}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-900">{p.title}</div>
                      <div className="mt-1 text-xs text-zinc-600">View enrolled students</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-800">
                        {count}
                      </span>
                      <span className="text-sm text-zinc-500">students</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
