import Link from "next/link";
import { notFound } from "next/navigation";
import { signup } from "@/app/actions/auth";
import { getMosqueBySlug } from "@/lib/supabase/queries";
import SubmitButton from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthDivider } from "@/components/auth/AuthDivider";

type TenantSignupPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function TenantSignupPage({
  params,
  searchParams,
}: TenantSignupPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const mosque = await getMosqueBySlug(slug);
  if (!mosque) notFound();

  const error = resolvedSearchParams.error;
  const primaryColor = mosque.primary_color ?? "#000000";

  const leftContent = (
    <>
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Begin Your Journey
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          The Sanctuary for Spiritual Growth.
        </h1>

        <div className="space-y-3 pt-4">
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: mosque.secondary_color ?? undefined }}
          >
            <p className="text-sm font-semibold text-foreground">
              Curated Wisdom
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Access a carefully curated library of Islamic education content
              from qualified teachers.
            </p>
          </div>
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: mosque.secondary_color ?? undefined }}
          >
            <p className="text-sm font-semibold text-foreground">
              Global Community
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect with students and scholars from around the world in a
              supportive learning environment.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{mosque.name}</p>
        <p className="text-xs text-muted-foreground">
          Empowering spiritual education
        </p>
      </div>
    </>
  );

  return (
    <AuthLayout mosque={mosque} leftContent={leftContent}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Create Account
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your path to start exploring {mosque.name}.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <GoogleSignInButton
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/m/${slug}/dashboard&slug=${slug}&role=student`}
        />

        <AuthDivider />

        <form action={signup} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />

          <RoleSelector primaryColor={primaryColor} />

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

          <SubmitButton
            pendingText="Creating account..."
            style={{ backgroundColor: primaryColor }}
          >
            Create Account
          </SubmitButton>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <span className="underline underline-offset-2 cursor-default">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="underline underline-offset-2 cursor-default">
              Privacy Policy
            </span>
            .
          </p>
        </form>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={`/m/${slug}/login`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
