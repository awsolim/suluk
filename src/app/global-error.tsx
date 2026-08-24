"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring/report-client-error";

// global-error replaces the root layout when it's the root layout itself that
// crashed, so it can't assume Tailwind/globals.css loaded correctly — inline
// styles only, and its own html/body tags as required by Next.js.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error.message || "Root layout render error", { stack: error.stack, kind: "global-error-boundary" });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#F4F1E8", color: "#26323A" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ maxWidth: 360, textAlign: "center", background: "#ffffff", borderRadius: 24, padding: 32, boxShadow: "0 18px 45px rgba(38,50,58,0.12)" }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6B747B", margin: "0 0 20px" }}>The app failed to load. Please try again.</p>
            <button
              type="button"
              onClick={unstable_retry}
              style={{ minHeight: 44, borderRadius: 999, background: "#26323A", color: "#ffffff", border: "none", padding: "0 24px", fontSize: 14, fontWeight: 600 }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
