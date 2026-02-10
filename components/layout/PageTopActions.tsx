// components/layout/PageTopActions.tsx
import Link from "next/link";
import SignOutButton from "@/components/auth/SignOutButton";

type PageTopActionsProps = {
  showSignOut?: boolean;
  showBackToDashboard?: boolean; // NEW: show a generic back-to-dashboard button
  backHref?: string; // NEW: explicit back link (used by admin/teacher pages)
  backLabel?: string; // NEW: optional label override
};

export default function PageTopActions({
  showSignOut = false,
  showBackToDashboard = false,
  backHref,
  backLabel,
}: PageTopActionsProps) {
  // NEW: choose which back button to show (explicit backHref wins)
  const resolvedBackHref = backHref ?? (showBackToDashboard ? "/dashboard" : null); // NEW
  const resolvedBackLabel = backLabel ?? "Back to dashboard"; // NEW

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        {resolvedBackHref ? (
          <Link
            href={resolvedBackHref}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            {resolvedBackLabel}
          </Link>
        ) : (
          <div />
        )}
      </div>

      <div>{showSignOut ? <SignOutButton /> : null}</div>
    </div>
  );
}
