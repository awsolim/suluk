import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";
import BackLink from "@/components/layout/BackLink";

export default async function AdminNewProgramPage() {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/dashboard");

  const supabase = await createServerSupabaseClient();

  const { data: teachers } = await supabase
    .from("profiles")
    .select("id,full_name,email")
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  async function createProgram(formData: FormData) {
    "use server";

    const currentRole = await getCurrentRole(); // NEW: re-check inside action
    if (currentRole !== "admin") redirect("/dashboard");

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const leadTeacherId = String(formData.get("leadTeacherId") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim(); // NEW: location input

    if (!title || !leadTeacherId) redirect("/admin/programs/new");

    const supabase = await createServerSupabaseClient();

    await supabase.from("programs").insert({
      title,
      description: description || null,
      is_active: true,
      lead_teacher_id: leadTeacherId,
      created_by: leadTeacherId,
      thumbnail_path: "program-thumbnails/quran.jpg",
      location: location || null, // NEW: store location
    });

    redirect("/admin/programs");
  }

  return (
    <div>
      <BackLink href="/admin/programs" label="Back to programs" />

      <div className="px-6 pb-8 pt-6">
        <h1 className="text-2xl font-semibold text-black">Add program</h1>
        <p className="mt-1 text-sm text-black/70">Create a new program and assign a teacher.</p>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <form action={createProgram} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black">Title</label>
              <input
                name="title"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
                placeholder="e.g. Intermediate Hifz (Al-Mulk to An-Nas)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black">Location</label>
              <input
                name="location"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
                placeholder="e.g. Main Prayer Hall (North Entrance)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black">Description</label>
              <textarea
                name="description"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
                rows={4}
                placeholder="Short description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black">Teacher</label>
              <select
                name="leadTeacherId"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a teacher…
                </option>
                {(teachers ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {(t.full_name ?? "Unnamed")} ({t.email ?? "no email"})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Create program
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
