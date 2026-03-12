import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getTeacherProgramByIdInMosque,
  getEnrollmentsForProgramInTeacherView,
} from "@/lib/supabase/queries";
import CardAction from "@/components/ui/CardAction";

type TeacherProgramDetailPageProps = {
  params: Promise<{
    slug: string;
    programId: string;
  }>;
};

export default async function TeacherProgramDetailPage({
  params,
}: TeacherProgramDetailPageProps) {
  const { slug, programId } = await params; // Read the tenant slug and program id so the page stays fully mosque-scoped.

  const mosque = await getMosqueBySlug(slug); // Load the mosque for this tenant route.

  if (!mosque) {
    notFound(); // Show a normal 404 if the mosque slug is invalid.
  }

  const profile = await getProfileForCurrentUser(); // Load the signed-in profile for teacher authorization.

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/teacher/programs/${programId}`)}`
    ); // Require login before allowing access to the teacher program workspace.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's mosque-scoped membership row.

  if (!membership || membership.role !== "teacher") {
    notFound(); // Hide teacher routes from non-teachers.
  }

  const program = await getTeacherProgramByIdInMosque(
    programId,
    profile.id,
    mosque.id
  ); // Load the program only if this teacher is actually assigned to it in this mosque.

  if (!program) {
    notFound(); // Hide invalid, cross-tenant, or non-owned teacher program ids.
  }

  const enrollments = await getEnrollmentsForProgramInTeacherView(
    program.id,
    profile.id,
    mosque.id
  ); // Load the enrolled students for this teacher-owned program.

  const enrolledStudentCount = enrollments.length; // Count how many students are currently enrolled in this class.

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{program.title}</h1>
        <p className="text-sm text-gray-600">
          Teacher view for this class.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Program Details</h2>

            {program.description ? (
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {program.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                No description yet.
              </p>
            )}

            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>
                Students:{" "}
                <span className="font-medium text-black">
                  {enrolledStudentCount}
                </span>
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              program.is_active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {program.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <CardAction href={`/m/${slug}/classes`}>
            ←
          </CardAction>
          
          <CardAction href={`/m/${slug}/teacher/programs/${program.id}/edit`}>
            Edit Details
          </CardAction>

          <CardAction href={`/m/${slug}/programs/${program.id}`}>
            View Public Page
          </CardAction>

          
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Enrolled Students</h2>
          <p className="mt-1 text-sm text-gray-600">
            Students currently registered in this class.
          </p>
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">
              No students are enrolled in this class yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {enrollments.map((enrollment) => {
              const student = Array.isArray(enrollment.profiles)
                ? enrollment.profiles[0]
                : enrollment.profiles;

              return (
                <article
                  key={enrollment.id}
                  className="rounded-2xl border border-gray-200 p-4 shadow-sm"
                >
                  <h3 className="text-base font-semibold">
                    {student?.full_name?.trim() ||
                      `Student ${enrollment.student_profile_id.slice(0, 8)}`}
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    Registered for this class.
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}