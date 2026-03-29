import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTeacherProgram } from "@/app/actions/programs";
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
} from "@/lib/supabase/cached-queries";
import { getTeacherProgramByIdInMosque } from "@/lib/supabase/queries";
import SubmitButton from "@/components/ui/SubmitButton";

type TeacherProgramEditPageProps = {
  params: Promise<{
    slug: string;
    programId: string;
  }>;
};

export default async function TeacherProgramEditPage({
  params,
}: TeacherProgramEditPageProps) {
  const { slug, programId } = await params; // Read the tenant slug and program id so the page stays fully mosque-scoped.

  const mosque = await getCachedMosqueBySlug(slug); // Load the mosque for this tenant route.

  if (!mosque) {
    notFound(); // Show a normal 404 if the mosque slug is invalid.
  }

  const profile = await getCachedProfile(); // Load the signed-in profile for teacher authorization.

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/teacher/programs/${programId}/edit`
      )}`
    ); // Require login before allowing access to the teacher edit page.
  }

  const membership = await getCachedMembership(profile.id, mosque.id); // Load the user's mosque-scoped membership row.

  if (!membership || membership.role !== "teacher") {
    notFound(); // Hide teacher edit routes from non-teachers.
  }

  const program = await getTeacherProgramByIdInMosque(
    programId,
    profile.id,
    mosque.id
  ); // Load the program only if this teacher is actually assigned to it in this mosque.

  if (!program) {
    notFound(); // Hide invalid, cross-tenant, or non-owned teacher program ids.
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Class Details</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update the details for this class.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <p className="text-sm text-gray-500">Current status</p>
        <div className="mt-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              program.is_active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {program.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Teachers can edit class details here. Program activation and staffing stay admin-managed.
        </p>
      </div>

      <form
        action={updateTeacherProgram}
        className="space-y-4 rounded-2xl border border-gray-200 p-4 shadow-sm"
      >
        <input type="hidden" name="slug" value={slug} />{/* Pass the tenant slug so the action stays mosque-scoped. */}
        <input type="hidden" name="programId" value={program.id} />{/* Pass the program id so the action updates the correct teacher-owned row. */}

        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={program.title ?? ""}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={program.description ?? ""}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none"
          />
        </div>

        <div className="space-y-3">
          {/* <button
            type="submit"
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
          >
            Save Changes
          </button> */}
          <SubmitButton pendingText="Saving...">Save Chnages</SubmitButton>

          <Link
            href={`/m/${slug}/teacher/programs/${program.id}`}
            className="block text-center text-sm font-medium underline underline-offset-4"
          >
            Back to Teacher View
          </Link>
        </div>
      </form>
    </section>
  );
}