export default function AdminProgramsLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-44 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />

                <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-200" />

                <div className="mt-4 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              </div>

              <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="h-10 w-28 animate-pulse rounded-xl bg-gray-200" />
              <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200" />
              <div className="h-10 w-16 animate-pulse rounded-xl bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}