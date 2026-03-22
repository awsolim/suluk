"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enrollChildInProgram, applyForChild } from "@/app/actions/parent-enrollment";

interface Child {
  id: string;
  full_name: string;
}

interface ChildSelectorProps {
  children: Child[];
  programId: string;
  slug: string;
  requiresApplication: boolean;
  primaryColor: string;
}

export function ChildSelector({ children, programId, slug, requiresApplication, primaryColor }: ChildSelectorProps) {
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const selectedName = children.find(c => c.id === selectedChild)?.full_name;

  async function handleEnroll() {
    if (!selectedChild) return;
    setError(null);
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("child_profile_id", selectedChild);
    formData.set("program_id", programId);

    const action = requiresApplication ? applyForChild : enrollChildInProgram;
    const result = await action(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(requiresApplication ? "Application submitted!" : "Enrolled successfully!");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4" data-testid="child-selector">
      <p className="text-sm font-medium">Select a child to enroll:</p>

      <div className="space-y-2">
        {children.map((child) => (
          <label
            key={child.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              selectedChild === child.id ? "border-2" : "border-border"
            }`}
            style={selectedChild === child.id ? { borderColor: primaryColor } : undefined}
            data-testid="child-option"
          >
            <input
              type="radio"
              name="child"
              value={child.id}
              checked={selectedChild === child.id}
              onChange={() => setSelectedChild(child.id)}
              className="sr-only"
            />
            <span className="text-sm font-medium">{child.full_name}</span>
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <Button
        onClick={handleEnroll}
        disabled={!selectedChild}
        className="w-full text-white"
        style={{ backgroundColor: selectedChild ? primaryColor : undefined }}
        data-testid={requiresApplication ? "apply-child-button" : "enroll-child-button"}
      >
        {selectedChild
          ? requiresApplication
            ? `Apply for ${selectedName}`
            : `Enroll ${selectedName}`
          : "Select a child first"}
      </Button>
    </div>
  );
}
