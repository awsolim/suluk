export default function TeacherProgramDetailLoading() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>

          <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="h-10 w-12 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-10 w-28 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-4 w-48 animate-pulse rounded bg-gray-200" />

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

      <div className="space-y-3">
        <div>
          <div className="h-6 w-36 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-52 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="h-5 w-44 animate-pulse rounded bg-gray-200" />
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
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          </div>

          <div className="mt-4 h-28 w-full animate-pulse rounded-xl bg-gray-200" />
          <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-52 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center"
            >
              <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
              <div className="mt-2 h-4 w-16 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}