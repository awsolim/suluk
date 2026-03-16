export default function ProgramsLoading() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="h-4 w-44 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-gray-200" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="h-40 animate-pulse bg-gray-200" />

            <div className="flex items-start justify-between p-4 pt-8">
              <div className="min-w-0 flex-1">
                <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-200" />
              </div>

              <div className="ml-3 h-5 w-5 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}