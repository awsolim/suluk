import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getEnrollmentsForStudentInMosque,
  getMosqueMembershipForUser,
  getTeacherDashboardStats,
  getAdminDashboardStats,
  getLatestAnnouncementsForPrograms,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import StudentEnrollmentCard from "@/components/dashboard/StudentEnrollmentCard";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#e5e7eb" />
      <circle cx="100" cy="78" r="34" fill="#9ca3af" />
      <path d="M45 165c10-30 36-46 55-46s45 16 55 46" fill="#9ca3af" />
    </svg>
  `);

export default async function DashboardPage({ params }: PageProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug);
  const primaryColor = "var(--primary-color)";
  const secondaryColor = "var(--secondary-color)";

  if (!mosque) {
    notFound();
  }

  const profile = await getProfileForCurrentUser();

  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/dashboard`)}`);
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id);

  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacher = membership?.role === "teacher";
  const isStudentOnly = !isMosqueAdmin && !isTeacher;

  const enrollments = isStudentOnly
    ? await getEnrollmentsForStudentInMosque(profile.id, mosque.id)
    : [];

  const teacherStats = isTeacher
    ? await getTeacherDashboardStats(profile.id, mosque.id)
    : null;

  const adminStats = isMosqueAdmin
    ? await getAdminDashboardStats(mosque.id)
    : null;

  const enrolledProgramIds = enrollments
    .map((enrollment) => {
      const program = Array.isArray(enrollment.programs)
        ? enrollment.programs[0]
        : enrollment.programs;

      return program?.id ?? null;
    })
    .filter((programId): programId is string => Boolean(programId));

  const latestAnnouncements = isStudentOnly
    ? await getLatestAnnouncementsForPrograms(enrolledProgramIds)
    : [];

  const supabase = await createClient();

  const latestAnnouncementByProgramId = new Map(
    latestAnnouncements.map((announcement) => {
      const author = Array.isArray(announcement.profiles)
        ? announcement.profiles[0]
        : announcement.profiles;

      const authorAvatarSrc = author?.avatar_url
        ? supabase.storage.from("media").getPublicUrl(author.avatar_url).data.publicUrl
        : DEFAULT_AVATAR;

      return [
        announcement.program_id,
        {
          id: announcement.id,
          message: announcement.message,
          created_at: announcement.created_at,
          author_name: author?.full_name ?? null,
          author_avatar_src: authorAvatarSrc,
        },
      ];
    })
  );

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="space-y-1">
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Your activity and classes in this mosque.
        </p>
      </div>

      {isMosqueAdmin ? (
        <section className="mt-6 rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Admin</h2>
            <p className="text-sm text-gray-600">
              Manage programs and mosque content.
            </p>
          </div>

          {adminStats ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Programs</p>
                <p className="mt-1 text-xl font-semibold">
                  {adminStats.total_program_count}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Active</p>
                <p className="mt-1 text-xl font-semibold">
                  {adminStats.active_program_count}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Teachers</p>
                <p className="mt-1 text-xl font-semibold">
                  {adminStats.teacher_count}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Students</p>
                <p className="mt-1 text-xl font-semibold">
                  {adminStats.student_count}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <Link
              href={`/m/${slug}/admin/programs`}
              className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              Manage Programs
            </Link>
          </div>
        </section>
      ) : null}

      {isTeacher ? (
        <section className="mt-6 rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Teacher</h2>
            <p className="text-sm text-gray-600">
              View the classes assigned to you and the students in them.
            </p>
          </div>

          {teacherStats ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Classes</p>
                <p className="mt-1 text-xl font-semibold">
                  {teacherStats.class_count}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm text-gray-500">Students</p>
                <p className="mt-1 text-xl font-semibold">
                  {teacherStats.student_count}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <Link
              href={`/m/${slug}/classes`}
              className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              My Classes
            </Link>

            <Link
              href={`/m/${slug}/students`}
              className="block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
              style={{ backgroundColor: secondaryColor }}
            >
              View Students
            </Link>
          </div>
        </section>
      ) : null}

      {isStudentOnly ? (
        <>
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Enrollments</h2>
            </div>

            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">
                  You are not enrolled in any programs here yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {enrollments.map((enrollment) => {
                  const program = Array.isArray(enrollment.programs)
                    ? enrollment.programs[0]
                    : enrollment.programs;

                  if (!program) return null;

                  return (
                    <StudentEnrollmentCard
                      key={enrollment.id}
                      slug={slug}
                      program={{
                        id: program.id,
                        title: program.title,
                        description: program.description ?? null,
                        schedule_days: program.schedule_days ?? [],
                        schedule_start_time: program.schedule_start_time ?? null,
                        schedule_end_time: program.schedule_end_time ?? null,
                        schedule_timezone: program.schedule_timezone ?? "America/Edmonton",
                      }}
                      latestAnnouncement={
                        latestAnnouncementByProgramId.get(program.id) ?? null
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8 space-y-3">
            <Link
              href={`/m/${slug}/classes`}
              className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              Go to My Classes
            </Link>

            <Link
              href={`/m/${slug}/programs`}
              className="block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
              style={{ backgroundColor: "var(--secondary-color)" }}
            >
              Explore More Programs
            </Link>
          </section>
        </>
      ) : null}
    </main>
  );
}