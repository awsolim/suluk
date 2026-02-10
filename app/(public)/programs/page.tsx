// app/(public)/programs/page.tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import SignOutButton from "@/components/auth/SignOutButton";

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  thumbnail_path: string | null;
  lead_teacher_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_path: string | null;
};

type EnrollmentRow = {
  program_id: string;
};

function getPublicMediaUrl(path: string | null) {
  if (!path) return null;
  // NEW: We assume the storage bucket is public, so getPublicUrl works without signing.
  // Note: We still generate via Supabase server client in the page for consistency.
  return path;
}

export default async function ProgramsPage() {
  const supabase = await createServerSupabaseClient();
  const user = await getCurrentUser();

  // NEW: Fetch programs from DB.
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select("id,title,description,location,thumbnail_path,lead_teacher_id")
    .order("created_at", { ascending: false });

  if (programsError) {
    throw new Error(programsError.message);
  }

  const safePrograms: ProgramRow[] = (programs ?? []) as ProgramRow[];

  // NEW: Fetch teacher profiles for all lead teachers (for name + avatar).
  const teacherIds = Array.from(
    new Set(
      safePrograms
        .map((p) => p.lead_teacher_id)
        .filter((v): v is string => Boolean(v))
    )
  );

  let teachersById = new Map<string, ProfileRow>();

  if (teacherIds.length > 0) {
    const { data: teacherProfiles, error: teachersError } = await supabase
      .from("profiles")
      .select("id,full_name,avatar_path")
      .in("id", teacherIds);

    if (teachersError) {
      throw new Error(teachersError.message);
    }

    (teacherProfiles ?? []).forEach((t) => {
      teachersById.set(t.id, t as ProfileRow);
    });
  }

  // NEW: If logged in, fetch enrollments to mark ENROLLED overlay on cards.
  let enrolledProgramIds = new Set<string>();

  if (user) {
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("program_id")
      .eq("student_id", user.id);

    if (enrollmentsError) {
      throw new Error(enrollmentsError.message);
    }

    (enrollments ?? []).forEach((e) => {
      const row = e as EnrollmentRow;
      if (row.program_id) enrolledProgramIds.add(row.program_id);
    });
  }

  // NEW: Precompute storage URLs (bucket: public-media).
  // We keep this here so the JSX stays clean.
  const programCards = safePrograms.map((p) => {
    const teacher = p.lead_teacher_id
      ? teachersById.get(p.lead_teacher_id) ?? null
      : null;

    const thumbPath = getPublicMediaUrl(p.thumbnail_path);
    const avatarPath = teacher?.avatar_path ?? null;

    const thumbUrl = thumbPath
      ? supabase.storage.from("public-media").getPublicUrl(thumbPath).data.publicUrl
      : null;

    const avatarUrl = avatarPath
      ? supabase.storage.from("public-media").getPublicUrl(avatarPath).data.publicUrl
      : null;

    const isEnrolled = enrolledProgramIds.has(p.id);

    return {
      program: p,
      teacher,
      thumbUrl,
      avatarUrl,
      isEnrolled,
    };
  });

  return (
    <main className="px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        {/* NEW: Page top actions (buttons only). */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={user ? "/" : "/"}
            className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            {user ? "Back to dashboard" : "Home"}
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <SignOutButton />
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                  style={{
                    // NEW: brighter cherry gradient (not too dark).
                    background:
                      "linear-gradient(90deg, #e11d48 0%, #fb7185 55%, #e11d48 100%)",
                  }}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{
              // NEW: title gradient.
              background:
                "linear-gradient(90deg, #e11d48 0%, #fb7185 55%, #e11d48 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Programs
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Browse available Qur’an memorization programs.
          </p>
        </div>

        {/* 2 cards per row on desktop */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {programCards.map(({ program, teacher, thumbUrl, avatarUrl, isEnrolled }) => {
            const teacherName = teacher?.full_name?.trim() || "Teacher";
            const location = program.location?.trim() || "TBD";

            return (
              <Link
                key={program.id}
                href={`/programs/${program.id}`}
                className="group block overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative h-48 w-full bg-zinc-100">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={program.title}
                      className={[
                        "h-48 w-full object-cover transition",
                        // NEW: blur + darken when enrolled on browse page.
                        isEnrolled ? "blur-[1px] brightness-75" : "",
                      ].join(" ")}
                    />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center text-sm text-zinc-500">
                      No thumbnail
                    </div>
                  )}

                  {/* NEW: teacher avatar circle inside thumbnail */}
                  <div className="absolute left-5 top-36 h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={teacherName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
                        {teacherName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* NEW: ENROLLED overlay */}
                  {isEnrolled ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-emerald-500/95 px-4 py-2 text-sm font-semibold text-white shadow">
                        ENROLLED
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="px-6 pb-6 pt-6">
                  <h2 className="text-lg font-semibold text-zinc-900">{program.title}</h2>

                  <div className="mt-2 space-y-1 text-sm">
                    <div className="text-zinc-700">
                      <span className="font-semibold text-zinc-900">Location:</span>{" "}
                      {location}
                    </div>
                    <div className="text-zinc-700">
                      <span className="font-semibold text-zinc-900">Led by:</span>{" "}
                      {teacherName}
                    </div>
                  </div>

                  {program.description ? (
                    <p className="mt-3 line-clamp-2 text-sm text-zinc-600">
                      {program.description}
                    </p>
                  ) : null}

                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-rose-600">
                    View details <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
