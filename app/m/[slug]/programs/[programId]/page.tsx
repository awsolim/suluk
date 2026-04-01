import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
} from "@/lib/supabase/cached-queries";
import {
  getProgramByIdForMosque,
  getEnrollmentForStudent,
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
import CheckoutButton from "@/components/CheckoutButton";
import { ChildSelector } from "@/components/programs/ChildSelector";
import { getChildrenForParent } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  return `CA$${(priceMonthlyCents / 100).toFixed(2)}/month`;
}

export default async function ProgramDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, programId } = await params;
  const { from } = await searchParams;

  const supabase = await createClient();

  const mosque = await getCachedMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const primaryColor = mosque.primary_color || "#111827";

  const program = await getProgramByIdForMosque(programId, mosque.id);

  if (!program) {
    notFound();
  }

  const profile = await getCachedProfile();

  const membership = profile
    ? await getCachedMembership(profile.id, mosque.id)
    : null;

  const isTeacher = membership?.role === "teacher";
  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isParent = membership?.role === "parent";

  // Parents don't enroll themselves — they use ChildSelector
  const enrollment =
    profile && !isTeacher && !isMosqueAdmin && !isParent
      ? await getEnrollmentForStudent(program.id, profile.id)
      : null;

  const application =
    profile && !isTeacher && !isMosqueAdmin && !isParent
      ? await getProgramApplicationForStudent(profile.id, program.id)
      : null;

  const subscription =
    profile && program.is_paid && !isTeacher && !isMosqueAdmin && !isParent
      ? await getProgramSubscriptionForStudent(profile.id, program.id)
      : null;

  const hasActiveSubscription = isSubscriptionActive(subscription);

  // Load children for parent role
  const parentChildren =
    profile && isParent
      ? await getChildrenForParent(profile.id, mosque.id)
      : [];
  const childrenList = parentChildren.map((link: any) => ({
    id: link.profiles?.id ?? link.child_profile_id,
    full_name: link.profiles?.full_name ?? "Unknown",
  })).filter((c: any) => c.id);

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

  const teacherName = program.teacher_name ?? "No teacher assigned";
  const teacherPhone = program.teacher_phone_number ?? "Phone number not available";

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
    <main className="mx-auto max-w-2xl space-y-4 py-6">
      <Link
        href={backHref}
        className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: primaryColor }}
      >
        ← Back to Programs
      </Link>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <Image
          src={thumbnailSrc}
          alt={`${program.title} thumbnail`}
          width={672}
          height={192}
          className="h-48 w-full object-cover"
          unoptimized={thumbnailSrc.startsWith("data:")}
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
          {!isPaidProgram || !program.price_monthly_cents
            ? "Free"
            : formatMonthlyPrice(program.price_monthly_cents ?? null)}
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
          ) : isParent ? (
            childrenList.length > 0 ? (
              <ChildSelector
                linkedChildren={childrenList}
                programId={program.id}
                slug={slug}
                requiresApplication={true}
                isPaid={isPaidProgram}
                primaryColor={primaryColor}
              />
            ) : (
              <div className="space-y-2 text-center">
                <p className="text-sm text-gray-600">Add a child to your account first.</p>
                <Link
                  href={`/m/${slug}/dashboard`}
                  className="inline-block rounded-xl px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Go to Dashboard
                </Link>
              </div>
            )
          ) : application?.status === "joined" || enrollment ? (
            <div className="space-y-3 text-center">
              <Badge variant="default">Enrolled</Badge>
              <p className="text-sm text-gray-600">You are enrolled in this program.</p>
              <Link
                href={`/m/${slug}/classes/${program.id}`}
                className="block w-full rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Go to Class
              </Link>
              <form action={withdrawFromProgram}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="programId" value={program.id} />
                <SubmitButton pendingText="Withdrawing...">Withdraw</SubmitButton>
              </form>
            </div>
          ) : application?.status === "pending" ? (
            <div className="space-y-3 text-center">
              <Badge variant="secondary">Application Pending</Badge>
              <p className="text-sm text-gray-600">
                Your application has been submitted and is waiting for teacher review.
              </p>
            </div>
          ) : application?.status === "accepted" && !isPaidProgram ? (
            <div className="space-y-3 text-center">
              <Badge variant="default">Accepted!</Badge>
              <p className="text-sm text-gray-600">
                Congratulations! You have been accepted. Confirm your enrollment below.
              </p>
              <form action={joinApprovedFreeProgram}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="programId" value={program.id} />
                <SubmitButton pendingText="Joining...">Confirm Enrollment</SubmitButton>
              </form>
            </div>
          ) : application?.status === "accepted" && isPaidProgram ? (
            hasActiveSubscription ? (
              <div className="space-y-3 text-center">
                <Badge variant="default">Enrolled</Badge>
                <p className="text-sm text-gray-600">
                  Payment active. You are enrolled in this program.
                </p>
                <Link
                  href={`/m/${slug}/classes/${program.id}`}
                  className="block w-full rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Go to Class
                </Link>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <Badge variant="default">Accepted!</Badge>
                <p className="text-sm text-gray-600">
                  You have been accepted. Complete payment to join the class.
                </p>
                <CheckoutButton
                  programId={program.id}
                  slug={slug}
                  primaryColor={primaryColor}
                />
              </div>
            )
          ) : application?.status === "rejected" ? (
            <div className="space-y-3 text-center">
              <Badge variant="destructive">Not Accepted</Badge>
              <p className="text-sm text-gray-600">
                Unfortunately, your application was not approved this time.
              </p>
              <form action={applyToProgram}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="programId" value={program.id} />
                <SubmitButton pendingText="Applying...">Apply Again</SubmitButton>
              </form>
            </div>
          ) : (
            <form action={applyToProgram}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="programId" value={program.id} />
              <SubmitButton pendingText="Applying...">Apply Now</SubmitButton>
            </form>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Contact Teacher</h2>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            <Image
              src={teacherAvatarSrc}
              alt={teacherName}
              width={56}
              height={56}
              className="h-full w-full object-cover"
              unoptimized={teacherAvatarSrc.startsWith("data:")}
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