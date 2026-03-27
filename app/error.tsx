"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </p>
        {error.digest ? (
          <p className="text-xs text-gray-400">Digest: {error.digest}</p>
        ) : null}
        <button
          onClick={reset}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
