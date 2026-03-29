import { getChildrenForParent, getChildEnrollmentsBatch, getChildApplicationsBatch } from "@/lib/supabase/queries";
import { ChildCard } from "./ChildCard";
import { AddChildDialog } from "./AddChildDialog";

interface ParentDashboardProps {
  profileId: string;
  mosqueId: string;
  slug: string;
  primaryColor: string;
}

export async function ParentDashboard({ profileId, mosqueId, slug, primaryColor }: ParentDashboardProps) {
  const children = await getChildrenForParent(profileId, mosqueId);

  const childProfiles = children
    .map((link: any) => link.profiles)
    .filter(Boolean);

  const childIds = childProfiles.map((p: any) => p.id);

  // Batch: 2 queries instead of 2N
  const [allEnrollments, allApplications] = await Promise.all([
    getChildEnrollmentsBatch(childIds, mosqueId),
    getChildApplicationsBatch(childIds, mosqueId),
  ]);

  const validChildren = childProfiles.map((childProfile: any) => ({
    child: childProfile,
    enrollments: allEnrollments.filter((e: any) => e.student_profile_id === childProfile.id),
    applications: allApplications.filter((a: any) => a.student_profile_id === childProfile.id),
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Children</h1>
          <p className="text-muted-foreground">
            Manage your children&apos;s enrollments and applications.
          </p>
        </div>
        <AddChildDialog slug={slug} primaryColor={primaryColor} />
      </div>

      {validChildren.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No children added yet.</p>
          <AddChildDialog slug={slug} primaryColor={primaryColor} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {validChildren.map((data: any) => (
            <ChildCard
              key={data.child.id}
              child={data.child}
              enrollments={data.enrollments}
              applications={data.applications}
              slug={slug}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
