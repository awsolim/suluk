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

type ClassesPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ClassesPage({ params }: ClassesPageProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const profile = await getProfileForCurrentUser();

  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/classes`)}`);
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id);

  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacher = membership?.role === "teacher";

  if (isMosqueAdmin) {
    const programs = await getProgramsByMosqueIdIncludingInactive(mosque.id);

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
                    href={`/m/${slug}/admin/programs/${program.id}/edit`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Edit Program
                  </Link>

                  <Link
                    href={`/m/${slug}/programs/${program.id}?from=admin`}
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
    const teachingPrograms = await getProgramsForTeacherInMosque(profile.id, mosque.id);

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
              <Link
                key={program.id}
                href={`/m/${slug}/teacher/programs/${program.id}`}
                className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
              >
                <article className="flex items-start justify-between gap-3">
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

                  <div className="flex shrink-0 items-start gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        program.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {program.is_active ? "Active" : "Inactive"}
                    </span>

                    <span className="text-lg leading-none text-gray-400">›</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  const enrollments = await getEnrollmentsForStudentInMosque(profile.id, mosque.id);

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
              <Link
                key={enrollment.id}
                href={`/m/${slug}/classes/${program.id}`}
                className="block cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
              >
                <article className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{program.title}</h2>

                    {program.description ? (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {program.description}
                      </p>
                    ) : null}
                  </div>

                  <span className="text-lg text-gray-400">›</span>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}