"use client";

import { RouteErrorState } from "@/components/monitoring/route-error-state";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteErrorState error={error} onRetry={unstable_retry} />;
}
