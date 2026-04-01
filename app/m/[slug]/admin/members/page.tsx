import { notFound, redirect } from "next/navigation";
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
  getCachedMosqueMembers,
} from "@/lib/supabase/cached-queries";
import { isAdminOrTeacher } from "@/lib/permissions";
import MembersTable from "./MembersTable";

type AdminMembersPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminMembersPage({
  params,
}: AdminMembersPageProps) {
  const { slug } = await params;

  const mosque = await getCachedMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const profile = await getCachedProfile();

  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/admin/members`)}`
    );
  }

  const membership = await getCachedMembership(profile.id, mosque.id);

  if (!isAdminOrTeacher(membership?.role)) {
    notFound();
  }

  const members = await getCachedMosqueMembers(mosque.id);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage members of this mosque.
        </p>
      </div>

      <MembersTable
        members={members}
        mosqueId={mosque.id}
        currentProfileId={profile.id}
      />
    </section>
  );
}
