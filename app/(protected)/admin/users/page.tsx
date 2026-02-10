import PageTopActions from "@/components/layout/PageTopActions";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Role = "student" | "teacher" | "admin";
const ROLES: Role[] = ["student", "teacher", "admin"]; // NEW: inline roles (no ghost import)

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: Role | null;
  email?: string | null;
};

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient(); // NEW: must await
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // NEW: load profiles (optionally email if you store it elsewhere; otherwise just show name/id/role)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("created_at", { ascending: false });

  if (error) throw error;

  async function updateRoleAction(formData: FormData) {
    "use server";

    const supabaseServer = await createServerSupabaseClient(); // NEW: server action needs its own client
    const userId = String(formData.get("user_id") ?? "").trim(); // NEW: read user id
    const newRole = String(formData.get("role") ?? "").trim() as Role; // NEW: read role

    if (!userId || !ROLES.includes(newRole)) return; // NEW: safety check

    const { error: updateError } = await supabaseServer
      .from("profiles")
      .update({ role: newRole }) // NEW: update role
      .eq("id", userId);

    if (updateError) throw updateError;

    redirect("/admin/users"); // NEW: refresh page data
  }

  async function removeUserAction(formData: FormData) {
    "use server";

    const supabaseServer = await createServerSupabaseClient(); // NEW: server action client
    const userId = String(formData.get("user_id") ?? "").trim(); // NEW: read user id
    if (!userId) return;

    // NEW: soft-remove pattern (keeps auth user intact, but removes from app views).
    // If you already have a stronger delete flow, swap this out later.
    const { error: removeProfileErr } = await supabaseServer.from("profiles").delete().eq("id", userId);
    if (removeProfileErr) throw removeProfileErr;

    redirect("/admin/users"); // NEW: refresh
  }

  const grouped: Record<Role, ProfileRow[]> = { student: [], teacher: [], admin: [] };
  for (const p of (profiles ?? []) as any[]) {
    const role = (p.role ?? "student") as Role; // NEW: default to student if null
    if (ROLES.includes(role)) grouped[role].push(p);
  }

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <PageTopActions showSignOut={true} backHref="/admin" />

        <h1 className="text-3xl font-semibold text-zinc-900">
          <span className="bg-gradient-to-r from-[#ff2d55] via-[#ff3b30] to-[#ff2d55] bg-clip-text text-transparent">
            Users
          </span>
        </h1>
        <p className="mt-2 text-sm text-zinc-600">Change roles or remove users.</p>

        <div className="mt-8 grid gap-6">
          {ROLES.map((role) => (
            <section key={role} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold capitalize text-zinc-900">{role}s</h2>

              <div className="mt-4 space-y-3">
                {grouped[role].length === 0 ? (
                  <div className="text-sm text-zinc-600">No users.</div>
                ) : (
                  grouped[role].map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-semibold text-zinc-900">{u.full_name?.trim() || "Unnamed"}</div>
                        <div className="text-xs text-zinc-500">{u.id}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="user_id" value={u.id} />
                          <select
                            name="role"
                            defaultValue={(u.role ?? "student") as Role}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-xl bg-gradient-to-r from-[#ff2d55] via-[#ff3b30] to-[#ff2d55] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                          >
                            Save
                          </button>
                        </form>

                        {(u.role ?? "student") !== "admin" ? (
                          <form action={removeUserAction}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <button
                              type="submit"
                              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
                            >
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
