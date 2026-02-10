// app/(protected)/teacher/programs/[id]/page.tsx

import { notFound } from "next/navigation";
import PageTopActions from "@/components/layout/PageTopActions";
import StorageImage from "@/components/media/StorageImage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type Program = {
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

type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_path: string | null;
};

type PageProps = {
  // NOTE: some of your pages ended up with params as a Promise (from earlier changes).
  // We accept either shape here so it never breaks again.
  params: { id: string } | Promise<{ id: string }>;
};

// Small helper to build a public URL from a storage bucket path
function getPublicStorageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  // NOTE: We intentionally return the "public" URL format Supabase uses for public buckets.
  // If your bucket is not public, StorageImage should be changed to use signed URLs instead.
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export default async function TeacherProgramPage(props: PageProps) {
  const supabase = await createServerSupabaseClient();

  const user = await getCurrentUser();
  if (!user) notFound();

  const resolvedParams = await Promise.resolve(props.params); // NEW: supports params being Promise or plain object
  const programId = resolvedParams?.id;

  if (!programId) notFound(); // NEW: prevents "uuid: 'undefined'" crashes

  // 1) Fetch program
  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select(
      "id,title,description,thumbnail_path,location,mosque_address,mosque_picture_path,price_monthly,lead_teacher_id"
    )
    .eq("id", programId)
    .single();

  if (progErr || !program) notFound();

  // Security: teacher can only view programs they lead
  if ((program as Program).lead_teacher_id !== user.id) notFound();

  // 2) Fetch enrollments joined to student profiles
  // IMPORTANT: we MUST specify the relationship path, because you have multiple FKs to profiles
  // (ex: student_id and reviewed_by). This avoids PGRST201.
  const { data: enrollmentRows, error: enrollErr } = await supabase
    .from("enrollments")
    .select(
      `
      student_id,
      student:profiles!enrollments_student_id_fkey (
        id,
        full_name,
        email,
        avatar_path
      )
    `
    )
    .eq("program_id", programId);

  if (enrollErr) {
    // If this triggers, the FK name might differ in your DB.
    // See note below the code block for how to fix it.
    throw new Error(enrollErr.message);
  }

  // Convert rows into a clean StudentProfile[]
  const students: StudentProfile[] = (enrollmentRows ?? [])
    .map((r: any) => r.student as StudentProfile | null) // NEW: pull the "student" alias from the join
    .filter((s): s is StudentProfile => Boolean(s)); // NEW: type-guard filter fixes TS "(StudentProfile|null)[]"

  // 3) Image URLs
  const programThumbUrl = getPublicStorageUrl("public-media", (program as Program).thumbnail_path); // NEW: safe URL helper
  const mosquePicUrl = getPublicStorageUrl("public-media", (program as Program).mosque_picture_path); // NEW: safe URL helper

  // 4) Price text (safe)
  const priceText =
    typeof (program as Program).price_monthly === "number"
      ? (program as Program).price_monthly!.toFixed(2) // NEW: toFixed only runs when number
      : "0.00";

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <PageTopActions showSignOut={true} />

        {/* Header */}
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="h-56 w-full bg-zinc-100">
            <StorageImage
              primarySrc={programThumbUrl}
              fallbackSrc={null}
              alt={(program as Program).title}
              className="h-56 w-full object-cover"
            />
          </div>

          <div className="p-8">
            <h1 className="text-2xl font-semibold text-zinc-900">{(program as Program).title}</h1>
            {(program as Program).description ? (
              <p className="mt-2 text-sm text-zinc-600">{(program as Program).description}</p>
            ) : null}

            <div className="mt-4 grid gap-2 text-sm text-zinc-700">
              <div>
                <span className="font-semibold text-zinc-900">Location:</span>{" "}
                {(program as Program).location ?? "—"}
              </div>
              <div>
                <span className="font-semibold text-zinc-900">Price/month:</span> ${priceText}
              </div>
              {(program as Program).mosque_address ? (
                <div>
                  <span className="font-semibold text-zinc-900">Address:</span>{" "}
                  {(program as Program).mosque_address}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Students */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Enrolled students</h2>
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {students.length}
              </div>
            </div>

            {students.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                No students are enrolled yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {students.map((s) => {
                  const avatarUrl = getPublicStorageUrl("public-media", s.avatar_path); // NEW: safe avatar URL
                  const initials =
                    (s.full_name ?? "Student")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("") || "S";

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                          {avatarUrl ? (
                            <StorageImage
                              primarySrc={avatarUrl}
                              fallbackSrc={null}
                              alt={s.full_name ?? "Student"}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center text-xs font-bold text-zinc-700">
                              {initials}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-zinc-900">
                            {s.full_name ?? "Unnamed"}
                          </div>
                          <div className="text-xs text-zinc-600">{s.email ?? "No email"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Mosque card */}
          <aside className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              {mosquePicUrl ? (
                <StorageImage
                  primarySrc={mosquePicUrl}
                  fallbackSrc={null}
                  alt={(program as Program).location ?? "Mosque"}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-zinc-600">
                  No mosque picture
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-zinc-900">
                {(program as Program).location ?? "Mosque"}
              </div>
              {(program as Program).mosque_address ? (
                <div className="mt-1 text-sm text-zinc-600">{(program as Program).mosque_address}</div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Price per month</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900">${priceText}</div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/**
 * If you STILL get PGRST201:
 * - Open Supabase → Table Editor → enrollments → "Foreign keys"
 * - Find the FK from enrollments.student_id → profiles.id
 * - Copy its exact name, and replace:
 *     profiles!enrollments_student_id_fkey
 *   with:
 *     profiles!<YOUR_EXACT_FK_NAME>
 */
