import { notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProgramsByMosqueId,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import CardAction from "@/components/ui/CardAction";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Added: fallback thumbnail image so the card still looks complete
// when a program does not have a thumbnail path saved in the database.
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

// Added: fallback avatar image so the teacher avatar circle still renders
// even when no avatar path exists in the database.
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#e5e7eb" />
      <circle cx="100" cy="78" r="34" fill="#9ca3af" />
      <path d="M45 165c10-30 36-46 55-46s45 16 55 46" fill="#9ca3af" />
    </svg>
  `);

export default async function ProgramsPage({ params }: PageProps) {
  const { slug } = await params;

  // Added: create a server-side Supabase client so we can convert
  // storage paths like "thumbnails/thumbnail.jfif" into real public URLs.
  const supabase = await createClient();

  // Load the current mosque from the tenant slug
  const mosque = await getMosqueBySlug(slug);

  // Show 404 if the mosque slug is invalid
  if (!mosque) {
    notFound();
  }

  // Load only programs that belong to this mosque
  // Important: this helper should return:
  // - thumbnail_url
  // - teacher_name
  // - teacher_avatar_url
  const programs = await getProgramsByMosqueId(mosque.id);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 space-y-1">
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Programs</h1>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            No programs are available right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => {
            // Added: convert the saved thumbnail storage path into a real public URL.
            // Example DB value: "thumbnails/thumbnail.jfif"
            const thumbnailSrc = program.thumbnail_url
              ? supabase.storage.from("media").getPublicUrl(program.thumbnail_url)
                  .data.publicUrl
              : DEFAULT_PROGRAM_THUMBNAIL;

            // Added: convert the saved avatar storage path into a real public URL.
            // Example DB value: "avatars/sheikh.jfif"
            const teacherAvatarSrc = program.teacher_avatar_url
              ? supabase.storage
                  .from("media")
                  .getPublicUrl(program.teacher_avatar_url).data.publicUrl
              : DEFAULT_AVATAR;

            // Added: use a fallback teacher label if no teacher is assigned.
            const teacherName = program.teacher_name || "Teacher not assigned";

            return (
              <article
                key={program.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                {/* Added: thumbnail area at the top of the card. */}
                <div className="relative">
                  <img
                    src={thumbnailSrc}
                    alt={`${program.title} thumbnail`}
                    className="h-40 w-full object-cover"
                  />

                  {/* Added: overlapping circular teacher avatar. */}
                  <div className="absolute -bottom-6 left-4 h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-gray-100 shadow-sm">
                    <img
                      src={teacherAvatarSrc}
                      alt={teacherName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Added: extra top padding so content clears the overlapping avatar. */}
                <div className="p-4 pt-8">
                  {/* Added: teacher name under the media area. */}
                  <p className="mb-2 text-sm text-gray-500">{teacherName}</p>

                  <h2 className="text-base font-semibold">{program.title}</h2>

                  {program.description ? (
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {program.description}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <CardAction href={`/m/${slug}/programs/${program.id}`}>
                      View Details
                    </CardAction>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}