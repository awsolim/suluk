// components/home/AdminHome.tsx
import Link from "next/link";

export default async function AdminHome({ userId }: { userId: string }) {
  // NEW: userId reserved for future admin personalization / metrics (kept to match other dashboards)
  void userId;

  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Manage users and programs.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/users"
            className="rounded-2xl border bg-white p-6 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-base font-semibold text-zinc-900">
              Manage users
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              View students, teachers, and admins. Change roles or remove users.
            </div>
          </Link>

          <Link
            href="/admin/programs/new"
            className="rounded-2xl border bg-white p-6 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-base font-semibold text-zinc-900">
              Launch a new program
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              Create a program and assign a teacher.
            </div>
          </Link>
        </div>

        <div className="mt-6">
          <Link
            href="/admin/programs"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-[#7a0c16] hover:bg-zinc-50"
          >
            View all programs
          </Link>
        </div>
      </div>
    </main>
  );
}
