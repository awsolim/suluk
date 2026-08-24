import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { escapeHtml, renderEmailShell, sendEmail } from "@/lib/email/resend";
import { logServerError } from "@/lib/monitoring/log-error";

export const runtime = "nodejs";

type ReportProblemBody = {
  message?: string;
  url?: string;
};

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
    if (!token) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ReportProblemBody;
    const message = body.message?.trim() ?? "";
    if (!message) {
      return Response.json({ error: "Please describe what happened." }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("full_name, account_type").eq("id", user.id).maybeSingle();
    const reporterName = profile?.full_name?.trim() || user.email || "A user";
    const recipient = process.env.REPORT_PROBLEM_EMAIL;

    if (recipient) {
      await sendEmail({
        to: recipient,
        subject: `Problem report from ${reporterName}`,
        html: renderEmailShell({
          eyebrow: "Madrasa",
          title: "Problem report",
          body: `
            <p style="margin:0 0 12px;"><strong>From:</strong> ${escapeHtml(reporterName)} (${escapeHtml(user.email ?? "no email")})</p>
            <p style="margin:0 0 12px;"><strong>Account type:</strong> ${escapeHtml(profile?.account_type ?? "unknown")}</p>
            <p style="margin:0 0 12px;"><strong>Page:</strong> ${escapeHtml(body.url ?? "unknown")}</p>
            <p style="margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
          `,
        }),
        text: `From: ${reporterName} (${user.email ?? "no email"})\nAccount type: ${profile?.account_type ?? "unknown"}\nPage: ${body.url ?? "unknown"}\n\n${message}`,
        replyTo: user.email ?? undefined,
      });
    } else {
      // No recipient configured — still keep a durable record so this isn't silently lost.
      await logServerError(supabase, {
        source: "report-problem.no-recipient-configured",
        message,
        context: { userId: user.id, url: body.url ?? null },
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report could not be sent.";
    await logServerError(createSupabaseServiceClient(), {
      source: "account.report-problem",
      message,
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
