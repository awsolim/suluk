import Link from "next/link";
import { notFound } from "next/navigation";
import { login } from "@/app/actions/auth";
import { getCachedMosqueBySlug } from "@/lib/supabase/cached-queries";
import SubmitButton from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";

type TenantLoginPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function TenantLoginPage({
  params,
  searchParams,
}: TenantLoginPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const mosque = await getCachedMosqueBySlug(slug);
  if (!mosque) notFound();

  const error = resolvedSearchParams.error;
  const primaryColor = mosque.primary_color ?? "#000000";

  const leftContent = (
    <>
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {mosque.name}
        </h1>
        <p className="mt-4 text-2xl font-medium text-foreground/80">
          Your gateway to spiritual clarity.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to continue your learning journey at {mosque.name}.
        </p>
      </div>

      <blockquote
        className="rounded-2xl border p-6"
        style={{ borderColor: mosque.secondary_color ?? undefined }}
      >
        <p className="text-sm italic text-foreground/70">
          &ldquo;Indeed, in the remembrance of Allah do hearts find rest.&rdquo;
        </p>
        <footer className="mt-2 text-xs text-muted-foreground">
          — Quran 13:28
        </footer>
      </blockquote>
    </>
  );

  return (
    <AuthLayout mosque={mosque} leftContent={leftContent}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to continue.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <GoogleSignInButton
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/m/${slug}/dashboard&slug=${slug}`}
        />

        <AuthDivider />

        <form action={login} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-muted-foreground cursor-default select-none">
                Forgot Password?
              </span>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="h-11"
            />
          </div>

          <SubmitButton
            pendingText="Logging in..."
            style={{ backgroundColor: primaryColor }}
          >
            Log In
          </SubmitButton>
        </form>

        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={`/m/${slug}/signup`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
