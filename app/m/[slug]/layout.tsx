import type { ReactNode } from "react";
import { getMosqueBySlug } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";

type TenantLayoutProps = {
  children: ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params;

  // Load the tenant mosque from the URL slug
  const mosque = await getMosqueBySlug(slug);

  // Check if a user is currently authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
        {/* Top Header */}
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-4">
            <p className="text-lg font-semibold tracking-tight">{mosque.name}</p>
            <p className="mt-1 text-xs text-gray-500">Powered by Suluk</p>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-5 pb-20">
          {children}
        </main>

        {/* Bottom Navigation (only if logged in) */}
        {user && <BottomNav slug={slug} />}
      </div>
    </div>
  );
}