import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getEnrollmentsForStudentInMosque,
  getMosqueMembershipForUser,
  getProgramsByMosqueIdIncludingInactive,
  getProgramsForTeacherInMosque,
} from "@/lib/supabase/queries";
import CardAction from "@/components/ui/CardAction";

type ClassesPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ClassesPage({ params }: ClassesPageProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug); // Load the tenant mosque from the route slug.

  if (!mosque) {
    notFound(); // Show 404 for an invalid mosque slug.
  }

  const profile = await getProfileForCurrentUser(); // Load the signed-in user's profile.

  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/classes`)}`); // Require login before showing personal class data.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's mosque-scoped role for role-aware class behavior.

  const isMosqueAdmin = membership?.role === "mosque_admin"; // Admin role takes precedence over teacher/student behavior.
  const isTeacher = membership?.role === "teacher"; // Teacher behavior applies when the user is not an admin.

  if (isMosqueAdmin) {
    const programs = await getProgramsByMosqueIdIncludingInactive(mosque.id); // Load all mosque programs for admin program oversight.

    return (
      <section className="space-y-5">
        <div>
          <p className="text-sm text-gray-500">{mosque.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">All Programs</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage every program in this mosque.
          </p>
        </div>

        {programs.length === 0 ? (
          <div className="space-y-4 rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">
              No programs have been created for this mosque yet.
            </p>

            <Link
              href={`/m/${slug}/admin/programs/new`}
              className="block rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white"
            >
              Create New Program
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <article
                key={program.id}
                className="rounded-2xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{program.title}</h2>

                    {program.description ? (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {program.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        No description yet.
                      </p>
                    )}
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

                <div className="mt-4 flex flex-wrap gap-4">
                  <Link
                    href={`/m/${slug}/admin/programs/${program.id}/edit`} // Let admins edit the program directly from the list.
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Edit Program
                  </Link>

                  <Link
                    href={`/m/${slug}/programs/${program.id}?from=admin`} // Let admins still jump to the public-facing program page when needed.
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    View Public Page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (isTeacher) {
    const teachingPrograms = await getProgramsForTeacherInMosque(profile.id, mosque.id); // Load only the classes assigned to this teacher in this mosque.

    return (
      <section className="space-y-5">
        <div>
          <p className="text-sm text-gray-500">{mosque.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">My Classes</h1>
          <p className="mt-1 text-sm text-gray-600">
            View the classes you teach in this mosque.
          </p>
        </div>

        {teachingPrograms.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">
              You are not assigned to teach any classes here yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {teachingPrograms.map((program) => (
              <article
                key={program.id}
                className="rounded-2xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{program.title}</h2>

                    {program.description ? (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {program.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        No description yet.
                      </p>
                    )}
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

                <div className="mt-4 flex flex-wrap gap-4">
                  <CardAction
                    href={`/m/${slug}/teacher/programs/${program.id}`} // Teachers should open the teacher-scoped workspace for this class.
                  >
                    Open Teacher View
                  </CardAction>

                  <CardAction
                    href={`/m/${slug}/programs/${program.id}`} // Teachers can still view the public-facing version of the program.
                  >
                    View Public Page
                  </CardAction>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  const enrollments = await getEnrollmentsForStudentInMosque(profile.id, mosque.id); // Load student enrollments for users without teacher/admin roles in this mosque.

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">My Classes</h1>
        <p className="mt-1 text-sm text-gray-600">
          View the programs you are enrolled in for this mosque.
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            You are not enrolled in any classes here yet.
          </p>

          <Link
            href={`/m/${slug}/programs`}
            className="block rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white"
          >
            Browse Programs
          </Link>
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
                className="rounded-2xl border border-gray-200 p-4 shadow-sm"
              >
                <h2 className="text-base font-semibold">{program.title}</h2>

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
  );
}