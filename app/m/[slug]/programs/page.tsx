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
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ slug: string }>;
};

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const primaryColor = mosque.primary_color || "#111827";

  const programs = await getProgramsByMosqueId(mosque.id);

  const profile = await getProfileForCurrentUser();

  const membership = profile
    ? await getMosqueMembershipForUser(profile.id, mosque.id)
    : null;

  const isTeacher = membership?.role === "teacher";
  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isStudent = Boolean(profile) && !isTeacher && !isMosqueAdmin;

  const enrollments = isStudent
    ? await getEnrollmentsForStudentInMosque(profile.id, mosque.id)
    : [];

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
            You are browsing programs as a guest. Log in or sign up to apply.
          </p>
          <div className="mt-3 flex gap-3">
            <Button asChild className="flex-1">
              <Link href={`/m/${slug}/login`}>Log In</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/m/${slug}/signup`}>Sign Up</Link>
            </Button>
          </div>
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
            const thumbnailSrc = program.thumbnail_url
              ? supabase.storage.from("media").getPublicUrl(program.thumbnail_url)
                  .data.publicUrl
              : DEFAULT_PROGRAM_THUMBNAIL;

            const teacherAvatarSrc = program.teacher_avatar_url
              ? supabase.storage
                  .from("media")
                  .getPublicUrl(program.teacher_avatar_url).data.publicUrl
              : DEFAULT_AVATAR;

            const teacherName = program.teacher_name ?? "No teacher assigned";
            const isEnrolled = enrolledProgramIds.has(program.id);

            const genderTagLabel =
              program.audience_gender === "male"
                ? "Brothers"
                : program.audience_gender === "female"
                ? "Sisters"
                : null;

            const genderTagClass =
              program.audience_gender === "male"
                ? "bg-blue-100 text-blue-700"
                : program.audience_gender === "female"
                ? "bg-pink-100 text-pink-700"
                : "";

            return (
              <Link
                key={program.id}
                href={`/m/${slug}/programs/${program.id}`}
                className="block cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
              >
                <div className="relative">
                  <img
                    src={thumbnailSrc}
                    alt={`${program.title} thumbnail`}
                    className={`h-40 w-full object-cover transition ${
                      isEnrolled ? "brightness-50 blur-[1.5px]" : ""
                    }`}
                  />

                  {isEnrolled ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="-rotate-12 text-3xl font-extrabold tracking-wide text-green-500 drop-shadow-sm">
                        ENROLLED
                      </span>
                    </div>
                  ) : null}

                  <div className="absolute -bottom-6 left-4 h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-gray-100 shadow-sm">
                    <img
                      src={teacherAvatarSrc}
                      alt={teacherName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <article className="flex items-start justify-between p-4 pt-8">
                  <div className="min-w-0">
                    <p className="mb-2 text-sm text-gray-500">{teacherName}</p>

                    <h2 className="text-base font-semibold">{program.title}</h2>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {genderTagLabel ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${genderTagClass}`}
                        >
                          {genderTagLabel}
                        </span>
                      ) : null}

                      {program.age_range_text ? (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                          {program.age_range_text}
                        </span>
                      ) : null}
                    </div>

                    {program.description ? (
                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {program.description}
                      </p>
                    ) : null}
                  </div>

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