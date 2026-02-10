import { notFound } from "next/navigation";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import BackLink from "@/components/layout/BackLink";

type PageProps = {
  params: { id: string };
};

export default async function ProgramDetailsPage({ params }: PageProps) {
  // Guard against invalid or missing IDs
  if (!params?.id) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  const { data: program, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      title,
      description,
      location,
      thumbnail_path,
      is_active,
      lead_teacher:profiles!programs_lead_teacher_id_fkey (
        full_name,
        avatar_path
      )
    `
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !program) {
    return (
      <div className="min-h-screen bg-white">
        <BackLink href="/programs" label="Back to programs" />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold text-black">
            Program not found
          </h1>
          <p className="mt-2 text-sm text-black/70">
            This program may be inactive or no longer publicly listed.
          </p>
        </div>
      </div>
    );
  }

  // Normalize teacher relation (Supabase may return array or object)
  const teacher = Array.isArray(program.lead_teacher)
    ? program.lead_teacher[0]
    : program.lead_teacher;

  const teacherName = teacher?.full_name ?? "Teacher";
  const teacherAvatarPath = teacher?.avatar_path ?? null;
  const thumbnailPath = program.thumbnail_path ?? null;

  return (
    <div className="min-h-screen bg-white">
      <BackLink href="/programs" label="Back to programs" />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="relative h-64 w-full bg-black/5">
            {thumbnailPath ? (
              <Image
                src={thumbnailPath}
                alt={program.title}
                fill
                className="object-cover"
                priority
              />
            ) : null}
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-semibold text-black">
              {program.title}
            </h1>

            <p className="mt-3 text-black/80">
              {program.description}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-black/10">
                {teacherAvatarPath ? (
                  <Image
                    src={teacherAvatarPath}
                    alt={teacherName}
                    fill
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="text-sm">
                <div className="font-medium text-black">
                  Led by {teacherName}
                </div>
                {program.location ? (
                  <div className="text-black/60">
                    {program.location}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8">
              <a
                href={`/programs/${program.id}/apply`}
                className="inline-flex items-center rounded-xl bg-red-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-800"
              >
                Apply to this program
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
