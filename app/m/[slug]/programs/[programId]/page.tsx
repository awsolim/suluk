import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProgramByIdForMosque,
  getProfileForCurrentUser,
  getEnrollmentForStudent,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";
import { enrollInProgram } from "@/app/actions/enrollments";

type PageProps = {
  params: Promise<{
    slug: string;
    programId: string;
  }>;
  searchParams: Promise<{
    from?: string;
  }>;
};

export default async function ProgramDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, programId } = await params;
  const { from } = await searchParams;

  // Load tenant mosque.
  const mosque = await getMosqueBySlug(slug);
  if (!mosque) {
    notFound();
  }

  // Load program only if it belongs to this mosque.
  const program = await getProgramByIdForMosque(programId, mosque.id);
  if (!program) {
    notFound();
  }

  // Load current user's profile if signed in.
  const profile = await getProfileForCurrentUser();

  // Load the current user's mosque-scoped membership if signed in so the page can hide enrollment for teachers/admins.
  const membership = profile
    ? await getMosqueMembershipForUser(profile.id, mosque.id)
    : null;

  const isTeacher = membership?.role === "teacher"; // Teachers should not see enrollment actions.
  const isMosqueAdmin = membership?.role === "mosque_admin"; // Mosque admins should not see enrollment actions.
  const canEnroll = profile && !isTeacher && !isMosqueAdmin; // Only signed-in users without internal mosque staff roles may enroll.

  // Check whether the signed-in student user is already enrolled.
  const enrollment = canEnroll
    ? await getEnrollmentForStudent(program.id, profile.id)
    : null;

  // Preserve admin return path when this page was opened from admin mode.
  const isFromAdmin = from === "admin";

  // Choose the correct back destination based on page context.
  const backHref = isFromAdmin
    ? `/m/${slug}/admin/programs`
    : `/m/${slug}/programs`;

  // Choose the correct back link label based on page context.
  const backLabel = isFromAdmin ? "Back to Manage Programs" : "Back to Programs";

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="space-y-1">
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {program.title}
        </h1>
      </div>

      {program.description ? (
        <p className="mt-4 text-sm leading-6 text-gray-700">
          {program.description}
        </p>
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          No description is available for this program yet.
        </p>
      )}

      <div className="mt-8 space-y-3">
        {!profile ? (
          <Link
            href={`/m/${slug}/login?next=${encodeURIComponent(
              `/m/${slug}/programs/${program.id}${isFromAdmin ? "?from=admin" : ""}`
            )}`}
            className="block w-full rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white"
          >
            Log in to Enroll
          </Link>
        ) : isTeacher ? (
          <div className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-600">
            Teachers cannot enroll in programs.
          </div>
        ) : isMosqueAdmin ? (
          <div className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-600">
            Mosque admins cannot enroll in programs.
          </div>
        ) : enrollment ? (
          <div className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-600">
            Already Enrolled
          </div>
        ) : (
          <form action={enrollInProgram}>
            <input type="hidden" name="slug" value={slug} />{/* Pass the tenant slug so enrollment stays mosque-scoped. */}
            <input type="hidden" name="programId" value={program.id} />{/* Pass the program id so the action enrolls into the correct program. */}

            <button
              type="submit"
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
            >
              Enroll
            </button>
          </form>
        )}

        <Link
          href={backHref}
          className="block text-center text-sm font-medium underline underline-offset-4"
        >
          {backLabel}
        </Link>
      </div>
    </main>
  );
}