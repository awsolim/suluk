import { redirect } from "next/navigation";
import { createMosque } from "@/app/actions/mosques";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type CreateMasjidPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CreateMasjidPage({
  searchParams,
}: CreateMasjidPageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create a Masjid
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Set up a new masjid portal. You will become the admin.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={createMosque} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Masjid Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Masjid Al-Noor"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              name="slug"
              type="text"
              required
              placeholder="e.g. al-noor"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="Lowercase letters, numbers, and hyphens only"
              className="h-11"
            />
            <p className="text-xs text-gray-500">
              Your portal will be at /m/your-slug
            </p>
          </div>

          <SubmitButton pendingText="Creating masjid...">
            Create Masjid
          </SubmitButton>
        </form>

        <p className="text-sm text-gray-600">
          <Link
            href="/"
            className="font-medium text-gray-900 underline underline-offset-4"
          >
            Back to directory
          </Link>
        </p>
      </div>
    </main>
  );
}
