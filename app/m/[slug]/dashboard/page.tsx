import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getEnrollmentsForStudentInMosque,
  getMosqueMembershipForUser,
  getTeacherDashboardStats,
  getAdminDashboardStats,
} from "@/lib/supabase/queries";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DashboardPage({ params }: PageProps) {
  const { slug } = await params;

  // Load the tenant mosque for this dashboard route.
  const mosque = await getMosqueBySlug(slug);

  // Show 404 if the slug does not match a real mosque.
  if (!mosque) {
    notFound();
  }

  // Load the current signed-in profile.
  const profile = await getProfileForCurrentUser();

  // Redirect logged-out users to the tenant login page.
  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/dashboard`)}`);
  }

  // Load the user's mosque-scoped membership so dashboard content can be role-aware.
  const membership = await getMosqueMembershipForUser(profile.id, mosque.id);

  const isMosqueAdmin = membership?.role === "mosque_admin"; // Check whether this user is a mosque admin in the current mosque.
  const isTeacher = membership?.role === "teacher"; // Check whether this user is a teacher in the current mosque.
  const isStudentOnly = !isMosqueAdmin && !isTeacher; // Only pure student users should see enrollment-based dashboard content.

  // Load student enrollments only for student-only users, since teachers/admins should not enroll in classes.
  const enrollments = isStudentOnly
    ? await getEnrollmentsForStudentInMosque(profile.id, mosque.id)
    : [];

  const teacherStats = isTeacher
    ? await getTeacherDashboardStats(profile.id, mosque.id)
    : null; // Load teacher metrics only for teacher accounts.

  const adminStats = isMosqueAdmin
    ? await getAdminDashboardStats(mosque.id)
    : null; // Load admin metrics only for mosque admins.

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
        <>
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
                className="block rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white"
              >
                Manage Programs
              </Link>
            </div>
          </section>
        </>
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
              className="block rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white"
            >
              My Classes
            </Link>

            <Link
              href={`/m/${slug}/students`}
              className="block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
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
              <Link
                href={`/m/${slug}/programs`}
                className="text-sm font-medium underline underline-offset-4"
              >
                Browse Programs
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">
                  You are not enrolled in any programs here yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enrollment) => {
                  const program = Array.isArray(enrollment.programs)
                    ? enrollment.programs[0]
                    : enrollment.programs;

                  if (!program) return null;

                  return (
                    <article
                      key={enrollment.id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <h3 className="text-base font-semibold">{program.title}</h3>

                      {program.description ? (
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {program.description}
                        </p>
                      ) : null}

                      <div className="mt-4">
                        <Link
                          href={`/m/${slug}/programs/${program.id}`}
                          className="text-sm font-medium underline underline-offset-4"
                        >
                          View Program
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8 space-y-3">
            <Link
              href={`/m/${slug}/classes`}
              className="block rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white"
            >
              Go to My Classes
            </Link>

            <Link
              href={`/m/${slug}/programs`}
              className="block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
            >
              Explore More Programs
            </Link>
          </section>
        </>
      ) : null}
    </main>
  );
}