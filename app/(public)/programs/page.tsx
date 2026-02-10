import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";
import Link from "next/link";
import BackLink from "@/components/layout/BackLink";

function publicStorageUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`; // NEW: storage public URL helper
}

export default async function ProgramsPage() {
  const supabase = await createServerSupabaseClient();

  const role = await getCurrentRole(); // NEW: role-aware back destination
  const backHref =
    role === "admin"
      ? "/admin"
      : role === "teacher"
      ? "/teacher"
      : role === "student"
      ? "/student"
      : "/login"; // NEW: if not logged in, back goes to login

  const { data: programs, error } = await supabase
    .from("programs")
    .select("id,title,description,thumbnail_path,lead_teacher_id,location,is_active,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const teacherIds = Array.from(new Set((programs ?? []).map((p) => p.lead_teacher_id).filter(Boolean))) as string[];

  const { data: teachers } = teacherIds.length
    ? await supabase.from("profiles").select("id,full_name,avatar_path").in("id", teacherIds)
    : { data: [] as Array<{ id: string; full_name: string | null; avatar_path: string | null }> };

  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t]));

  return (
    <div>
      <BackLink href={backHref} label="Back to dashboard" />

      <div className="px-6 pb-8 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-black">Programs</h1>
            <p className="mt-1 text-sm text-black/70">
              Browse available Qur’an memorization programs.
            </p>
          </div>

          <Link
            href={backHref}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            My dashboard
          </Link>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-800">Failed to load: {error.message}</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {(programs ?? []).map((p) => {
              const teacher = p.lead_teacher_id ? teacherMap.get(p.lead_teacher_id) : null;

              const thumbUrl = publicStorageUrl(p.thumbnail_path);
              const teacherName = teacher?.full_name ?? "Teacher";
              const teacherAvatarUrl = publicStorageUrl(teacher?.avatar_path ?? null);

              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
                >
                  <div className="relative h-44 w-full bg-black/5">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}

                    <div className="absolute -bottom-6 left-5 h-12 w-12 overflow-hidden rounded-full border border-black/10 bg-white shadow-sm">
                      {teacherAvatarUrl ? (
                        <img src={teacherAvatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-black/40">
                          <span className="text-lg">👤</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-10">
                    <div className="text-lg font-semibold text-black">{p.title}</div>

                    <div className="mt-1 text-sm text-black/70">
                      Led by <span className="font-medium text-black">{teacherName}</span>
                    </div>

                    {/* NEW: show location on card */}
                    {p.location ? (
                      <div className="mt-1 text-sm text-black/70">
                        Location: <span className="text-black">{p.location}</span>
                      </div>
                    ) : null}

                    {p.description ? (
                      <p className="mt-3 text-sm text-black/80">{p.description}</p>
                    ) : null}

                    <Link
                      href={`/programs/${p.id}`}
                      className="mt-4 inline-flex text-sm font-medium text-red-800 hover:underline"
                    >
                      View details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
