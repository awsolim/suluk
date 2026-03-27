"use client";

import { useState } from "react";
import { GraduationCap, Users } from "lucide-react";

interface RoleSelectorProps {
  primaryColor: string;
}

export function RoleSelector({ primaryColor }: RoleSelectorProps) {
  const [role, setRole] = useState<"student" | "parent">("student");

  return (
    <>
      <input type="hidden" name="role" value={role} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole("student")}
          className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
          style={{
            borderColor: role === "student" ? primaryColor : "var(--border)",
            backgroundColor: role === "student" ? `${primaryColor}08` : "transparent",
          }}
          data-testid="role-student"
        >
          <GraduationCap className="h-6 w-6" style={{ color: role === "student" ? primaryColor : undefined }} />
          <span className="text-sm font-medium">STUDENT</span>
        </button>
        <button
          type="button"
          onClick={() => setRole("parent")}
          className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
          style={{
            borderColor: role === "parent" ? primaryColor : "var(--border)",
            backgroundColor: role === "parent" ? `${primaryColor}08` : "transparent",
          }}
          data-testid="role-parent"
        >
          <Users className="h-6 w-6" style={{ color: role === "parent" ? primaryColor : undefined }} />
          <span className="text-sm font-medium">PARENT</span>
        </button>
      </div>
    </>
  );
}
