import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProgramByIdForMosque,
  getProfileForCurrentUser,
  getEnrollmentForStudent,
  getMosqueMembershipForUser,
  getProgramSubscriptionForStudent,
  getProgramApplicationForStudent,
} from "@/lib/supabase/queries";
import { isSubscriptionActive } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";
import { withdrawFromProgram } from "@/app/actions/enrollments";
import {
  applyToProgram,
  joinApprovedFreeProgram,
} from "@/app/actions/applications";
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

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#e5e7eb" />
      <circle cx="100" cy="78" r="34" fill="#9ca3af" />
      <path d="M45 165c10-30 36-46 55-46s45 16 55 46" fill="#9ca3af" />
    </svg>
  `);

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

  const supabase = await createClient();

  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const primaryColor = mosque.primary_color || "#111827";

  const program = await getProgramByIdForMosque(programId, mosque.id);

  if (!program) {
    notFound();
  }

  const profile = await getProfileForCurrentUser();

  const membership = profile
    ? await getMosqueMembershipForUser(profile.id, mosque.id)
    : null;

  const isTeacher = membership?.role === "teacher";
  const isMosqueAdmin = membership?.role === "mosque_admin";

  const enrollment =
    profile && !isTeacher && !isMosqueAdmin
      ? await getEnrollmentForStudent(program.id, profile.id)
      : null;

  const application =
    profile && !isTeacher && !isMosqueAdmin
      ? await getProgramApplicationForStudent(profile.id, program.id)
      : null;

  const subscription =
    profile && program.is_paid && !isTeacher && !isMosqueAdmin
      ? await getProgramSubscriptionForStudent(profile.id, program.id)
      : null;

  const hasActiveSubscription = isSubscriptionActive(subscription);

  const isFromAdmin = from === "admin";

  const backHref = isFromAdmin
    ? `/m/${slug}/admin/programs`
    : `/m/${slug}/programs`;

  const backLabel = isFromAdmin ? "Back to Manage Programs" : "Back to Programs";

  const thumbnailSrc = program.thumbnail_url
    ? supabase.storage.from("media").getPublicUrl(program.thumbnail_url).data.publicUrl
    : DEFAULT_PROGRAM_THUMBNAIL;

  const teacherAvatarSrc = program.teacher_avatar_url
    ? supabase.storage.from("media").getPublicUrl(program.teacher_avatar_url).data.publicUrl
    : DEFAULT_AVATAR;

  const teacherName = program.teacher_name || "Teacher not assigned";
  const teacherPhone = program.teacher_phone_number || "Phone number not available";

  const isPaidProgram = Boolean(program.is_paid);

  const genderTagLabel =
    program.audience_gender === "male"
      ? "Brothers"
      : program.audience_gender === "female"
      ? "Sisters"
      : null;

  const genderTagClass =
    program.audience_gender === "male"
      ? "bg-blue-100 text-blue-700"
      : program.audience_gender === "female"
      ? "bg-pink-100 text-pink-700"
      : "";

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
        <img
          src={thumbnailSrc}
          alt={`${program.title} thumbnail`}
          className="h-48 w-full object-cover"
        />

        <div className="space-y-1 p-4">
          <h1 className="text-2xl font-semibold tracking-tight">{program.title}</h1>
          <p className="text-sm text-gray-500">{mosque.name}</p>
          <p className="text-sm text-gray-700">{teacherName}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {genderTagLabel ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${genderTagClass}`}>
                {genderTagLabel}
              </span>
            ) : null}

            {program.age_range_text ? (
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                {program.age_range_text}
              </span>
            ) : null}
          </div>
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
        <h2 className="text-base font-semibold">
          {isPaidProgram ? "Monthly Subscription" : "Monthly Rate"}
        </h2>

        <p className="mt-3 text-lg font-semibold text-gray-900">
          {formatMonthlyPrice(program.price_monthly_cents ?? null)}
        </p>

        {isPaidProgram ? (
          <p className="mt-2 text-sm text-gray-600">
            This program requires teacher approval first, then payment before joining.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            This program requires teacher approval before joining.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {!profile ? (
            <Link
              href={`/m/${slug}/login?next=${encodeURIComponent(
                `/m/${slug}/programs/${program.id}${isFromAdmin ? "?from=admin" : ""}`
              )}`}
              className="block w-full rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Log in to Apply
            </Link>
          ) : isTeacher ? (
            <div className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-600">
              Teachers cannot apply to programs.
            </div>
          ) : isMosqueAdmin ? (
            <div className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-600">
              Mosque admins cannot apply to programs.
            </div>
          ) : enrollment ? (
            <form action={withdrawFromProgram}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="programId" value={program.id} />
              <SubmitButton pendingText="Withdrawing...">Withdraw</SubmitButton>
            </form>
          ) : application?.status === "pending" ? (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
              Application submitted. Waiting for teacher approval.
            </div>
          ) : application?.status === "rejected" ? (
            <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
              Your application was not approved.
            </div>
          ) : application?.status === "accepted" && !isPaidProgram ? (
            <form action={joinApprovedFreeProgram}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="programId" value={program.id} />
              <SubmitButton pendingText="Joining...">Join Class</SubmitButton>
            </form>
          ) : application?.status === "accepted" && isPaidProgram ? (
            hasActiveSubscription ? (
              <div className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
                Payment active. You can complete joining from your inbox once Stripe is connected.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
                  Teacher approved. Complete payment and join class.
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl px-4 py-3 text-sm font-medium text-white opacity-60"
                  style={{ backgroundColor: primaryColor }}
                >
                  Complete Payment and Join Class
                </button>
              </div>
            )
          ) : (
            <form action={applyToProgram}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="programId" value={program.id} />
              <SubmitButton pendingText="Applying...">Apply to Join</SubmitButton>
            </form>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Contact Teacher</h2>

        <div className="mt-4 flex items-center gap-3">
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