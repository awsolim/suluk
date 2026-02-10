import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Apply to a program (server action via page load for simplicity).
 * - Requires auth
 * - Inserts a pending enrollment for the signed-in student
 * - Respects RLS
 */
export default async function ApplyToProgramPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();

  // Ensure user is signed in
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // If not signed in, send them to login and bring them back here after
  if (userError || !user) {
    redirect(`/login?next=/programs/${params.id}/apply`);
  }

  // Attempt to create the enrollment
  const { error: enrollError } = await supabase.from("enrollments").insert({
    program_id: params.id,
    student_id: user.id,
    status: "pending", // must be pending per RLS policy
  });

  // If user already applied (unique constraint) or RLS blocks it, route them appropriately
  if (enrollError) {
    // 23505 is unique violation in Postgres
    if (enrollError.code === "23505") {
      redirect("/student"); // already applied; student dashboard will show status later
    }

    // Any other error: keep it simple and route to account setup for now
    redirect("/account-setup");
  }

  // Success
  redirect("/student");
}
