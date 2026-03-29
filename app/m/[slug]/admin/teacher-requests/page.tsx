import { notFound, redirect } from "next/navigation";
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
} from "@/lib/supabase/cached-queries";
import { getPendingTeacherRequests } from "@/lib/supabase/queries";
import TeacherRequestsList from "./TeacherRequestsList";

type TeacherRequestsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TeacherRequestsPage({
  params,
}: TeacherRequestsPageProps) {
  const { slug } = await params;

  const mosque = await getCachedMosqueBySlug(slug);
  if (!mosque) notFound();

  const profile = await getCachedProfile();
  if (!profile) {
    redirect(
      `/m/${slug}/login?next=${encodeURIComponent(
        `/m/${slug}/admin/teacher-requests`
      )}`
    );
  }

  const membership = await getCachedMembership(profile.id, mosque.id);
  if (membership?.role !== "mosque_admin") notFound();

  const requests = await getPendingTeacherRequests(mosque.id);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Teacher Requests
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and manage teacher join requests.
        </p>
      </div>

      <TeacherRequestsList requests={requests} mosqueId={mosque.id} />
    </section>
  );
}
