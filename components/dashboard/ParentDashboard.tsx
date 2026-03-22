import { getChildrenForParent, getChildEnrollments, getChildApplications } from "@/lib/supabase/queries";
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

  const childrenWithData = await Promise.all(
    children.map(async (link: any) => {
      const childProfile = link.profiles;
      if (!childProfile) return null;
      const enrollments = await getChildEnrollments(childProfile.id, mosqueId);
      const applications = await getChildApplications(childProfile.id, mosqueId);
      return { child: childProfile, enrollments, applications };
    })
  );

  const validChildren = childrenWithData.filter(Boolean);

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
