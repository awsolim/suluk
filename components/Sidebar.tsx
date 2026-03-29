import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SidebarIcon from "@/components/SidebarIcon";
import { getNavItems, getRoleLabel } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";

type SidebarProps = {
  role: string;
  slug: string;
  mosqueSlug: string;
  mosqueName: string;
  mosqueLogoSrc: string;
  primaryColor: string;
  profileName: string | null;
  canManagePrograms: boolean;
};

export default function Sidebar({
  role,
  slug,
  mosqueName,
  mosqueLogoSrc,
  primaryColor,
  profileName,
  canManagePrograms,
}: SidebarProps) {
  const navItems = getNavItems(role, slug, canManagePrograms);
  const roleLabel = getRoleLabel(role);

  return (
    <div className="flex h-full flex-col">
      {/* Mosque branding */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
          <Image
            src={mosqueLogoSrc}
            alt={mosqueName}
            width={36}
            height={36}
            className="h-full w-full object-cover"
            unoptimized={mosqueLogoSrc.startsWith("data:")}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {mosqueName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Community Portal
          </p>
        </div>
      </div>

      <Separator />

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <SidebarIcon type={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <Separator />

      {/* User info + role at bottom */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {profileName ? profileName.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">
              {profileName ?? "User"}
            </p>
            <Badge variant="secondary" className="mt-1">
              {roleLabel}
            </Badge>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground px-4 py-2">Powered by Tareeqah</p>
    </div>
  );
}

export type { SidebarProps };
