import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/ui/SubmitButton";

type SettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#e5e7eb" />
      <circle cx="100" cy="78" r="34" fill="#9ca3af" />
      <path d="M45 165c10-30 36-46 55-46s45 16 55 46" fill="#9ca3af" />
    </svg>
  `);

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const profile = await getProfileForCurrentUser();

  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/settings`)}`);
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id);
  const primaryColor = mosque.primary_color || "#111827";

  const isMosqueAdmin = membership?.role === "mosque_admin";
  const isTeacher = membership?.role === "teacher";

  const accountRoleLabel = isMosqueAdmin
    ? "Mosque Admin Account"
    : isTeacher
    ? "Teacher Account"
    : "Student Account";

  const displayName = profile.full_name?.trim() || "User";

  const supabase = await createClient();

  const avatarSrc = profile.avatar_url
    ? supabase.storage.from("media").getPublicUrl(profile.avatar_url).data.publicUrl
    : DEFAULT_AVATAR;

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account and app preferences here.
        </p>
      </div>

      <Link
        href={`/m/${slug}/settings/profile`}
        className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
      >
        <article className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              <img
                src={avatarSrc}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">{displayName}</h2>
              <p className="mt-1 text-sm text-gray-600">{accountRoleLabel}</p>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Edit Profile
              </p>
            </div>
          </div>

          <span className="text-lg leading-none text-gray-400">›</span>
        </article>
      </Link>

      {isMosqueAdmin ? (
        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-base font-semibold">Admin Tools</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage this mosque’s programs.
          </p>

          <div className="mt-4">
            <Link
              href={`/m/${slug}/admin/programs`}
              className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Manage Programs
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <form action={logout}>
          <input type="hidden" name="slug" value={slug} />

          <SubmitButton pendingText="Logging out...">Log Out</SubmitButton>
        </form>
      </div>
    </section>
  );
}