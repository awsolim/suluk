"use client";

import { useState, useTransition } from "react";
import { requestToJoinAsTeacher } from "@/app/actions/teacher-requests";

type RequestStatus = "pending" | "approved" | "rejected" | null;

export function RequestTeacherRoleSection({
  mosqueId,
  initialStatus,
}: {
  mosqueId: string;
  initialStatus: RequestStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<RequestStatus>(initialStatus);

  function handleRequest() {
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
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Teacher Access</h2>

      {status === "pending" ? (
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            Pending approval
          </span>
          <p className="text-sm text-muted-foreground">
            Your request is waiting for admin review.
          </p>
        </div>
      ) : status === "rejected" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your previous request was not approved.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRequest}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
          >
            {isPending ? "Requesting..." : "Request Again"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Want to teach at this mosque? Request teacher access and an admin
            will review your request.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRequest}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
          >
            {isPending ? "Requesting..." : "Request Teacher Role"}
          </button>
        </div>
      )}
    </div>
  );
}
