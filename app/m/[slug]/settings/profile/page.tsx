import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "./EditProfileForm";

type EditProfilePageProps = {
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

export default async function EditProfilePage({
  params,
}: EditProfilePageProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const profile = await getProfileForCurrentUser();

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/settings/profile`)}`
    );
  }

  await getMosqueMembershipForUser(profile.id, mosque.id);

  const primaryColor = mosque.primary_color || "#111827";
  const supabase = await createClient();

  const avatarSrc = profile.avatar_url
    ? supabase.storage.from("media").getPublicUrl(profile.avatar_url).data.publicUrl
    : DEFAULT_AVATAR;

  return (
    <section className="space-y-5">
      <Link
        href={`/m/${slug}/settings`}
        className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: primaryColor }}
      >
        ← Back to Settings
      </Link>

      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update your name and profile photo.
        </p>
      </div>

      <EditProfileForm
        slug={slug}
        initialName={profile.full_name?.trim() || ""}
        initialAvatarSrc={avatarSrc}
        primaryColor={primaryColor}
      />
    </section>
  );
}