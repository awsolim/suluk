import { requireProgramManageAccess } from "@/lib/programs/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { logServerError } from "@/lib/monitoring/log-error";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ programId: string; eventId: string }> }) {
  try {
    const { programId, eventId } = await params;
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return Response.json({ error: "Not authenticated." }, { status: 401 });
    const supabase = createSupabaseServiceClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
    const access = await requireProgramManageAccess(supabase, programId, user.id);
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
    const { error } = await supabase.from("program_instructor_events").delete().eq("id", eventId).eq("program_id", programId).eq("event_type", "resigned");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear instructor history.";
    await logServerError(createSupabaseServiceClient(), {
      source: "programs.instructors.history.delete",
      message,
      context: { ...(await params) },
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
