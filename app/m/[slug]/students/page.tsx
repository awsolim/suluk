import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getEnrollmentsForTeacherProgramsInMosque,
} from "@/lib/supabase/queries";
import CardAction from "@/components/ui/CardAction";

type TeacherStudentsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TeacherStudentsPage({
  params,
}: TeacherStudentsPageProps) {
  const { slug } = await params; // Read the tenant slug so the page stays mosque-scoped.

  const mosque = await getMosqueBySlug(slug); // Load the mosque for this tenant slug.

  if (!mosque) {
    notFound(); // Show a 404 if the mosque slug is invalid.
  }

  const profile = await getProfileForCurrentUser(); // Load the signed-in profile for teacher authorization.

  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/students`)}`); // Require login before allowing access to teacher student data.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's mosque-scoped role for teacher authorization.

  if (!membership || membership.role !== "teacher") {
    notFound(); // Hide this teacher-only page from non-teachers.
  }

  const enrollments = await getEnrollmentsForTeacherProgramsInMosque(
    profile.id,
    mosque.id
  ); // Load all enrolled students across all programs taught by this teacher in this mosque.

  const totalStudents = enrollments.length; // Count all enrolled student rows across this teacher's classes.

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        <p className="mt-1 text-sm text-gray-600">
          View students registered across all of your classes.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="mt-1 text-2xl font-semibold">{totalStudents}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Classes Covered</p>
            <p className="mt-1 text-2xl font-semibold">
              {new Set(
                enrollments.map((enrollment) => {
                  const program = Array.isArray(enrollment.programs)
                    ? enrollment.programs[0]
                    : enrollment.programs;

                  return program?.id ?? "";
                }).filter(Boolean)
              ).size}
            </p>
          </div>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            No students are registered in your classes yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment) => {
            const student = Array.isArray(enrollment.profiles)
              ? enrollment.profiles[0]
              : enrollment.profiles;

            const program = Array.isArray(enrollment.programs)
              ? enrollment.programs[0]
              : enrollment.programs;

            const joinedDate = new Date(enrollment.created_at).toLocaleDateString(
              "en-CA",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            ); // Format the enrollment timestamp into a readable joined date.

            return (
              <article
                key={enrollment.id}
                className="rounded-2xl border border-gray-200 p-4 shadow-sm"
              >
                <h2 className="text-base font-semibold">
                  {student?.full_name?.trim() ||
                    `Student ${enrollment.student_profile_id.slice(0, 8)}`}
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Class: {program?.title ?? "Unknown Program"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Joined: {joinedDate}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <CardAction href={`/m/${slug}/teacher/programs/${program?.id}`}>
                    Open Class
                  </CardAction>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}