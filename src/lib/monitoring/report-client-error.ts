const reportedSignatures = new Set<string>();

/**
 * Best-effort client-side error reporting, mirroring `logServerError` on the server:
 * never throws, never blocks the caller. Dedupes identical messages within the same
 * page load so a repeating bug (e.g. a failing interval) can't flood the log table.
 */
export function reportClientError(message: string, extra?: { stack?: string; kind?: string }) {
  if (typeof window === "undefined" || !message) {
    return;
  }

  const signature = `${extra?.kind ?? "unknown"}:${message}`;
  if (reportedSignatures.has(signature)) {
    return;
  }
  reportedSignatures.add(signature);

  const payload = JSON.stringify({
    message: message.slice(0, 2000),
    stack: extra?.stack,
    kind: extra?.kind,
    url: window.location.href,
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/client-error", new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
