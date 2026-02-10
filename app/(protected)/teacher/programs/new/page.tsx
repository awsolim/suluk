import PageTopActions from "@/components/layout/PageTopActions";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MosqueRow = { id: string; name: string | null };

export default async function TeacherNewProgramPage() {
  const supabase = await createServerSupabaseClient(); // NEW: must await
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: mosquesData, error: mosquesErr } = await supabase
    .from("mosques")
    .select("id, name")
    .order("created_at", { ascending: false });

  if (mosquesErr) throw mosquesErr;
  const mosques = (mosquesData ?? []) as MosqueRow[];

  async function createProgramAction(formData: FormData) {
    "use server";

    const supabaseServer = await createServerSupabaseClient(); // NEW: server action client
    const {
      data: { user: actionUser },
    } = await supabaseServer.auth.getUser();

    if (!actionUser) redirect("/login");

    const title = String(formData.get("title") ?? "").trim(); // NEW
    const description = String(formData.get("description") ?? "").trim(); // NEW
    const priceMonthly = Number(formData.get("price_monthly") ?? 0); // NEW
    const thumbnailPath = String(formData.get("thumbnail_path") ?? "").trim() || null; // NEW
    const mosqueMode = String(formData.get("mosque_mode") ?? "existing").trim(); // NEW

    if (!title) return;

    let mosqueId: string | null = null;

    if (mosqueMode === "new") {
      const mosqueName = String(formData.get("mosque_name") ?? "").trim(); // NEW
      const mosqueAddress = String(formData.get("mosque_address") ?? "").trim() || null; // NEW
      const mosquePicturePath = String(formData.get("mosque_picture_path") ?? "").trim() || null; // NEW

      if (!mosqueName) return;

      const { data: createdMosque, error: createMosqueErr } = await supabaseServer
        .from("mosques")
        .insert({
          name: mosqueName,
          address: mosqueAddress,
          picture_path: mosquePicturePath,
        })
        .select("id")
        .single();

      if (createMosqueErr) throw createMosqueErr;
      mosqueId = createdMosque.id;
    } else {
      mosqueId = String(formData.get("mosque_id") ?? "").trim() || null; // NEW
    }

    const { error: insertErr } = await supabaseServer.from("programs").insert({
      title,
      description: description || null,
      lead_teacher_id: actionUser.id, // NEW: teacher is lead teacher
      mosque_id: mosqueId,
      price_monthly: Number.isFinite(priceMonthly) ? priceMonthly : 0,
      thumbnail_path: thumbnailPath,
    });

    if (insertErr) throw insertErr;

    redirect("/teacher"); // NEW: back to teacher dashboard
  }

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <PageTopActions showSignOut={true} backHref="/teacher" />

        <h1 className="text-3xl font-semibold text-zinc-900">
          <span className="bg-gradient-to-r from-[#ff2d55] via-[#ff3b30] to-[#ff2d55] bg-clip-text text-transparent">
            Launch program
          </span>
        </h1>

        <form action={createProgramAction} className="mt-8 space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label className="text-sm font-semibold text-zinc-900">Title</label>
            <input name="title" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm" placeholder="Program title" />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">Description</label>
            <textarea
              name="description"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm"
              placeholder="Short description"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-zinc-900">Price per month</label>
              <input name="price_monthly" type="number" step="0.01" defaultValue="100.00" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-900">Thumbnail path</label>
              <input name="thumbnail_path" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm" placeholder="program-thumbnails/quran.jpg" />
              <div className="mt-1 text-xs text-zinc-500">Bucket: public-media</div>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">Mosque</label>
            <select name="mosque_mode" defaultValue="existing" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
              <option value="existing">Choose existing mosque</option>
              <option value="new">Add new mosque</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900">Existing mosque</label>
            <select name="mosque_id" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
              <option value="">None</option>
              {mosques.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name?.trim() || m.id}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-semibold text-zinc-900">New mosque (only if “Add new mosque” selected)</div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-900">Name *</label>
                <input name="mosque_name" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm" placeholder="Masjid name" />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-900">Picture path</label>
                <input name="mosque_picture_path" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm" placeholder="mosque-pictures/rahma.jpeg" />
                <div className="mt-1 text-xs text-zinc-500">Bucket: public-media</div>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-zinc-900">Address</label>
              <input name="mosque_address" defaultValue="6104 172 St NW, Edmonton, AB T6M 1E3" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm" />
            </div>
          </div>

          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-[#ff2d55] via-[#ff3b30] to-[#ff2d55] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95">
            Create program
          </button>
        </form>
      </div>
    </main>
  );
}
