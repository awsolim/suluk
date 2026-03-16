export default function ProgramDetailsLoading() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-48 animate-pulse bg-gray-200" />

        <div className="space-y-2 p-4">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-gray-200" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />

        <div className="mt-4 flex items-center gap-3">
          <div className="h-14 w-14 animate-pulse rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-36 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </section>

      <div className="h-4 w-36 animate-pulse rounded bg-gray-200 mx-auto" />
    </main>
  );
}