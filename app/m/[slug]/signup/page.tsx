import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { getMosqueBySlug } from "@/lib/tenants";
import SubmitButton from "@/components/ui/SubmitButton";

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
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const mosque = await getMosqueBySlug(slug);
  const error = resolvedSearchParams.error;

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
              htmlFor="phone_number"
              className="mb-1.5 block text-sm font-medium"
            >
              Phone number
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="age" className="mb-1.5 block text-sm font-medium">
              Age
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min="1"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="gender" className="mb-1.5 block text-sm font-medium">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none focus:border-black"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
<option value="female">Female</option>
            </select>
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

          <SubmitButton pendingText="Signing Up...">Sign Up</SubmitButton>
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