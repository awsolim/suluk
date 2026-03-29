import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getCachedMosqueBySlug } from "@/lib/supabase/cached-queries";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const DEFAULT_MOSQUE_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" rx="100" fill="#f3f4f6" />
      <path d="M100 42c-24 0-44 20-44 44v58h88V86c0-24-20-44-44-44Z" fill="#d1d5db" />
      <path d="M78 144V98h44v46" fill="#9ca3af" />
      <circle cx="100" cy="32" r="10" fill="#9ca3af" />
    </svg>
  `);

export default async function MosqueHomePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Load the mosque for this tenant slug.
  const mosque = await getCachedMosqueBySlug(slug);

  // If no mosque matches the slug, show Next.js 404 page.
  if (!mosque) {
    notFound();
  }

  // Authenticated users go straight to dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(`/m/${slug}/dashboard`);
  }

  const mosqueLogoSrc = mosque.logo_url
    ? supabase.storage.from("media").getPublicUrl(mosque.logo_url).data.publicUrl
    : DEFAULT_MOSQUE_LOGO;

  const primaryColor = mosque.primary_color || "#111827";
  const secondaryColor = mosque.secondary_color || "#f9fafb";
  const welcomeTitle = mosque.welcome_title?.trim() || `Welcome to ${mosque.name}`;
  const welcomeDescription =
    mosque.welcome_description?.trim() ||
    "Browse available programs, sign in to enroll, and manage your classes.";

  const features =
    Array.isArray(mosque.features) && mosque.features.length > 0
      ? mosque.features
      : [
          
        ];

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg flex-col px-4 py-6 md:py-12 lg:max-w-xl">
      <section className="flex flex-1 flex-col justify-center">
        <div
          className="rounded-3xl border border-gray-200 px-6 py-10 text-center shadow-sm md:px-10 md:py-14"
          style={{ backgroundColor: secondaryColor }}
        >
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm md:h-24 md:w-24">
            <Image
              src={mosqueLogoSrc}
              alt={mosque.name}
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized={mosqueLogoSrc.startsWith("data:")}
            />
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm text-gray-500">Welcome to</p>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {welcomeTitle}
            </h1>

            <p className="text-sm leading-6 text-gray-600">
              {welcomeDescription}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2 text-left">
            {features.map((feature: string, index: number) => (
              <div
                key={`${feature}-${index}`}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 shadow-sm"
              >
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <Link
              href={`/m/${slug}/programs`}
              style={{ color: "white", backgroundColor: primaryColor }}
              className="block w-full rounded-xl px-4 py-3 text-center text-sm font-medium"
            >
              View Programs
            </Link>

            <Link
              href={`/m/${slug}/login`}
              className="block rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium"
            >
              Log In
            </Link>

            <Link
              href={`/m/${slug}/signup`}
              className="block rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}