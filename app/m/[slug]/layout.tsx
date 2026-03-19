import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  getMosqueBySlug,
  getProfileForCurrentUser,
  getMosqueMembershipForUser,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

type TenantLayoutProps = {
  children: ReactNode;
  params: Promise<{
    slug: string;
  }>;
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

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params;

  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mosqueLogoSrc = mosque.logo_url
    ? supabase.storage.from("media").getPublicUrl(mosque.logo_url).data.publicUrl
    : DEFAULT_MOSQUE_LOGO;

  const primaryColor = mosque.primary_color || "#111827";
  const secondaryColor = mosque.secondary_color || "#111827";

  // For authenticated users, load profile and membership for AppShell
  if (user) {
    const profile = await getProfileForCurrentUser();
    const membership = profile
      ? await getMosqueMembershipForUser(profile.id, mosque.id)
      : null;

    const role = membership?.role ?? "student";

    return (
      <div
        className="min-h-screen bg-white text-black"
        style={
          {
            "--primary-color": primaryColor,
            "--secondary-color": secondaryColor,
          } as CSSProperties
        }
      >
        <AppShell
          role={role}
          slug={slug}
          mosque={{
            id: mosque.id,
            name: mosque.name,
            slug: mosque.slug,
            primary_color: mosque.primary_color,
          }}
          mosqueLogoSrc={mosqueLogoSrc}
          profile={{
            id: profile?.id ?? user.id,
            full_name: profile?.full_name ?? null,
          }}
          membership={
            membership
              ? {
                  role: membership.role,
                  can_manage_programs: membership.can_manage_programs,
                }
              : null
          }
        >
          {/* Mobile header - visible only on mobile */}
          <header
            className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur md:hidden"
            style={{ borderTop: `3px solid ${primaryColor}` }}
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                <img
                  src={mosqueLogoSrc}
                  alt={mosque.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight">
                  {mosque.name}
                </p>
                <p className="mt-1 text-xs text-gray-500">Powered by Suluk</p>
              </div>
            </div>
          </header>

          {/* Tablet header - visible on tablet with left padding for hamburger */}
          <header
            className="sticky top-0 z-20 hidden border-b border-gray-200 bg-white/95 backdrop-blur md:block lg:hidden"
            style={{ borderTop: `3px solid ${primaryColor}` }}
          >
            <div className="flex items-center gap-3 px-4 py-4 pl-14">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                <img
                  src={mosqueLogoSrc}
                  alt={mosque.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight">
                  {mosque.name}
                </p>
                <p className="mt-1 text-xs text-gray-500">Powered by Suluk</p>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-6 lg:px-8">
            {children}
          </main>
        </AppShell>
      </div>
    );
  }

  // Unauthenticated users: simple layout with no nav
  return (
    <div
      className="min-h-screen bg-white text-black"
      style={
        {
          "--primary-color": primaryColor,
          "--secondary-color": secondaryColor,
        } as CSSProperties
      }
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white md:max-w-lg lg:max-w-xl">
        <header
          className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur"
          style={{ borderTop: `3px solid ${primaryColor}` }}
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              <img
                src={mosqueLogoSrc}
                alt={mosque.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight">
                {mosque.name}
              </p>
              <p className="mt-1 text-xs text-gray-500">Powered by Suluk</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
