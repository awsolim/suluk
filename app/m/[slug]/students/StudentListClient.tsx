"use client";

import { useState } from "react";
import StudentInfoPanel, {
  type StudentInfo,
} from "@/components/StudentInfoPanel";

type Enrollment = {
  id: string;
  student_profile_id: string;
  created_at: string;
  profiles:
    | {
        full_name: string | null;
        email: string | null;
        phone_number: string | null;
        age: number | null;
        gender: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
        phone_number: string | null;
        age: number | null;
        gender: string | null;
      }[];
  programs:
    | { id: string; title: string }
    | { id: string; title: string }[]
    | null;
};

type StudentListClientProps = {
  enrollments: Enrollment[];
  slug: string;
};

export default function StudentListClient({
  enrollments,
  slug,
}: StudentListClientProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          No students are registered in your classes yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {enrollments.map((enrollment) => {
          const student = Array.isArray(enrollment.profiles)
            ? enrollment.profiles[0]
            : enrollment.profiles;

          const program = Array.isArray(enrollment.programs)
            ? enrollment.programs[0]
            : enrollment.programs;

          const joinedDate = new Date(
            enrollment.created_at
          ).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          const studentName =
            student?.full_name?.trim() ||
            `Student ${enrollment.student_profile_id.slice(0, 8)}`;

          return (
            <button
              key={enrollment.id}
              type="button"
              onClick={() => {
                setSelectedStudent({
                  name: studentName,
                  email: student?.email ?? null,
                  phone: student?.phone_number ?? null,
                  age: student?.age ?? null,
                  gender: student?.gender ?? null,
                  enrollmentDate: enrollment.created_at,
                });
                setSheetOpen(true);
              }}
              className="block w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
            >
              <article className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{studentName}</h2>

                  <p className="mt-2 text-sm text-gray-600">
                    Class: {program?.title ?? "Unknown Program"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Joined: {joinedDate}
                  </p>
                </div>

                <span className="text-lg leading-none text-gray-400">
                  ›
                </span>
              </article>
            </button>
          );
        })}
      </div>

      <StudentInfoPanel
        student={selectedStudent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
