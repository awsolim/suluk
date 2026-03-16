export default function SettingsLoading() {
  return (
    <section className="space-y-5 animate-pulse">
      <div>
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-3 h-8 w-28 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-200" />

            <div className="min-w-0">
              <div className="h-6 w-32 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-24 rounded bg-gray-200" />
              <div className="mt-3 h-4 w-20 rounded bg-gray-200" />
            </div>
          </div>

          <div className="h-5 w-5 rounded bg-gray-200" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-40 rounded bg-gray-200" />
        <div className="mt-4 h-11 w-full rounded-xl bg-gray-200" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-11 w-full rounded-xl bg-gray-200" />
      </div>
    </section>
  );
}