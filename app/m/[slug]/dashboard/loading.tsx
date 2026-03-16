export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-36 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
      </div>

      <section className="mt-6 rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-gray-200 p-3"
            >
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-6 w-8 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>

        <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-gray-200" />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-6 w-36 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <div className="h-11 w-full animate-pulse rounded-xl bg-gray-200" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-gray-200" />
      </section>
    </main>
  );
}