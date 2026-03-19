"use client";

import { type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MenuIcon } from "lucide-react";
import SidebarIcon from "@/components/SidebarIcon";
import { getRoleLabel } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";

type AppShellClientProps = {
  sidebarContent: ReactNode;
  children: ReactNode;
  navItems: NavItem[];
  mosqueName: string;
  mosqueLogoSrc: string;
  primaryColor: string;
  profileName: string | null;
  role: string;
};

export default function AppShellClient({
  sidebarContent,
  children,
  navItems,
  mosqueName,
  mosqueLogoSrc,
  primaryColor,
  profileName,
  role,
}: AppShellClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const roleLabel = getRoleLabel(role);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar - always visible on lg+ at 240px */}
      <aside data-testid="sidebar" className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
        {sidebarContent}
      </aside>

      {/* Tablet sidebar - Sheet overlay triggered by hamburger, hidden on mobile and desktop */}
      <div className="hidden md:block lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="fixed left-3 top-3 z-40"
                aria-label="Toggle sidebar"
              />
            }
          >
            <MenuIcon className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {/* Inline sidebar nav for tablet sheet */}
            <div className="flex h-full flex-col">
              {/* Mosque branding */}
              <div className="flex items-center gap-3 px-4 py-5">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                  <img
                    src={mosqueLogoSrc}
                    alt={mosqueName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="truncate text-sm font-semibold">
                  {mosqueName}
                </span>
              </div>

              <Separator />

              {/* Nav links */}
              <nav className="flex-1 space-y-1 px-2 py-3">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== pathname &&
                      pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                      style={isActive ? { color: primaryColor } : undefined}
                    >
                      <SidebarIcon type={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <Separator />

              {/* User info */}
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {profileName
                      ? profileName.charAt(0).toUpperCase()
                      : "?"}
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
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
