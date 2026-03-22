import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ChildCardProps {
  child: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    gender: string | null;
  };
  enrollments: Array<{ programs: { title: string } | null }>;
  applications: Array<{ status: string; programs: { title: string } | null }>;
  slug: string;
  primaryColor: string;
}

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function ChildCard({ child, enrollments, applications, slug, primaryColor }: ChildCardProps) {
  const age = child.date_of_birth ? computeAge(child.date_of_birth) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4" data-testid="child-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{child.full_name}</h3>
          <p className="text-sm text-muted-foreground">
            {age !== null && `${age} years old`}
            {age !== null && child.gender && " · "}
            {child.gender && child.gender.charAt(0).toUpperCase() + child.gender.slice(1)}
          </p>
        </div>
        <Link
          href={`/m/${slug}/programs`}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Enroll {child.full_name.split(" ")[0]}
        </Link>
      </div>

      {/* Enrollments */}
      {enrollments.length > 0 && (
        <div data-testid="enrollment-info">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Enrolled</p>
          <div className="space-y-1">
            {enrollments.map((e, i) => (
              <p key={i} className="text-sm">{e.programs?.title}</p>
            ))}
          </div>
        </div>
      )}

      {/* Applications */}
      {applications.length > 0 && (
        <div data-testid="application-status">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Applications</p>
          <div className="space-y-1">
            {applications.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{a.programs?.title}</span>
                <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
