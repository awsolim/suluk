import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { getMosqueBySlug } from "@/lib/tenants";

type TenantSignupPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function TenantSignupPage({
  params,
  searchParams,
}: TenantSignupPageProps) {
  const { slug } = await params; // Unwrap the async route params before using the slug.
  const resolvedSearchParams = await searchParams; // Unwrap the async search params before reading query values.
  const mosque = await getMosqueBySlug(slug); // Load the tenant mosque from the slug.
  const error = resolvedSearchParams.error; // Read the error message from the query string if present.

  return (
    <section className="flex min-h-[70vh] items-center">
      <div className="w-full rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create your {mosque.name} account.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={signup} className="mt-6 space-y-4">
          <input type="hidden" name="slug" value={slug} />

          <div>
            <label
              htmlFor="full_name"
              className="mb-1.5 block text-sm font-medium"
            >
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
          >
            Sign up
          </button>
        </form>

        <p className="mt-5 text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href={`/m/${slug}/login`}
            className="font-medium text-black underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}