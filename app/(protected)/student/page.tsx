// app/(protected)/student/page.tsx
import { redirect } from "next/navigation";

export default function StudentDashboardCompat() {
  // NEW: dashboard is "/" now (smart home). Keep this route only for compatibility.
  redirect("/");
}
