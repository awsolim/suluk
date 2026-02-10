import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Role = "admin" | "teacher" | "student";

function groupByRole<T extends { role: Role }>(items: T[]) {
  const students = items.filter((i) => i.role === "student");
  const teachers = items.filter((i) => i.role === "teacher");
  const admins = items.filter((i) => i.role === "admin");
  return { students, teachers, admins };
}

export default async function AdminUsersPage() {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const currentAdminId = authData.user?.id ?? null;

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,created_at,is_removed")
    .eq("is_removed", false)
    .order("created_at", { ascending: false });

  const { students, teachers, admins } = groupByRole((users ?? []) as Array<any>);

  async function updateRole(formData: FormData) {
    "use server";

    const userId = String(formData.get("userId") ?? "");
    const nextRole = String(formData.get("role") ?? "") as Role;

    const currentRole = await getCurrentRole(); // NEW: enforce admin in action
    if (currentRole !== "admin") redirect("/dashboard");

    const supabase = await createServerSupabaseClient();
    await supabase.from("profiles").update({ role: nextRole }).eq("id", userId); // NEW: role update
    redirect("/admin/users");
  }

  async function removeUser(formData: FormData) {
    "use server";

    const targetId = String(formData.get("userId") ?? "");
    const reason = String(formData.get("reason") ?? "").trim() || null;

    const currentRole = await getCurrentRole(); // NEW: enforce admin
    if (currentRole !== "admin") redirect("/dashboard");

    const supabase = await createServerSupabaseClient();
    const { data: me } = await supabase.auth.getUser();

    // NEW: safety — prevent removing yourself
    if (me.user?.id && me.user.id === targetId) redirect("/admin/users");

    // NEW: get profile to know role/email/name
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,is_removed")
      .eq("id", targetId)
      .maybeSingle();

    if (!profile || profile.is_removed) redirect("/admin/users");

    // NEW: only allow removing students + teachers (not admins)
    if (profile.role === "admin") redirect("/admin/users");

    // NEW: snapshot into removed_users
    await supabase.from("removed_users").insert({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      removed_by: me.user?.id ?? null,
      reason,
    });

    // NEW: mark profile removed + clear email in profiles
    await supabase
      .from("profiles")
      .update({
        is_removed: true,
        removed_at: new Date().toISOString(),
        removed_by: me.user?.id ?? null,
        email: null,
      })
      .eq("id", targetId);

    // NEW: delete auth user to free email for re-registration
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.deleteUser(targetId);

    redirect("/admin/users");
  }

  function Section({
    title,
    items,
  }: {
    title: string;
    items: Array<any>;
  }) {
    return (
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-black">{title}</h2>
        <div className="mt-3 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60">
              No users in this section.
            </div>
          ) : (
            items.map((u) => (
              <div key={u.id} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-black">{u.full_name ?? "Unnamed"}</div>
                    <div className="text-sm text-black/70">{u.email ?? "No email"}</div>
                    {currentAdminId && u.id === currentAdminId ? (
                      <div className="mt-1 text-xs text-black/50">(you)</div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <form action={updateRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-black"
                      >
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
                      >
                        Save
                      </button>
                    </form>

                    {/* NEW: Remove only students + teachers */}
                    {(u.role === "student" || u.role === "teacher") && (
                      <form action={removeUser}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="reason" value="" />
                        <button
                          type="submit"
                          className="rounded-xl border border-red-700/30 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-black">Users</h1>
      <p className="mt-1 text-sm text-black/70">Manage roles and remove accounts.</p>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Failed to load users: {error.message}
        </div>
      ) : null}

      <Section title="Students" items={students} />
      <Section title="Teachers" items={teachers} />
      <Section title="Admins" items={admins} />
    </div>
  );
}
