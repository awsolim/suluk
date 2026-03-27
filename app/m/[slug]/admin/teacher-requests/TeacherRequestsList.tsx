"use client";

import { useTransition } from "react";
import {
  approveTeacherRequest,
  rejectTeacherRequest,
} from "@/app/actions/teacher-requests";

type TeacherRequest = {
  id: string;
  mosque_id: string;
  profile_id: string;
  status: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

export default function TeacherRequestsList({
  requests,
  mosqueId,
}: {
  requests: TeacherRequest[];
  mosqueId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleApprove(requestId: string) {
    startTransition(async () => {
      const result = await approveTeacherRequest(requestId, mosqueId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  function handleReject(requestId: string) {
    startTransition(async () => {
      const result = await rejectTeacherRequest(requestId, mosqueId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">No pending teacher requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                {request.profile?.full_name || "Unknown"}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {request.profile?.email || "No email"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Requested{" "}
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              pending
            </span>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleApprove(request.id)}
              className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleReject(request.id)}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
