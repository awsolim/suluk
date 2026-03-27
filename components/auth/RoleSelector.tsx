"use client";

import { useState } from "react";
import { BookOpen, GraduationCap, Users } from "lucide-react";

type Role = "student" | "parent" | "teacher";

interface RoleSelectorProps {
  primaryColor: string;
}

export function RoleSelector({ primaryColor }: RoleSelectorProps) {
  const [role, setRole] = useState<Role>("student");

  const roles: Array<{ value: Role; label: string; icon: typeof GraduationCap; testId: string }> = [
    { value: "student", label: "STUDENT", icon: GraduationCap, testId: "role-student" },
    { value: "parent", label: "PARENT", icon: Users, testId: "role-parent" },
    { value: "teacher", label: "TEACHER", icon: BookOpen, testId: "role-teacher" },
  ];

  return (
    <>
      <input type="hidden" name="role" value={role} />
      <div className="grid grid-cols-3 gap-3">
        {roles.map(({ value, label, icon: Icon, testId }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
            style={{
              borderColor: role === value ? primaryColor : "var(--border)",
              backgroundColor: role === value ? `${primaryColor}08` : "transparent",
            }}
            data-testid={testId}
          >
            <Icon className="h-6 w-6" style={{ color: role === value ? primaryColor : undefined }} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
