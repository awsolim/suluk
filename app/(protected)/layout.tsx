// app/(protected)/layout.tsx
import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  // NEW: Removed the shared protected top bar.
  // Each page now renders only the top buttons it needs (sign out / back).
  return (
    <div className="min-h-screen bg-zinc-50">
      <AppShell>{children}</AppShell>
    </div>
  );
}
