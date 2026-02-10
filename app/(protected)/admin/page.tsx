import Link from "next/link";
import PageTopActions from "@/components/layout/PageTopActions";

export default function AdminHomePage() {
  return (
    <main className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <PageTopActions showSignOut={true} />

        <h1 className="text-3xl font-semibold text-zinc-900">
          <span className="bg-gradient-to-r from-[#ff2d55] via-[#ff3b30] to-[#ff2d55] bg-clip-text text-transparent">
            Admin Dashboard
          </span>
        </h1>
        <p className="mt-2 text-sm text-zinc-600">Manage users and programs.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/users"
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-lg font-semibold text-zinc-900">Manage users</div>
            <div className="mt-1 text-sm text-zinc-600">View roles, update roles, remove users.</div>
          </Link>

          <Link
            href="/admin/programs/new"
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-lg font-semibold text-zinc-900">Launch new program</div>
            <div className="mt-1 text-sm text-zinc-600">Create a program and assign a teacher + mosque.</div>
          </Link>
        </div>

        <div className="mt-6">
          <Link href="/admin/programs" className="text-sm font-medium text-[#ff3b30] hover:underline">
            View all programs →
          </Link>
        </div>
      </div>
    </main>
  );
}
