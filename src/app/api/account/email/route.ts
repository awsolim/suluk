import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { logServerError } from "@/lib/monitoring/log-error";

export const runtime = "nodejs";

type UpdateEmailBody = {
  email?: string;
};

function friendlyEmailChangeError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists") || normalized.includes("duplicate")) {
    return "That email is already in use by another account.";
  }
  return message;
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
    if (!token) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateEmailBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return Response.json({ error: "Email cannot be empty." }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    if (email === user.email?.toLowerCase()) {
      return Response.json({ error: "That's already your email address." }, { status: 400 });
    }

    // Go through the user's own (non-admin) auth endpoint, not the admin API, so
    // whatever email-change confirmation policy is actually configured on this
    // Supabase project (secure/double-confirm email change, or none) applies
    // exactly as it would anywhere else in Supabase Auth — we don't hardcode it.
    const { url, anonKey } = getSupabasePublicEnv();
    const gotrueResponse = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(15000),
    });
    const gotrueResult = await gotrueResponse.json().catch(() => ({}));

    if (!gotrueResponse.ok) {
      const message = typeof gotrueResult?.msg === "string" ? gotrueResult.msg : typeof gotrueResult?.error_description === "string" ? gotrueResult.error_description : "Login email could not be updated.";
      return Response.json({ error: friendlyEmailChangeError(message) }, { status: gotrueResponse.status });
    }

    const returnedEmail = typeof gotrueResult?.email === "string" ? gotrueResult.email : null;
    const changeIsPending = returnedEmail !== email;

    if (changeIsPending) {
      // GoTrue sent a confirmation link (to the new address, and possibly the old one)
      // instead of applying the change immediately. Nothing to sync yet.
      return Response.json({
        pending: true,
        message: "Check your new email inbox for a confirmation link to finish this change.",
      });
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from("profiles")
      .update({ email: returnedEmail, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("*")
      .maybeSingle();

    if (profileError || !updatedProfile) {
      return Response.json(
        { error: profileError?.message ?? "Login email changed, but the profile record could not be synchronized." },
        { status: 500 },
      );
    }

    return Response.json({ pending: false, email: returnedEmail, profile: updatedProfile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email could not be updated.";
    await logServerError(createSupabaseServiceClient(), {
      source: "account.email",
      message,
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
