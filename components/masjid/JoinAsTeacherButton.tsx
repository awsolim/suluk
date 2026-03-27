"use client";

import { useTransition } from "react";
import { requestToJoinAsTeacher } from "@/app/actions/teacher-requests";

export function JoinAsTeacherButton({ mosqueId }: { mosqueId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await requestToJoinAsTeacher(mosqueId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
    >
      {isPending ? "Requesting..." : "Join as Teacher"}
    </button>
  );
}
