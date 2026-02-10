import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";

export default async function TeacherPage() {
  const role = await getCurrentRole();
  if (role !== "teacher") redirect("/dashboard");

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Teacher</h1>
        <p className="mt-2 text-sm text-neutral-700">
          This is the teacher dashboard placeholder.
        </p>
      </div>
    </main>
  );
}
