import { notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProgramsByMosqueId,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getEnrollmentsForStudentInMosque,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";


type PageProps = {
  params: Promise<{ slug: string }>;
};

// Added: fallback thumbnail image so cards still look complete when a program has no uploaded cover.
const DEFAULT_PROGRAM_THUMBNAIL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600">
      <rect width="1200" height="600" fill="#f3f4f6" />
      <rect x="60" y="60" width="1080" height="480" rx="32" fill="#e5e7eb" />
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-size="42"
        fill="#6b7280"
      >
        Program Image
      </text>
    </svg>
  `);

// Added: fallback avatar image so teacher profile circles still render even without an uploaded avatar.
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#e5e7eb" />
      <circle cx="100" cy="78" r="34" fill="#9ca3af" />
      <path d="M45 165c10-30 36-46 55-46s45 16 55 46" fill="#9ca3af" />
    </svg>
  `);

export default async function ProgramsPage({ params }: PageProps) {
  const { slug } = await params;

  // Added: create a server-side Supabase client so storage paths can be turned into public URLs.
  const supabase = await createClient();
  const {
  data: { user },
} = await supabase.auth.getUser(); // Check whether the visitor is logged in.

  // Load the current mosque from the tenant slug.
  const mosque = await getMosqueBySlug(slug);

  // Show 404 if the mosque slug is invalid.
  if (!mosque) {
    notFound();
  }
  const primaryColor = mosque.primary_color || "#111827";

  // Load only programs that belong to this mosque.
  
  const programs = await getProgramsByMosqueId(mosque.id);

  // Added: load the signed-in user's profile so we can determine enrolled state for students.
  const profile = await getProfileForCurrentUser();

  // Added: load the user's mosque-scoped membership to distinguish students from teachers/admins.
  const membership = profile
    ? await getMosqueMembershipForUser(profile.id, mosque.id)
    : null;

  const isTeacher = membership?.role === "teacher"; // Added: teachers should not get student enrolled-state treatment.
  const isMosqueAdmin = membership?.role === "mosque_admin"; // Added: admins should not get student enrolled-state treatment.
  const isStudent = Boolean(profile) && !isTeacher && !isMosqueAdmin; // Added: only non-staff signed-in users are treated as students here.

  // Added: load the student's enrollments in this mosque so the browse cards can mark enrolled programs.
  const enrollments = isStudent
    ? await getEnrollmentsForStudentInMosque(profile.id, mosque.id)
    : [];

  // Added: convert the student's enrollment rows into a fast lookup set by program id.
  const enrolledProgramIds = new Set(
    enrollments.map((enrollment) => enrollment.program_id)
  );

  return (
  <main className="mx-auto max-w-md px-4 py-6">
    <div className="mb-6 space-y-1">
      <p className="text-sm text-gray-500">{mosque.name}</p>
      <h1 className="text-2xl font-semibold tracking-tight">Programs</h1>
    </div>

    {!user ? (
      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          You are browsing programs as a guest.
        </p>
        <Link
          href={`/m/${slug}/login`}
          className="mt-3 block w-full rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
          style={{backgroundColor:primaryColor}}
        >
          Log In to Enroll
        </Link>
      </div>
    ) : null}

    {programs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            No programs are available right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => {
            // Added: choose the saved thumbnail if present, otherwise use the default placeholder.
            const thumbnailSrc = program.thumbnail_url
              ? supabase.storage.from("media").getPublicUrl(program.thumbnail_url)
                  .data.publicUrl
              : DEFAULT_PROGRAM_THUMBNAIL;

            // Added: choose the saved teacher avatar if present, otherwise use the default avatar.
            const teacherAvatarSrc = program.teacher_avatar_url
              ? supabase.storage
                  .from("media")
                  .getPublicUrl(program.teacher_avatar_url).data.publicUrl
              : DEFAULT_AVATAR;

            // Added: use the teacher's real name if available, otherwise show a simple fallback.
            const teacherName = program.teacher_name || "Teacher not assigned";

            // Added: check whether this specific program is already enrolled by the current student.
            const isEnrolled = enrolledProgramIds.has(program.id);

            return (
  <Link
  key={program.id}
  href={`/m/${slug}/programs/${program.id}`}
  className="block cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
>
  {/* Thumbnail section at the top of the card */}
  <div className="relative">
    <img
      src={thumbnailSrc}
      alt={`${program.title} thumbnail`}
      className={`h-40 w-full object-cover transition ${
        isEnrolled ? "brightness-50 blur-[1.5px]" : ""
      }`}
    />

    {/* Enrolled banner */}
    {isEnrolled ? (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="-rotate-12 text-3xl font-extrabold tracking-wide text-green-500 drop-shadow-sm">
          ENROLLED
        </span>
      </div>
    ) : null}

    {/* Teacher avatar */}
    <div className="absolute -bottom-6 left-4 h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-gray-100 shadow-sm">
      <img
        src={teacherAvatarSrc}
        alt={teacherName}
        className="h-full w-full object-cover"
      />
    </div>
  </div>

  {/* Card content */}
  <article className="flex items-start justify-between p-4 pt-8">
    <div className="min-w-0">
      <p className="mb-2 text-sm text-gray-500">{teacherName}</p>

      <h2 className="text-base font-semibold">{program.title}</h2>

      {program.description ? (
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {program.description}
        </p>
      ) : null}
    </div>

    {/* Chevron indicator */}
    <span className="ml-3 text-lg text-gray-400">›</span>
  </article>
</Link>
);
          })}
        </div>
      )}
    </main>
  );
}