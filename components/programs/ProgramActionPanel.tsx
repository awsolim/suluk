// components/programs/ProgramActionPanel.tsx
"use client";

import { useMemo, useState } from "react";

type ProgramActionPanelProps = {
  // NEW: server decides if user is enrolled already
  isEnrolled: boolean;

  // NEW: server passes these for contact modal
  teacherName: string;
  teacherEmail: string | null;
  teacherAvatarUrl: string | null;

  // NEW: server actions
  onRegister: () => Promise<void>;
  onWithdraw: () => Promise<void>;
};

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* NEW: backdrop */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose} // NEW: clicking backdrop closes modal
        aria-label="Close modal"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-zinc-900">{title}</div>
          </div>
          <button
            onClick={onClose} // NEW: clear close button
            className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function ProgramActionPanel({
  isEnrolled,
  teacherName,
  teacherEmail,
  teacherAvatarUrl,
  onRegister,
  onWithdraw,
}: ProgramActionPanelProps) {
  const [contactOpen, setContactOpen] = useState(false); // NEW
  const [confirmOpen, setConfirmOpen] = useState(false); // NEW
  const [successOpen, setSuccessOpen] = useState(false); // NEW
  const [busy, setBusy] = useState(false); // NEW

  const confirmTitle = useMemo(
    () => (isEnrolled ? "Withdraw from program?" : "Confirm registration"),
    [isEnrolled]
  );

  async function handleConfirm() {
    setBusy(true); // NEW: disable buttons while action runs
    try {
      if (isEnrolled) {
        await onWithdraw(); // NEW
      } else {
        await onRegister(); // NEW
      }
      setConfirmOpen(false); // NEW
      setSuccessOpen(true); // NEW: show success modal
    } finally {
      setBusy(false); // NEW
    }
  }

  return (
    <>
      <div className="mt-4 space-y-3">
        {/* NEW: register/withdraw -> opens confirm modal */}
        <button
          onClick={() => setConfirmOpen(true)} // NEW
          disabled={busy}
          className={[
            "w-full rounded-full px-5 py-3 text-sm font-semibold shadow-sm",
            isEnrolled
              ? "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
              : "bg-rose-700 text-white hover:bg-rose-800",
            busy ? "opacity-60" : "",
          ].join(" ")}
        >
          {isEnrolled ? "Withdraw" : "Register"}
        </button>

        {/* NEW: contact teacher modal */}
        <button
          onClick={() => setContactOpen(true)} // NEW
          disabled={busy}
          className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
        >
          Contact teacher
        </button>
      </div>

      {/* Confirm modal */}
      <Modal open={confirmOpen} title={confirmTitle} onClose={() => setConfirmOpen(false)}>
        <div className="text-sm text-zinc-700">
          {isEnrolled
            ? "Are you sure you want to withdraw? You can register again anytime."
            : "Are you sure you want to register for this program?"}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setConfirmOpen(false)} // NEW
            disabled={busy}
            className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm} // NEW
            disabled={busy}
            className={[
              "flex-1 rounded-full px-4 py-2 text-sm font-semibold text-white",
              isEnrolled ? "bg-zinc-900 hover:bg-black" : "bg-rose-700 hover:bg-rose-800",
              busy ? "opacity-60" : "",
            ].join(" ")}
          >
            {isEnrolled ? "Withdraw" : "Register"}
          </button>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal
        open={successOpen}
        title="Success"
        onClose={() => setSuccessOpen(false)}
      >
        <div className="flex items-start gap-3">
          {/* NEW: confirmation icon */}
          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            ✓
          </div>
          <div className="text-sm text-zinc-700">
            {isEnrolled
              ? "You have been withdrawn from the program."
              : "You are now registered in the program."}
          </div>
        </div>
      </Modal>

      {/* Contact modal */}
      <Modal
        open={contactOpen}
        title="Contact teacher"
        onClose={() => setContactOpen(false)}
      >
        <div className="flex items-center gap-3">
          {/* NEW: avatar */}
          <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
            {teacherAvatarUrl ? (
              // NEW: simple img is fine here because URL is already public
              <img
                src={teacherAvatarUrl}
                alt={teacherName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-700">
                {teacherName?.slice(0, 1)?.toUpperCase() || "T"}
              </div>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-zinc-900">{teacherName || "Teacher"}</div>
            <div className="text-sm text-zinc-600">{teacherEmail || "No email on file"}</div>
          </div>
        </div>
      </Modal>
    </>
  );
}
