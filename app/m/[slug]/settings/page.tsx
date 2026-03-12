import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";

type SettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params; // Read the tenant slug from the route so this page stays mosque-aware.

  const mosque = await getMosqueBySlug(slug); // Load the mosque for this tenant.

  if (!mosque) {
    notFound();
  }

  const profile = await getProfileForCurrentUser(); // Load the current signed-in profile so settings can show account info.

  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/settings`)}`);
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id); // Load the user's mosque-scoped role for role-aware account display.

  const isMosqueAdmin = membership?.role === "mosque_admin"; // Check whether the user is a mosque admin here.
  const isTeacher = membership?.role === "teacher"; // Check whether the user is a teacher here.

  const accountRoleLabel = isMosqueAdmin
    ? "Mosque Admin Account"
    : isTeacher
    ? "Teacher Account"
    : "Student Account"; // Show the highest relevant mosque-scoped role label on the settings profile card.

  const displayName = profile.full_name?.trim() || "User"; // Fall back to a simple generic label if the profile name is empty.

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account and app preferences here.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
            👤
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{displayName}</h2>
            <p className="mt-1 text-sm text-gray-600">{accountRoleLabel}</p>
          </div>
        </div>
      </div>

      {isMosqueAdmin ? (
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-base font-semibold">Admin Tools</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage this mosque’s programs.
          </p>

          <div className="mt-4">
            <Link
              href={`/m/${slug}/admin/programs`}
              className="block rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white"
            >
              Manage Programs
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <form action={logout}>
          <input type="hidden" name="slug" value={slug} />{/* Pass the tenant slug to logout so it redirects to the correct tenant route. */}

          <button
            type="submit"
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
          >
            Log out
          </button>
        </form>
      </div>
    </section>
  );
}