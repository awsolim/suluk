import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getAdminProgramCardsByMosqueId,
} from "@/lib/supabase/queries";
import CardAction from "@/components/ui/CardAction";

type AdminProgramsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminProgramsPage({
  params,
}: AdminProgramsPageProps) {
  const { slug } = await params; // Read the tenant slug from the route so admin access stays mosque-specific.

  const mosque = await getMosqueBySlug(slug); // Load the mosque for this tenant slug.

  if (!mosque) {
    notFound(); // Hide the page behind a normal 404 if the mosque slug does not exist.
  }

  const profile = await getProfileForCurrentUser(); // Load the currently signed-in user's profile.

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/admin/programs`)}`
    ); // Send logged-out users to the correct tenant login page and preserve the return path.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Check this user's internal role for the current mosque.

  if (!membership || membership.role !== "mosque_admin") {
    notFound(); // Hide admin routes from non-admin users instead of exposing a visible authorization error.
  }

  const programs = await getAdminProgramCardsByMosqueId(mosque.id); // Load admin-ready program card data including teacher names and enrolled student counts.

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{mosque.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage Programs
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage programs for this mosque.
          </p>
        </div>

        
      </div>

      {programs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            No programs have been created for this mosque yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3">
  {programs.map((program) => (
    <Link
      key={program.id}
      href={`/m/${slug}/admin/programs/${program.id}`}
      className="block cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
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

          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>
              Teacher:{" "}
              <span className="font-medium text-black">
                {program.teacher_name || "Unassigned"}
              </span>
            </p>

            <p>
              Students:{" "}
              <span className="font-medium text-black">
                {program.enrolled_student_count}
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
      </article>
    </Link>
  ))}
</div>
        </div>
      )}
    </section>
  );
}