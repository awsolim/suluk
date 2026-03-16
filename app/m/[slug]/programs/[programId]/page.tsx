import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProgramByIdForMosque,
  getProfileForCurrentUser,
  getEnrollmentForStudent,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import {
  enrollInProgram,
  withdrawFromProgram,
} from "@/app/actions/enrollments";
import SubmitButton from "@/components/ui/SubmitButton";

type PageProps = {
  params: Promise<{
    slug: string;
    programId: string;
  }>;
  searchParams: Promise<{
    from?: string;
  }>;
};

// Added: fallback thumbnail so the public page still looks complete when no program image exists.
const DEFAULT_PROGRAM_THUMBNAIL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600">
      <rect width="1200" height="600" fill="#f3f4f6" />
      <rect x="60" y="60" width="1080" height="480" rx="32" fill="#e5e7eb" />
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-size="42"
        fill="#6b7280"
      >
        Program Image
      </text>
    </svg>
  `);

// Added: fallback avatar so the contact-teacher section still renders even without a teacher photo.
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#e5e7eb" />
      <circle cx="100" cy="78" r="34" fill="#9ca3af" />
      <path d="M45 165c10-30 36-46 55-46s45 16 55 46" fill="#9ca3af" />
    </svg>
  `);

// Added: format the stored monthly price in cents into a human-friendly string.
function formatMonthlyPrice(priceMonthlyCents: number | null) {
  if (priceMonthlyCents == null) {
    return "Pricing coming soon";
  }

  if (priceMonthlyCents === 0) {
    return "Free";
  }

  return `$${(priceMonthlyCents / 100).toFixed(2)}/month`;
}

export default async function ProgramDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, programId } = await params;
  const { from } = await searchParams;

  const supabase = await createClient(); // Added: needed to convert storage paths into public image URLs.

  // Load tenant mosque.
  const mosque = await getMosqueBySlug(slug);
  const primaryColor = mosque.primary_color || "#111827";


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

  // Added: convert the saved program thumbnail path into a browser-ready public URL.
  const thumbnailSrc = program.thumbnail_url
    ? supabase.storage.from("media").getPublicUrl(program.thumbnail_url).data.publicUrl
    : DEFAULT_PROGRAM_THUMBNAIL;

  // Added: convert the saved teacher avatar path into a browser-ready public URL.
  const teacherAvatarSrc = program.teacher_avatar_url
    ? supabase.storage.from("media").getPublicUrl(program.teacher_avatar_url).data.publicUrl
    : DEFAULT_AVATAR;

  const teacherName = program.teacher_name || "Teacher not assigned"; // Added: readable teacher fallback.
  const teacherPhone = program.teacher_phone_number || "Phone number not available"; // Added: readable phone fallback.

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <Link
  href={backHref}
  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white"
  style={{ backgroundColor: primaryColor }}
>
  ← Back to Programs
</Link>
      
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Added: top hero image for the public program detail page. */}
        <img
          src={thumbnailSrc}
          alt={`${program.title} thumbnail`}
          className="h-48 w-full object-cover"
        />

        
        <div className="space-y-1 p-4">
          <h1 className="text-2xl font-semibold tracking-tight">{program.title}</h1>
          <p className="text-sm text-gray-500">{mosque.name}</p>
          <p className="text-sm text-gray-700">{teacherName}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Description</h2>

        {program.description ? (
          <p className="mt-3 text-sm leading-6 text-gray-700">
            {program.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            No description is available for this program yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Monthly Rate</h2>
        <p className="mt-3 text-lg font-semibold text-gray-900">
          {formatMonthlyPrice(program.price_monthly_cents ?? null)}
        </p>

        <div className="mt-4 space-y-3">
          {!profile ? (
            <Link
              href={`/m/${slug}/login?next=${encodeURIComponent(
                `/m/${slug}/programs/${program.id}${isFromAdmin ? "?from=admin" : ""}`
              )}`}
              className="block w-full rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
              style={{backgroundColor:primaryColor}}
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
            <form action={withdrawFromProgram}>
              <input type="hidden" name="slug" value={slug} />{/* Pass the tenant slug so withdrawal stays mosque-scoped. */}
              <input type="hidden" name="programId" value={program.id} />{/* Pass the program id so the action withdraws from the correct program. */}

              {/* <button
                type="submit"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
              >
                Withdraw
              </button> */}
              <SubmitButton pendingText="Withdrawing...">Withdraw</SubmitButton>
            </form>
          ) : (
            <form action={enrollInProgram}>
              <input type="hidden" name="slug" value={slug} />{/* Pass the tenant slug so enrollment stays mosque-scoped. */}
              <input type="hidden" name="programId" value={program.id} />{/* Pass the program id so the action enrolls into the correct program. */}

              {/* <button
                type="submit"
                className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white"
                style={{backgroundColor: primaryColor}}

              >
                Enroll
              </button> */}
              <SubmitButton pendingText="Enrolling...">Enroll</SubmitButton>
            </form>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Contact Teacher</h2>

        <div className="mt-4 flex items-center gap-3">
          {/* Added: teacher avatar for the contact section. */}
          <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            <img
              src={teacherAvatarSrc}
              alt={teacherName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{teacherName}</p>
            <p className="text-sm text-gray-600">{teacherPhone}</p>
          </div>
        </div>
      </section>

      <Link
        href={backHref}
        className="block text-center text-sm font-medium underline underline-offset-4"
      >
        {backLabel}
      </Link>
    </main>
  );
}