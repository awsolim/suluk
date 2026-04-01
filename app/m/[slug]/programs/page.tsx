import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCachedMosqueBySlug,
  getCachedProfile,
  getCachedMembership,
} from "@/lib/supabase/cached-queries";
import {
  getProgramsByMosqueId,
  getActiveTagsForMosque,
  getEnrollmentsForStudentInMosque,
  getStudentProgramApplicationsInMosque,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { TagFilter } from "@/components/programs/TagFilter";
import { ProgramSearch } from "@/components/programs/ProgramSearch";

export default async function ProgramsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { tag, q } = await searchParams;

  const mosque = await getCachedMosqueBySlug(slug);
  if (!mosque) notFound();

  const primaryColor = mosque.primary_color || "#111827";

  const profile = await getCachedProfile();
  const membership = profile
    ? await getCachedMembership(profile.id, mosque.id)
    : null;

  const supabase = await createClient();
  const isParent = membership?.role === "parent";

  // Parallelize all independent data fetches
  const [rawPrograms, tags, enrollments, applications] = await Promise.all([
    getProgramsByMosqueId(mosque.id),
    getActiveTagsForMosque(mosque.id),
    !isParent && profile
      ? getEnrollmentsForStudentInMosque(profile.id, mosque.id)
      : Promise.resolve([]),
    !isParent && profile
      ? getStudentProgramApplicationsInMosque(profile.id, mosque.id)
      : Promise.resolve([]),
  ]);

  // Resolve storage paths to full public URLs
  const programs = rawPrograms.map((p) => ({
    ...p,
    thumbnail_url: p.thumbnail_url
      ? supabase.storage.from("media").getPublicUrl(p.thumbnail_url).data.publicUrl
      : null,
    profiles: p.teacher_name
      ? { full_name: p.teacher_name, avatar_url: p.teacher_avatar_url }
      : null,
  }));

  // Build lookup sets — both queries return program_id directly on each row
  const enrolledProgramIds = new Set(
    (enrollments || []).map((e: any) => e.program_id)
  );
  const appliedProgramIds = new Set(
    (applications || []).map((a: any) => a.program_id)
  );

  // Apply filters
  let filteredPrograms = programs;
  if (tag) {
    filteredPrograms = filteredPrograms.filter((p: any) =>
      p.tags?.includes(tag)
    );
  }
  if (q) {
    const lower = q.toLowerCase();
    filteredPrograms = filteredPrograms.filter(
      (p: any) =>
        p.title.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower) ||
        p.profiles?.full_name?.toLowerCase().includes(lower)
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Discover Your Path
        </h1>
        <p className="text-muted-foreground">
          Expand your knowledge through our curated selection of spiritual and
          academic programs.
        </p>
      </div>

      {/* Search */}
      <ProgramSearch slug={slug} />

      {/* Tag Filters */}
      {tags.length > 0 && (
        <TagFilter tags={tags} slug={slug} primaryColor={primaryColor} />
      )}

      {/* Guest Banner */}
      {!profile && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          You are browsing programs as a guest.{" "}
          <Link
            href={`/m/${slug}/login`}
            className="font-medium underline"
            style={{ color: primaryColor }}
          >
            Log in
          </Link>{" "}
          or{" "}
          <Link
            href={`/m/${slug}/signup`}
            className="font-medium underline"
            style={{ color: primaryColor }}
          >
            sign up
          </Link>{" "}
          to enroll.
        </div>
      )}

      {/* Program Grid */}
      {filteredPrograms.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No programs found{tag ? ` for "${tag}"` : ""}
          {q ? ` matching "${q}"` : ""}.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program: any) => (
            <ProgramCard
              key={program.id}
              program={program}
              slug={slug}
              isEnrolled={enrolledProgramIds.has(program.id)}
              hasApplication={appliedProgramIds.has(program.id)}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
