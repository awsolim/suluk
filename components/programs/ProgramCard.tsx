import Link from "next/link";
import { Clock } from "lucide-react";

interface ProgramCardProps {
  program: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    audience_gender: string | null;
    age_range_text: string | null;
    is_paid: boolean;
    price_monthly_cents: number | null;
    schedule: unknown;
    tags: string[];
    profiles: { full_name: string; avatar_url: string | null } | null;
  };
  slug: string;
  isEnrolled: boolean;
  hasApplication: boolean;
  primaryColor: string;
}

export function ProgramCard({
  program,
  slug,
  isEnrolled,
  hasApplication,
  primaryColor,
}: ProgramCardProps) {
  const audienceLabel = program.audience_gender === "female"
    ? "SISTERS"
    : program.audience_gender === "male"
    ? "BROTHERS"
    : program.audience_gender === "mixed"
    ? "MIXED"
    : null;

  const ageLabel = program.age_range_text
    ? program.age_range_text.toUpperCase()
    : null;

  const priceLabel = !program.is_paid
    ? "Free"
    : program.price_monthly_cents
    ? `$${(program.price_monthly_cents / 100).toFixed(0)} / Month`
    : null;

  const ctaLabel = isEnrolled
    ? "Enrolled"
    : hasApplication
    ? "Applied"
    : "Enroll Now";

  const isDisabled = isEnrolled || hasApplication;

  return (
    <Link
      href={`/m/${slug}/programs/${program.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      data-testid="program-card"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {program.thumbnail_url ? (
          <img
            src={program.thumbnail_url}
            alt={program.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-4xl text-muted-foreground/30">📚</span>
          </div>
        )}

        {/* Audience badges - top left */}
        <div className="absolute left-2 top-2 flex gap-1">
          {audienceLabel && (
            <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-foreground">
              {audienceLabel}
            </span>
          )}
          {ageLabel && (
            <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-foreground">
              {ageLabel}
            </span>
          )}
        </div>

        {/* Price badge - bottom right */}
        {priceLabel && (
          <span
            className="absolute bottom-2 right-2 rounded px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {priceLabel}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-base font-semibold text-foreground line-clamp-1">
          {program.title}
        </h3>
        {program.profiles && (
          <p className="text-sm text-muted-foreground">
            {program.profiles.full_name}
          </p>
        )}
        {program.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {program.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Ongoing</span>
          </div>
          <span
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{
              backgroundColor: isDisabled ? "#9ca3af" : primaryColor,
            }}
          >
            {ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
