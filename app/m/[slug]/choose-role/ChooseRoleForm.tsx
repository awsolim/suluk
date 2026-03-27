"use client";

import { useState, useTransition } from "react";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import { assignRole } from "@/app/actions/auth";

type Role = "student" | "parent" | "teacher";

const roles: Array<{
  value: Role;
  label: string;
  description: string;
  icon: typeof GraduationCap;
}> = [
  {
    value: "student",
    label: "Student",
    description: "Enroll in programs and track your progress.",
    icon: GraduationCap,
  },
  {
    value: "parent",
    label: "Parent",
    description: "Manage your children's enrollments.",
    icon: Users,
  },
  {
    value: "teacher",
    label: "Teacher",
    description: "Teach classes (requires admin approval).",
    icon: BookOpen,
  },
];

interface ChooseRoleFormProps {
  slug: string;
  mosqueId: string;
  primaryColor: string;
}

export function ChooseRoleForm({
  slug,
  mosqueId,
  primaryColor,
}: ChooseRoleFormProps) {
  const [selected, setSelected] = useState<Role>("student");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("slug", slug);
      formData.set("mosqueId", mosqueId);
      formData.set("role", selected);
      await assignRole(formData);
    });
  }

  return (
    <div className="space-y-4">
      {roles.map(({ value, label, description, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setSelected(value)}
          className="flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors"
          style={{
            borderColor: selected === value ? primaryColor : "#e5e7eb",
            backgroundColor:
              selected === value ? `${primaryColor}08` : "transparent",
          }}
        >
          <Icon
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: selected === value ? primaryColor : "#6b7280" }}
          />
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          </div>
        </button>
      ))}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-70"
        style={{ backgroundColor: primaryColor }}
      >
        {isPending ? "Joining..." : "Continue"}
      </button>
    </div>
  );
}
