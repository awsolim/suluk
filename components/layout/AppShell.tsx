// components/layout/AppShell.tsx
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  // NEW: simple consistent page container shell (no sticky behavior)
  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-8">
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
