export default function StudentsLoading() {
  return (
    <section className="space-y-5 animate-pulse">
      <div>
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-3 h-8 w-28 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-10 rounded bg-gray-200" />
          </div>

          <div>
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-10 rounded bg-gray-200" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-5 w-36 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-44 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-28 rounded bg-gray-200" />
              </div>

              <div className="h-5 w-5 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}