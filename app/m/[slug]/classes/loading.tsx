export default function ClassesLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-200" />
              </div>

              <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}