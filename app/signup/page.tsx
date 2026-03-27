import Link from "next/link";
import { globalSignup } from "@/app/actions/global-auth";
import SubmitButton from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";

type GlobalSignupPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function GlobalSignupPage({
  searchParams,
}: GlobalSignupPageProps) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Account
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign up to create or join a masjid.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <GoogleSignInButton
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/`}
        />

        <AuthDivider />

        <form action={globalSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="Your full name"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="h-11"
            />
          </div>

          <SubmitButton pendingText="Creating account...">
            Create Account
          </SubmitButton>
        </form>

        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-gray-900 underline underline-offset-4"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
