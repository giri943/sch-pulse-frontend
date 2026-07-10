"use client";

import { useEffect, useRef, useState } from "react";
import { useIncident } from "@/lib/hooks";
import { useUpdateIncident } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { StatusDot, Skeleton, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration } from "@/lib/dates";
import type { IncidentRow } from "@/lib/types";

const fmtTime = (iso?: string | null) => formatDateTime(iso);

const textareaCls =
  "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-muted/60 resize-y min-h-[64px]";

/**
 * One incident in the monitor's Incidents tab. Collapsed: a scannable summary
 * row. Expanded: timeline, cause and (for editors) inline-editable notes — the
 * incident lives in its monitor's context, no separate page. Deep-linkable via
 * ?incident=<id>, which auto-expands, scrolls to and briefly highlights it.
 */
export function IncidentDetailRow({
  incident,
  open,
  onToggle,
  canEdit,
  deepLinked = false,
}: {
  incident: IncidentRow;
  open: boolean;
  onToggle: () => void;
  canEdit: boolean;
  deepLinked?: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [flash, setFlash] = useState(false);
  const { data: detail, isLoading } = useIncident(incident._id, open);

  // Arriving from a deep link — bring this incident into view and pulse it once.
  useEffect(() => {
    if (!deepLinked) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 2200);
    return () => clearTimeout(t);
  }, [deepLinked]);

  const isOpen = incident.status === "open";

  return (
    <li
      ref={ref}
      className={cn(
        "rounded-xl border transition-colors",
        open ? "border-border bg-surface-2/40" : "border-transparent",
        flash && "ring-2 ring-brand/60",
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2/60"
      >
        <StatusDot status={incident.status} />
        <div className="min-w-0 flex-1">
          <div className="text-sm">{isOpen ? "Down" : "Recovered"}</div>
          <div className="text-[11px] text-muted">{fmtTime(incident.startedAt)}</div>
        </div>
        <span className="shrink-0 text-xs text-muted">{formatDuration(incident.durationSec)}</span>
        <Icon name="chevron" width={15} height={15} className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border px-3 py-3.5">
          {isLoading || !detail ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-4">
              <Timeline
                started={detail.startedAt}
                acknowledged={!!detail.acknowledgedBy}
                escalated={(detail.escalationsSent?.length ?? 0) > 0}
                resolved={detail.resolvedAt}
              />
              <Cause trigger={detail.trigger} humanized={detail.humanized} />
              {detail.recommendations && detail.recommendations.length > 0 && (
                <Recommendations items={detail.recommendations} />
              )}
              <Notes
                id={detail._id}
                canEdit={canEdit}
                rootCauseNotes={detail.rootCauseNotes ?? ""}
                resolutionNotes={detail.resolutionNotes ?? ""}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Timeline({
  started,
  acknowledged,
  escalated = false,
  resolved,
}: {
  started: string;
  acknowledged: boolean;
  escalated?: boolean;
  resolved: string | null;
}) {
  type Step = { label: string; time?: string | null; note?: string; tone: "text-down" | "text-degraded" | "text-up" | "text-muted" };
  const steps: Step[] = [
    { label: "Started", time: started, tone: "text-down" },
    ...(acknowledged ? [{ label: "Acknowledged", note: "acknowledged", tone: "text-degraded" } as Step] : []),
    ...(escalated ? [{ label: "Escalated", note: "to leadership", tone: "text-down" } as Step] : []),
    resolved
      ? { label: "Resolved", time: resolved, tone: "text-up" }
      : { label: "Ongoing", note: "still down", tone: "text-muted" },
  ];
  return (
    <ol className="space-y-2">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-2.5 text-sm">
          <span className={cn("h-1.5 w-1.5 rounded-full", s.tone === "text-down" ? "bg-down" : s.tone === "text-up" ? "bg-up" : s.tone === "text-degraded" ? "bg-degraded" : "bg-muted")} />
          <span className={cn("w-28 shrink-0 font-medium", s.tone)}>{s.label}</span>
          <span className="text-muted">{s.time ? fmtTime(s.time) : (s.note ?? "—")}</span>
        </li>
      ))}
    </ol>
  );
}

function Cause({
  trigger,
  humanized,
}: {
  trigger?: { statusCode?: number; error?: string; responseTimeMs?: number; server?: string } | null;
  humanized?: string;
}) {
  const hasTech = !!trigger && (trigger.statusCode != null || !!trigger.error || trigger.responseTimeMs != null || !!trigger.server);
  if (!hasTech && !humanized) {
    return <Section title="Cause"><p className="text-sm text-muted">No failure detail was captured for this incident.</p></Section>;
  }
  return (
    <Section title="Cause">
      {/* Plain-language explanation first; technical detail below for engineers. */}
      {humanized && <p className="mb-2.5 text-sm">{humanized}</p>}
      {hasTech && (
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-sm">
          {trigger?.statusCode != null && (
            <>
              <dt className="text-muted">Status code</dt>
              <dd className="font-medium text-down tabular-nums">{trigger.statusCode}</dd>
            </>
          )}
          {trigger?.error && (
            <>
              <dt className="text-muted">Error</dt>
              <dd className="break-words font-medium">{trigger.error}</dd>
            </>
          )}
          {trigger?.responseTimeMs != null && (
            <>
              <dt className="text-muted">Response time</dt>
              <dd className="tabular-nums">{trigger.responseTimeMs}ms</dd>
            </>
          )}
          {trigger?.server && (
            <>
              <dt className="text-muted">Reported by</dt>
              <dd className="break-words font-medium">{trigger.server}</dd>
            </>
          )}
        </dl>
      )}
    </Section>
  );
}

function Recommendations({ items }: { items: { title: string; steps: string[] }[] }) {
  return (
    <Section title="Recommended checks">
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r.title} className="text-sm">
            <div className="font-medium">{r.title}</div>
            {r.steps.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                {r.steps.map((s, j) => <li key={j}>{s}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Notes({
  id,
  canEdit,
  rootCauseNotes,
  resolutionNotes,
}: {
  id: string;
  canEdit: boolean;
  rootCauseNotes: string;
  resolutionNotes: string;
}) {
  const update = useUpdateIncident();
  const toast = useToast();
  const [root, setRoot] = useState(rootCauseNotes);
  const [resolution, setResolution] = useState(resolutionNotes);
  const dirty = root !== rootCauseNotes || resolution !== resolutionNotes;

  if (!canEdit) {
    if (!rootCauseNotes && !resolutionNotes) return null;
    return (
      <Section title="Notes">
        {rootCauseNotes && <p className="text-sm"><span className="text-muted">Root cause: </span>{rootCauseNotes}</p>}
        {resolutionNotes && <p className="mt-1 text-sm"><span className="text-muted">Resolution: </span>{resolutionNotes}</p>}
      </Section>
    );
  }

  function save() {
    update.mutate(
      { id, body: { rootCauseNotes: root, resolutionNotes: resolution } },
      {
        onSuccess: () => toast.success("Notes saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save notes"),
      },
    );
  }

  return (
    <Section title="Notes">
      <div className="space-y-2.5">
        <label className="block">
          <span className="text-[11px] font-medium text-muted">Root cause</span>
          <textarea value={root} onChange={(e) => setRoot(e.target.value)} placeholder="What caused this?" className={cn(textareaCls, "mt-1")} />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted">Resolution</span>
          <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="How was it resolved?" className={cn(textareaCls, "mt-1")} />
        </label>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending ? "Saving…" : "Save notes"}
          </Button>
        </div>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</div>
      {children}
    </div>
  );
}
