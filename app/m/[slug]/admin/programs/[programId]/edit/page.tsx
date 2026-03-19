import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateProgram } from "@/app/actions/programs";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getProgramByIdIncludingInactiveForMosque,
  getTeachersForMosque,
} from "@/lib/supabase/queries";
import SubmitButton from "@/components/ui/SubmitButton";
import PricingEditor from "@/components/PricingEditor";

type EditProgramPageProps = {
  params: Promise<{
    slug: string;
    programId: string;
  }>;
};

export default async function EditProgramPage({
  params,
}: EditProgramPageProps) {
  const { slug, programId } = await params; // Read the tenant slug and target program id from the route.

  const mosque = await getMosqueBySlug(slug); // Load the mosque for this slug.

  if (!mosque) {
    notFound(); // Hide the page behind a normal 404 if the mosque does not exist.
  }

  const profile = await getProfileForCurrentUser(); // Load the signed-in user's profile.

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/admin/programs/${programId}/edit`
      )}`
    ); // Require login before accessing admin editing.
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's mosque-scoped membership.

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

  const teachers = await getTeachersForMosque(mosque.id); // Load teacher options for this mosque so the admin can assign or reassign the program.
  console.log("EditProgramPage teachers:", teachers); // Debug: confirm the page is receiving the teacher list.

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Program</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update this mosque program.
        </p>
      </div>

      <form
        action={updateProgram}
        className="space-y-4 rounded-2xl border border-gray-200 p-4 shadow-sm"
      >
        <input type="hidden" name="slug" value={slug} />{/* Pass the tenant slug so the action stays mosque-scoped. */}
        <input type="hidden" name="programId" value={program.id} />{/* Pass the program id so the action updates the correct row. */}

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
            rows={5}
            defaultValue={program.description ?? ""}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="teacher_profile_id" className="block text-sm font-medium">
            Assigned Teacher
          </label>
          <select
            id="teacher_profile_id"
            name="teacher_profile_id"
            defaultValue={program.teacher_profile_id ?? ""}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none"
          >
            <option value="">Unassigned</option>
            {teachers.map((teacher) => {
  const label =
    teacher.full_name?.trim() ||
    teacher.profile_id;

  return (
    <option key={teacher.profile_id} value={teacher.profile_id}>
      {label}
    </option>
  );
})}
          </select>
          <p className="text-xs text-gray-500">
            Choose a teacher from this mosque, or leave the program unassigned.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Pricing</label>
          <div className="rounded-xl border border-gray-200 px-3 py-3">
            <PricingEditor
              isPaid={Boolean(program.is_paid)}
              priceMonthlyCents={program.price_monthly_cents ?? null}
              hasStripeAccount={Boolean(mosque.stripe_account_id)}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={Boolean(program.is_active)}
          />
          <span className="text-sm">Program is active</span>
        </label>

        <div className="space-y-3">
          <Link
            href={`/m/${slug}/admin/programs`}
            className="block text-center text-sm font-medium underline underline-offset-4"
          >
            ←
          </Link>
          {/* <button
            type="submit"
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
          >
            Save Changes
          </button> */}
          <SubmitButton pendingText="Saving ...">Save Changes</SubmitButton>

          
        </div>
      </form>
    </section>
  );
}
