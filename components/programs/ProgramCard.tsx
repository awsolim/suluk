import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";

const DEFAULT_PROGRAM_THUMBNAIL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600">
      <rect width="1200" height="600" fill="#f3f4f6" />
      <rect x="60" y="60" width="1080" height="480" rx="32" fill="#e5e7eb" />
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-size="42"
        fill="#6b7280"
      >
        Program Image
      </text>
    </svg>
  `);

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
    ? `CA$${(program.price_monthly_cents / 100).toFixed(0)} / Month`
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
        <Image
          src={program.thumbnail_url || DEFAULT_PROGRAM_THUMBNAIL}
          alt={program.title}
          width={400}
          height={300}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          unoptimized={!(program.thumbnail_url)}
        />

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
