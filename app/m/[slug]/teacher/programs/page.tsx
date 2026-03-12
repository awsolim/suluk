import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getProgramsForTeacherInMosque,
} from "@/lib/supabase/queries";

type TeacherProgramsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TeacherProgramsPage({
  params,
}: TeacherProgramsPageProps) {
  const { slug } = await params; // Read the tenant slug so teacher access stays mosque-specific.

  const mosque = await getMosqueBySlug(slug); // Load the mosque for this tenant slug.

  if (!mosque) {
    notFound(); // Hide the page behind a normal 404 if the mosque slug does not exist.
  }

  const profile = await getProfileForCurrentUser(); // Load the current signed-in profile.

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/teacher/programs`)}`
    ); // Require login before allowing teacher access.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's mosque-scoped membership row.

  if (!membership || membership.role !== "teacher") {
    notFound(); // Hide teacher routes from non-teachers.
  }

  const programs = await getProgramsForTeacherInMosque(profile.id, mosque.id); // Load only programs assigned to this teacher in this mosque.

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          My Teaching Programs
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          View the programs assigned to you in this mosque.
        </p>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            No programs are assigned to you here yet.
          </p>
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

              <div className="mt-4">
                <Link
                  href={`/m/${slug}/programs/${program.id}`}
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