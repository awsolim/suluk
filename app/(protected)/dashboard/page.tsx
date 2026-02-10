import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/auth/getCurrentRole";

/**
 * /dashboard is a role router.
 * It runs on the server and sends the user to their correct home area.
 */
export default async function DashboardPage() {
  const role = await getCurrentRole(); // ✅ server-side role lookup (RLS protected)

  // ✅ Explicit routing for each known role
  if (role === "admin") redirect("/admin");
  if (role === "teacher") redirect("/teacher");
  if (role === "student") redirect("/student");

  // ✅ If role is missing, send user back to login (or a setup page later)
  redirect("/account-setup");
}
