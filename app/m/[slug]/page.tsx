import Link from "next/link";
import { notFound } from "next/navigation";
import { getMosqueBySlug } from "@/lib/supabase/queries";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MosqueHomePage({ params }: PageProps) {
  const { slug } = await params;

  // Load the mosque for this tenant slug
  const mosque = await getMosqueBySlug(slug);

  // If no mosque matches the slug, show Next.js 404 page
  if (!mosque) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col px-4 py-8">
      <section className="flex flex-1 flex-col justify-center">
        <div className="space-y-3 text-center">
          <p className="text-sm text-gray-500">Welcome to</p>

          <h1 className="text-3xl font-semibold tracking-tight">
            {mosque.name}
          </h1>

          <p className="text-sm leading-6 text-gray-600">
            Browse available programs, sign in to enroll, and manage your
            classes.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
  href={`/m/${slug}/programs`}
  style={{ color: "white", backgroundColor: "black" }}
  className="block w-full rounded-xl px-4 py-3 text-center text-sm font-medium"
>
  View Programs
</Link>

          <Link
            href={`/m/${slug}/login`}
            className="block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
          >
            Log In
          </Link>

          <Link
            href={`/m/${slug}/signup`}
            className="block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium"
          >
            Sign Up
          </Link>
        </div>
      </section>
    </main>
  );
}