import { notFound, redirect } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
  getEnrollmentsForTeacherProgramsInMosque,
} from "@/lib/supabase/queries";
import StudentListClient from "./StudentListClient";

type TeacherStudentsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TeacherStudentsPage({
  params,
}: TeacherStudentsPageProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const profile = await getProfileForCurrentUser();

  if (!profile) {
    redirect(`/m/${slug}/login?next=${encodeURIComponent(`/m/${slug}/students`)}`);
  }

  const membership = await getMosqueMembershipForUser(profile.id, mosque.id);

  if (!membership || membership.role !== "teacher") {
    notFound();
  }

  const enrollments = await getEnrollmentsForTeacherProgramsInMosque(
    profile.id,
    mosque.id
  );

  const totalStudents = enrollments.length;

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-gray-500">{mosque.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        <p className="mt-1 text-sm text-gray-600">
          View students registered across all of your classes.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="mt-1 text-2xl font-semibold">{totalStudents}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Classes Covered</p>
            <p className="mt-1 text-2xl font-semibold">
              {new Set(
                enrollments
                  .map((enrollment) => {
                    const program = Array.isArray(enrollment.programs)
                      ? enrollment.programs[0]
                      : enrollment.programs;

                    return program?.id ?? "";
                  })
                  .filter(Boolean)
              ).size}
            </p>
          </div>
        </div>
      </div>

      <StudentListClient enrollments={enrollments as any} slug={slug} />
    </section>
  );
}