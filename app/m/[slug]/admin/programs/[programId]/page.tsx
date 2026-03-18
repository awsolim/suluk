import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getProgramByIdIncludingInactiveForMosque,
  getEnrollmentsForProgramInAdminView,
  getProfileById,
} from "@/lib/supabase/queries";

type AdminProgramDetailPageProps = {
  params: Promise<{
    slug: string;
    programId: string;
  }>;
};

export default async function AdminProgramDetailPage({
  params,
}: AdminProgramDetailPageProps) {
  const { slug, programId } = await params; // Read the tenant slug and program id so the page stays mosque-scoped.

  const mosque = await getMosqueBySlug(slug); // Load the mosque for this tenant slug.

  if (!mosque) {
    notFound(); // Hide invalid mosque slugs behind a normal 404.
  }

  const profile = await getProfileForCurrentUser(); // Load the signed-in profile for admin authorization.

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/admin/programs/${programId}`)}`
    ); // Require login before allowing access to admin program detail.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's mosque-scoped role.

  const isMosqueAdmin = membership?.role === "mosque_admin";
const isTeacher = membership?.role === "teacher";
const canManagePrograms =
  isMosqueAdmin || (isTeacher && membership?.can_manage_programs);

if (!canManagePrograms) {
  notFound();
}

  const program = await getProgramByIdIncludingInactiveForMosque(
    programId,
    mosque.id
  ); // Load the program only if it belongs to this mosque.

  if (!program) {
    notFound(); // Hide invalid or cross-tenant program ids.
  }

  const enrollments = await getEnrollmentsForProgramInAdminView(
    program.id,
    mosque.id
  ); // Load enrolled students for this admin-visible program.

  const teacherProfile = program.teacher_profile_id
    ? await getProfileById(program.teacher_profile_id)
    : null; // Load the assigned teacher's profile name when the program has a teacher.

  const teacherName =
    teacherProfile?.full_name?.trim() || null; // Use the teacher's readable name when available.

  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href={`/m/${slug}/admin/programs`}
          className="mt-1 text-lg font-medium text-gray-500"
          aria-label="Back to Manage Programs"
        >
          ←
        </Link>

        <div>
          <p className="text-sm text-gray-500">{mosque.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{program.title}</h1>
          <p className="text-sm text-gray-600">Admin view for this program.</p>
        </div>
      </div>

      <Link
        href={`/m/${slug}/admin/programs/${program.id}/edit`}
        className="block cursor-pointer rounded-2xl border border-gray-200 p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
      >
        <article>
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
                  Assigned Teacher:{" "}
                  <span className="font-medium text-black">
                    {teacherName || "Unassigned"}
                  </span>
                </p>
              </div>
            </div>

            <div className="ml-3 flex items-start gap-3">
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  program.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {program.is_active ? "Active" : "Inactive"}
              </span>

              <span className="text-lg text-gray-400">›</span>
            </div>
          </div>
        </article>
      </Link>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Enrolled Students</h2>
          <p className="mt-1 text-sm text-gray-600">
            Students currently registered in this program.
          </p>
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">
              No students are enrolled in this program yet.
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
                    Registered for this program.
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