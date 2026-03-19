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
};

type StudentRosterClientProps = {
  enrollments: Enrollment[];
};

export default function StudentRosterClient({
  enrollments,
}: StudentRosterClientProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          No students are enrolled in this class yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {enrollments.map((enrollment) => {
          const student = Array.isArray(enrollment.profiles)
            ? enrollment.profiles[0]
            : enrollment.profiles;

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
              className="flex cursor-pointer flex-col items-center text-center transition hover:opacity-80 active:scale-95"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                👤
              </div>

              <h3 className="mt-2 text-sm font-medium leading-tight text-gray-900">
                {studentName}
              </h3>
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
