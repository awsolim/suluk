import Link from "next/link";
import PageTopActions from "@/components/layout/PageTopActions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ProgramRow = {
  id: string;
  title: string;
};

export default async function AdminProgramsPage() {
  const supabase = await createServerSupabaseClient(); // NEW: must await

  const { data, error } = await supabase.from("programs").select("id,title").order("created_at", { ascending: false });
  if (error) throw error;

  const programs = (data ?? []) as ProgramRow[];

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <PageTopActions showSignOut={true} backHref="/admin" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">
              <span className="bg-gradient-to-r from-[#ff2d55] via-[#ff3b30] to-[#ff2d55] bg-clip-text text-transparent">
                Programs
              </span>
            </h1>
            <p className="mt-2 text-sm text-zinc-600">Add and manage programs.</p>
          </div>

          <Link
            href="/admin/programs/new"
            className="rounded-xl bg-gradient-to-r from-[#ff2d55] via-[#ff3b30] to-[#ff2d55] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Add program
          </Link>
        </div>

        <div className="mt-8 space-y-3">
          {programs.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
              No programs yet.
            </div>
          ) : (
            programs.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="font-semibold text-zinc-900">{p.title}</div>
                <Link href={`/programs/${p.id}`} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50">
                  View
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
