import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";

export default async function AdminProgramsPage() {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createServerSupabaseClient();

  const { data: programs, error } = await supabase
    .from("programs")
    .select("id,title,is_active,thumbnail_path,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black">Programs</h1>
          <p className="mt-1 text-sm text-black/70">
            Add and manage programs.
          </p>
        </div>

        <Link
          href="/admin/programs/new"
          className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Add program
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Failed to load programs: {error.message}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {(programs ?? []).map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-black">{p.title}</div>
                <div className="mt-1 text-sm text-black/70">
                  {p.is_active ? "Active" : "Inactive"}
                </div>
              </div>

              <Link
                href={`/programs/${p.id}`}
                className="rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
