// app/(protected)/dashboard/page.tsx
import { redirect } from "next/navigation";

export default function LegacyDashboardRoute() {
  // NEW: keep compatibility if older code links to /dashboard
  redirect("/");
}
