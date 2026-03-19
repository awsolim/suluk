export default function StudentClassLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 py-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-8 w-48 animate-pulse rounded bg-gray-200" />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-4 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-36 animate-pulse rounded bg-gray-200" />

        <div className="mt-4 rounded-2xl border border-gray-200 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-gray-200" />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />

        <div className="mt-4 space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-gray-200 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-full animate-pulse rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-4 w-32 animate-pulse rounded bg-gray-200 mx-auto" />
    </main>
  );
}