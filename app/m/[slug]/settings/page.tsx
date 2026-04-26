import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
} from "@/lib/supabase/cached-queries";
import { getTeacherRequestForUser } from "@/lib/supabase/queries";
import { getRoleLabel } from "@/lib/nav";
import { logout } from "@/app/actions/auth";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { PersonalInfoForm } from "@/components/settings/PersonalInfoForm";
import { RequestTeacherRoleSection } from "@/components/masjid/RequestTeacherRoleSection";
import { Button } from "@/components/ui/button";
import StripeConnectButton from "@/components/StripeConnectButton";
import { unstable_cache } from "next/cache";

const getCachedStripeStatus = unstable_cache(
  async (stripeAccountId: string) => {
    const { stripe } = await import("@/lib/stripe");
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      return account.charges_enabled ? "connected" as const : "pending" as const;
    } catch {
      return "not_started" as const;
    }
  },
  ["stripe-status"],
  { tags: ["stripe-status"], revalidate: 3600 }
);

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ complete_profile?: string }>;
}) {
  const { slug } = await params;
  const { complete_profile } = await searchParams;
  const mosque = await getCachedMosqueBySlug(slug);
  if (!mosque) redirect("/");

  const profile = await getCachedProfile();
  if (!profile) redirect(`/m/${slug}/login`);

  const membership = await getCachedMembership(profile.id, mosque.id);
  const role = membership?.role || "student";
  const roleLabel = getRoleLabel(role);
  const primaryColor = mosque.primary_color || "#111827";

  const canRequestTeacher = role === "student" || role === "parent";
  const teacherRequest = canRequestTeacher
    ? await getTeacherRequestForUser(profile.id, mosque.id)
    : null;

  let stripeStatus: "not_started" | "pending" | "connected" = "not_started";
  if (role === "mosque_admin" && mosque.stripe_account_id) {
    stripeStatus = await getCachedStripeStatus(mosque.stripe_account_id);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and account preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Personal Information</h2>
            <PersonalInfoForm
              profile={profile}
              slug={slug}
              primaryColor={primaryColor}
              showCompletionBanner={!profile.gender || complete_profile === "1"}
            />
          </div>

          {/* Teacher Access — visible to students and parents */}
          {canRequestTeacher && (
            <RequestTeacherRoleSection
              mosqueId={mosque.id}
              initialStatus={teacherRequest?.status ?? null}
            />
          )}

          {/* Admin — Payments & Tools */}
          {role === "mosque_admin" && (
            <>
              {/* Payments */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-1 text-lg font-semibold">Payments</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Connect a Stripe account to accept payments for paid programs.
                </p>
                <StripeConnectButton
                  mosqueId={mosque.id}
                  slug={slug}
                  stripeStatus={stripeStatus}
                  primaryColor={primaryColor}
                />
              </div>

              {/* Admin Tools */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold">Admin Tools</h2>
                <div className="space-y-3">
                  <Link
                    href={`/m/${slug}/admin/programs`}
                    className="block rounded-lg border border-border p-3 text-sm hover:bg-muted"
                  >
                    Manage Programs
                  </Link>
                  <Link
                    href={`/m/${slug}/admin/members`}
                    className="block rounded-lg border border-border p-3 text-sm hover:bg-muted"
                  >
                    Manage Members
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <ProfileCard
            profile={profile}
            roleLabel={roleLabel}
            primaryColor={primaryColor}
          />
        </div>
      </div>

      {/* Logout */}
      <form action={logout}>
        <input type="hidden" name="slug" value={slug} />
        <Button variant="outline" type="submit" className="text-destructive">
          Log Out
        </Button>
      </form>
    </div>
  );
}
