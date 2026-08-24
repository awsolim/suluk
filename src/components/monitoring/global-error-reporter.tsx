"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring/report-client-error";

/**
 * Mounted once in the root layout. Catches errors error.tsx boundaries never see —
 * uncaught exceptions in event handlers and unhandled promise rejections — so they
 * land in system_error_logs instead of only ever appearing in the user's own console.
 */
export function GlobalErrorReporter() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      reportClientError(event.message || "Uncaught error", { stack: event.error?.stack, kind: "window.onerror" });
    }
    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unhandled promise rejection";
      reportClientError(message, { stack: reason instanceof Error ? reason.stack : undefined, kind: "unhandledrejection" });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
