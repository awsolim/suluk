"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring/report-client-error";

export function RouteErrorState({
  error,
  onRetry,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  onRetry: () => void;
  title?: string;
}) {
  useEffect(() => {
    reportClientError(error.message || "Route render error", { stack: error.stack, kind: "error-boundary" });
  }, [error]);

  return (
    <section className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-[var(--workspace)] px-5 py-10 text-[#26323A]">
      <div className="mx-auto w-full max-w-sm rounded-[30px] bg-white p-8 text-center shadow-[0_18px_45px_rgba(38,50,58,0.08)] ring-1 ring-[#E4EAEE]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#C83F31] text-3xl font-semibold text-[#C83F31]">!</div>
        <h1 className="mt-6 text-2xl font-semibold text-[#26323A]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#6B747B]">Something on this page failed to load. You can try again, or come back in a moment.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#26323A] px-7 text-sm font-semibold !text-white shadow-[0_12px_24px_rgba(38,50,58,0.18)]"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
