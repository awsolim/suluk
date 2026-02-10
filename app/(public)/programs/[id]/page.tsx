// app/(public)/programs/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import PageTopActions from "@/components/layout/PageTopActions";
import StorageImage from "@/components/media/StorageImage";
import ProgramActionPanel from "@/components/programs/ProgramActionPanel";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

// NEW: unwrap params safely even if Next gives it as a Promise
async function unwrapParamsId(
  params: unknown
): Promise<string> {
  const p: any = await Promise.resolve(params); // NEW: works whether params is object or Promise
  const id = String(p?.id ?? ""); // NEW
  return id;
}

// NEW: simple uuid sanity check to avoid passing garbage to Supabase
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); // NEW
}

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_path: string | null;
  location: string | null;
  mosque_address: string | null;
  mosque_picture_path: string | null;
  price_monthly: number | null;
  lead_teacher_id: string | null;
};

export default async function ProgramDetailsPage(props: { params: unknown }) {
  const supabase = await createServerSupabaseClient();

  const id = await unwrapParamsId((props as any).params); // NEW
  if (!id || !isUuid(id)) notFound(); // NEW: prevents 22P02 undefined/invalid uuid

  const user = await getCurrentUser();
  if (!user) redirect("/login"); // NEW: must be signed in

  // Fetch program
  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select(
      "id,title,description,thumbnail_path,location,mosque_address,mosque_picture_path,price_monthly,lead_teacher_id"
    )
    .eq("id", id)
    .single();

  if (progErr || !program) notFound();

  // Fetch teacher profile (for contact modal)
  let teacherName = "Teacher";
  let teacherEmail: string | null = null;
  let teacherAvatarUrl: string | null = null;

  if ((program as ProgramRow).lead_teacher_id) {
    const { data: t } = await supabase
      .from("profiles")
      .select("full_name,email,avatar_path")
      .eq("id", (program as ProgramRow).lead_teacher_id!)
      .maybeSingle();

    teacherName = (t?.full_name as string) || "Teacher";
    teacherEmail = (t?.email as string) || null;

    // NEW: make public URL from stored path (bucket: public-media)
    if (t?.avatar_path) {
      const { data: pub } = supabase.storage
        .from("public-media")
        .getPublicUrl(String(t.avatar_path)); // NEW
      teacherAvatarUrl = pub?.publicUrl ?? null; // NEW
    }
  }

  // Check enrollment
  const { data: enrollmentRow } = await supabase
    .from("enrollments")
    .select("id")
    .eq("program_id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  const isEnrolled = !!enrollmentRow;

  // Build public URLs for images
  const programThumbUrl = (program as ProgramRow).thumbnail_path
    ? supabase.storage.from("public-media").getPublicUrl(String((program as ProgramRow).thumbnail_path)).data
        .publicUrl
    : null;

  const mosquePicUrl = (program as ProgramRow).mosque_picture_path
    ? supabase.storage.from("public-media").getPublicUrl(String((program as ProgramRow).mosque_picture_path)).data
        .publicUrl
    : null;

  async function registerAction() {
    "use server";
    const supabaseServer = await createServerSupabaseClient(); // NEW: server action gets its own client
    const u = await getCurrentUser();
    if (!u) redirect("/login"); // NEW

    // NEW: upsert-like behavior (avoid duplicates)
    await supabaseServer
      .from("enrollments")
      .insert({ program_id: id, student_id: u.id })
      .throwOnError();

    redirect(`/programs/${id}`); // NEW: refresh page state
  }

  async function withdrawAction() {
    "use server";
    const supabaseServer = await createServerSupabaseClient(); // NEW
    const u = await getCurrentUser();
    if (!u) redirect("/login"); // NEW

    await supabaseServer
      .from("enrollments")
      .delete()
      .eq("program_id", id)
      .eq("student_id", u.id)
      .throwOnError();

    redirect(`/programs/${id}`); // NEW
  }

  const price = typeof (program as ProgramRow).price_monthly === "number"
    ? (program as ProgramRow).price_monthly!.toFixed(2)
    : "0.00";

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <PageTopActions backHref="/programs" backLabel="Back to programs" showSignOut />

        {/* Top card */}
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="h-40 w-full bg-zinc-100">
            <StorageImage
              primarySrc={programThumbUrl} // NEW: always string|null
              fallbackSrc={null} // NEW
              alt={(program as ProgramRow).title}
              className="h-40 w-full object-cover"
            />
          </div>

          <div className="p-8">
            <h1 className="text-3xl font-semibold text-zinc-900">
              {(program as ProgramRow).title}
            </h1>
            {(program as ProgramRow).description ? (
              <p className="mt-2 text-sm text-zinc-700">
                {(program as ProgramRow).description}
              </p>
            ) : null}
          </div>
        </section>

        {/* Two-column layout */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Left: overview */}
          <section className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Program overview</div>

            <div className="mt-4 space-y-2 text-sm text-zinc-700">
              <div>
                <span className="font-semibold text-zinc-900">Led by:</span>{" "}
                {teacherName}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Location:</span>{" "}
                {(program as ProgramRow).location || "TBD"}
              </div>
            </div>
          </section>

          {/* Right: mosque + price + actions */}
          <aside className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            {mosquePicUrl ? (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                <img
                  src={mosquePicUrl}
                  alt={(program as ProgramRow).location || "Mosque"}
                  className="h-36 w-full object-cover"
                />
              </div>
            ) : null}

            <div className="mt-4">
              <div className="text-base font-semibold text-zinc-900">
                {(program as ProgramRow).location || "Mosque"}
              </div>
              {(program as ProgramRow).mosque_address ? (
                <div className="mt-1 text-sm text-zinc-600">
                  {(program as ProgramRow).mosque_address}
                </div>
              ) : null}
            </div>

            {/* Price box */}
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Price per month
              </div>
              <div className="mt-1 text-3xl font-semibold text-zinc-900">
                ${price}
              </div>
            </div>

            {/* Actions (modals handled client-side) */}
            <ProgramActionPanel
              isEnrolled={isEnrolled}
              teacherName={teacherName}
              teacherEmail={teacherEmail}
              teacherAvatarUrl={teacherAvatarUrl}
              onRegister={registerAction} // NEW
              onWithdraw={withdrawAction} // NEW
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
