import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import AppShellClient from "@/components/AppShellClient";
import BottomNav from "@/components/BottomNav";
import { getNavItems } from "@/lib/nav";

type AppShellProps = {
  role: string;
  slug: string;
  mosque: {
    id: string;
    name: string;
    slug: string;
    primary_color: string | null;
  };
  mosqueLogoSrc: string;
  profile: {
    id: string;
    full_name: string | null;
  };
  membership: {
    role: string;
    can_manage_programs: boolean;
  } | null;
  children: ReactNode;
};

export default function AppShell({
  role,
  slug,
  mosque,
  mosqueLogoSrc,
  profile,
  membership,
  children,
}: AppShellProps) {
  const primaryColor = mosque.primary_color || "#111827";
  const canManagePrograms =
    role === "mosque_admin" ||
    role === "lead_teacher" ||
    (role === "teacher" && (membership?.can_manage_programs ?? false));

  const navItems = getNavItems(role, slug, canManagePrograms);

  const sidebarContent = (
    <Sidebar
      role={role}
      slug={slug}
      mosqueSlug={mosque.slug}
      mosqueName={mosque.name}
      mosqueLogoSrc={mosqueLogoSrc}
      primaryColor={primaryColor}
      profileName={profile.full_name}
      canManagePrograms={canManagePrograms}
    />
  );

  return (
    <AppShellClient
      sidebarContent={sidebarContent}
      navItems={navItems}
      mosqueName={mosque.name}
      mosqueLogoSrc={mosqueLogoSrc}
      primaryColor={primaryColor}
      profileName={profile.full_name}
      role={role}
    >
      {children}

      {/* BottomNav only visible on mobile */}
      <div className="md:hidden">
        <BottomNav slug={slug} />
      </div>
    </AppShellClient>
  );
}
