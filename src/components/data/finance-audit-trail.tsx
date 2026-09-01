"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { friendlyErrorMessage } from "@/lib/errors";
import { EmptyState } from "@/components/data/empty-state";
import { AppLoadingSkeleton } from "@/components/data/data-loading";

type AuditEvent = Database["public"]["Tables"]["program_finance_audit_events"]["Row"];

function humanizeEventType(eventType: string) {
  return eventType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function FinanceAuditTrail({ programId }: { programId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [programTitle, setProgramTitle] = useState("Class audit trail");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditTrail = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    try {
      const [programResult, auditResult] = await Promise.all([
        supabase.from("programs").select("title").eq("id", programId).maybeSingle(),
        supabase.from("program_finance_audit_events").select("*").eq("program_id", programId).order("created_at", { ascending: false }),
      ]);
      if (auditResult.error) {
        setError(friendlyErrorMessage(auditResult.error, "Could not load the audit trail."));
        setLoading(false);
        return;
      }
      const rows = auditResult.data ?? [];
      const profileIds = Array.from(
        new Set(rows.flatMap((event) => [event.actor_profile_id, event.student_profile_id]).filter(Boolean) as string[]),
      );
      const { data: profiles } = profileIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds) : { data: [] };
      setProgramTitle(programResult.data?.title ?? "Class audit trail");
      setEvents(rows);
      setProfileNames(Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.full_name || profile.email || "Unknown"])));
      setLoading(false);
    } catch (caught) {
      setError(friendlyErrorMessage(caught, "Could not load the audit trail."));
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    void loadAuditTrail();
  }, [loadAuditTrail]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => sort === "newest" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)), [events, sort]);

  if (loading) return <AppLoadingSkeleton layout="management" label="Loading audit trail" />;
  if (error) return <EmptyState title="Could not load audit trail" text={error} onRetry={() => void loadAuditTrail()} />;

  return (
    <section className="min-h-[calc(100vh-120px)] bg-white px-4 pb-28 pt-5 text-[#26323A]">
      <div className="flex items-end justify-between gap-4 border-b border-[#E1E8EC] pb-4">
        <div className="min-w-0"><h2 className="truncate text-xl font-semibold">{programTitle}</h2><p className="mt-1 text-xs text-[#7B858C]">{events.length} recorded events</p></div>
        <select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")} className="h-9 rounded-[10px] border border-[#D6DCE0] bg-white px-2 text-xs font-semibold">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
      </div>
      <div className="divide-y divide-[#EEF2F4]">
        {sortedEvents.map((event) => {
          const actorName = event.actor_profile_id ? profileNames[event.actor_profile_id] ?? "Staff member" : "System";
          const targetName = event.student_profile_id ? profileNames[event.student_profile_id] ?? null : null;
          return (
            <article key={event.id} className="py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#17624F]">{humanizeEventType(event.event_type)}</span>
                <span className="shrink-0 text-[11px] text-[#9AA5AB]">{new Date(event.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-5">{event.summary}</p>
              <p className="mt-1 text-xs text-[#7B858C]">
                By {actorName}
                {targetName && targetName !== actorName ? ` · For ${targetName}` : ""}
              </p>
            </article>
          );
        })}
        {!sortedEvents.length ? <p className="py-10 text-center text-sm font-semibold text-[#7B858C]">No audit events yet.</p> : null}
      </div>
    </section>
  );
}
