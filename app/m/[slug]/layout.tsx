import type { CSSProperties, ReactNode } from "react";
import { getMosqueBySlug } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";

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

  // Load the tenant mosque from the URL slug.
  const mosque = await getMosqueBySlug(slug);

  // Check if a user is currently authenticated.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mosqueLogoSrc = mosque.logo_url
    ? supabase.storage.from("media").getPublicUrl(mosque.logo_url).data.publicUrl
    : DEFAULT_MOSQUE_LOGO;

  const primaryColor = mosque.primary_color || "#111827";
  const secondaryColor = mosque.secondary_color || "#111827";

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
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
        {/* Top Header */}
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

        {/* Page Content */}
        <main className="flex-1 px-4 py-5 pb-20">{children}</main>

        {/* Bottom Navigation (only if logged in) */}
        {user && <BottomNav slug={slug} />}
      </div>
    </div>
  );
}