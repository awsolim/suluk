import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";

export default async function AdminHomePage() {
  const role = await getCurrentRole(); // Server-side role check (RLS-safe)
  if (role !== "admin") redirect("/dashboard"); // Important: only admins can view

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-black">Admin</h1>
      <p className="mt-1 text-sm text-black/70">
        Manage users, roles, and programs.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="text-sm font-semibold text-black">Users</div>
          <div className="mt-1 text-sm text-black/70">
            View all users and change roles.
          </div>
          <div className="mt-4 inline-flex rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">
            Open
          </div>
        </Link>

        <Link
          href="/admin/programs"
          className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="text-sm font-semibold text-black">Programs</div>
          <div className="mt-1 text-sm text-black/70">
            Add and manage Quran memorization programs.
          </div>
          <div className="mt-4 inline-flex rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">
            Open
          </div>
        </Link>
      </div>
    </div>
  );
}
