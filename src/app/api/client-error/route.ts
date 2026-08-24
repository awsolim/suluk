import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { logServerError } from "@/lib/monitoring/log-error";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type ClientErrorBody = {
  message?: string;
  stack?: string;
  url?: string;
  kind?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ClientErrorBody;
  const message = body.message?.trim();
  if (!message) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const userId = token
    ? await supabase.auth
        .getUser(token)
        .then(({ data }) => data.user?.id ?? null)
        .catch(() => null)
    : null;

  const context: Record<string, Json> = {
    kind: body.kind ?? "unknown",
    url: body.url ?? null,
    userId,
  };
  if (body.stack) {
    context.stack = body.stack.slice(0, 4000);
  }

  await logServerError(supabase, {
    source: "client",
    message: message.slice(0, 2000),
    context,
  });

  return Response.json({ ok: true });
}
