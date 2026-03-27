"use client";

import { useState, useTransition } from "react";
import { requestToJoinAsTeacher } from "@/app/actions/teacher-requests";

type RequestStatus = "pending" | "approved" | "rejected" | null;

export function JoinAsTeacherButton({
  mosqueId,
  initialStatus = null,
}: {
  mosqueId: string;
  initialStatus?: RequestStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<RequestStatus>(initialStatus);

  if (status === "pending") {
    return (
      <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
        Pending approval
      </span>
    );
  }

  if (status === "approved") {
    return (
      <span className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
        Approved
      </span>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await requestToJoinAsTeacher(mosqueId);
      if (result.error) {
        alert(result.error);
      } else {
        setStatus("pending");
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
