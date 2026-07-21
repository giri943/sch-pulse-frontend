"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMaintenanceWindows, useMaintenancePolicy } from "@/lib/hooks";
import { useCreateMaintenance, useCancelMaintenance } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Card, CardTitle, Button, Field, Input, Skeleton, Badge } from "@/components/ui";
import { DurationInput } from "@/components/DurationInput";
import { apiFetch } from "@/lib/api-client";
import { uploadImage, deleteImage } from "@/lib/uploadImage";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { MaintenanceWindow, UserLite } from "@/lib/types";

// Editor pulls in TipTap — load on demand so it doesn't weigh down the page.
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <div className="h-28 animate-pulse rounded-lg border border-border bg-bg" />,
});

const isBlankHtml = (html?: string | null) => !html || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0 && !/<img/i.test(html ?? "");

type WindowState = "active" | "upcoming" | "past";
function windowState(w: MaintenanceWindow): WindowState {
  if (w.canceledAt) return "past";
  const now = Date.now();
  const s = new Date(w.startAt).getTime();
  const e = new Date(w.endAt).getTime();
  if (now >= s && now <= e) return "active";
  if (now < s) return "upcoming";
  return "past";
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Schedule + manage maintenance windows for a monitor or a project. The reason
 * is a rich note (type text, paste/upload screenshots, @-mention people to
 * notify). While active, checks run but alerts are suppressed and SLA excludes it.
 */
export function MaintenancePanel({
  scope,
  monitorId,
  projectId,
  mentionProjectId,
  canManage,
}: {
  scope: "monitor" | "project";
  monitorId?: string;
  projectId?: string;
  /** Project whose members can be @-mentioned (project id for both scopes). */
  mentionProjectId?: string;
  canManage: boolean;
}) {
  const { data: windows, isLoading } = useMaintenanceWindows({ monitorId, projectId });
  const { data: policy } = useMaintenancePolicy();
  const create = useCreateMaintenance();
  const cancel = useCancelMaintenance();
  const toast = useToast();

  const [reason, setReason] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [startNow, setStartNow] = useState(true);
  const [startLocal, setStartLocal] = useState(toLocalInput(new Date()));
  const [durationMinutes, setDurationMinutes] = useState(60);

  useEffect(() => {
    if (policy?.defaultDurationMinutes) setDurationMinutes(policy.defaultDurationMinutes);
  }, [policy?.defaultDurationMinutes]);

  const mentionSearch = useCallback(
    (q: string) =>
      mentionProjectId
        ? apiFetch<UserLite[]>(`/projects/${mentionProjectId}/mentionable?q=${encodeURIComponent(q)}`)
        : Promise.resolve([]),
    [mentionProjectId],
  );

  const targetLabel = scope === "project" ? "this project's monitors" : "this monitor";

  function schedule() {
    create.mutate(
      {
        scope,
        monitorId,
        projectId,
        startAt: startNow ? undefined : new Date(startLocal).toISOString(),
        durationMinutes,
        reason: isBlankHtml(reason) ? undefined : reason,
        reasonMentions: mentions,
      },
      {
        onSuccess: () => {
          setReason("");
          setMentions([]);
          toast.success("Maintenance scheduled");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't schedule maintenance"),
      },
    );
  }

  const list = (windows ?? []).map((w) => ({ w, state: windowState(w) }));
  const current = list.filter((x) => x.state === "active" || x.state === "upcoming");
  const past = list.filter((x) => x.state === "past").slice(0, 8);

  return (
    <Card>
      <CardTitle>Maintenance windows</CardTitle>
      <p className="-mt-1 mb-4 text-sm text-muted">
        During a window, {targetLabel} keep being checked, but failures don&apos;t raise incidents or alerts and are
        excluded from SLA — so planned downtime never false-alarms.
      </p>

      {canManage && (
        <div className="mb-5 space-y-3 rounded-lg border border-border p-3">
          {/* Not a <Field> — that renders a <label>, and clicking a label forwards
              the click to the first control (the "T" button) instead of the editor. */}
          <div>
            <span className="text-xs font-medium text-muted">Reason &amp; proof</span>
            <p className="mt-0.5 text-[11px] text-muted/80">Type the reason, paste or drop a screenshot, and @mention anyone to notify them.</p>
            <div className="mt-1.5">
              <RichTextEditor
                value={reason}
                onChange={(html, ids) => {
                  setReason(html);
                  setMentions(ids);
                }}
                onImageUpload={uploadImage}
                onImageRemove={deleteImage}
                mentionSearch={mentionSearch}
                placeholder="Deploying v2.3 — paste the approval screenshot, @mention the team…"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />
                  Start now
                </label>
                {!startNow && (
                  <Input type="datetime-local" value={startLocal} min={toLocalInput(new Date())} onChange={(e) => setStartLocal(e.target.value)} />
                )}
              </div>
            </Field>
            <Field label="Duration">
              <DurationInput minutes={durationMinutes} onChange={setDurationMinutes} min={5} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={schedule} disabled={create.isPending}>
              {create.isPending ? "Scheduling…" : "Schedule maintenance"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-16" />
      ) : !list.length ? (
        <p className="text-sm text-muted">No maintenance windows scheduled.</p>
      ) : (
        <div className="space-y-4">
          {current.length > 0 && (
            <div className="space-y-2">
              {current.map(({ w, state }) => (
                <WindowRow key={w._id} w={w} state={state} canManage={canManage} onCancel={() => cancel.mutate(w._id)} canceling={cancel.isPending} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Past</div>
              <div className="space-y-2">
                {past.map(({ w, state }) => (
                  <WindowRow key={w._id} w={w} state={state} canManage={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function WindowRow({
  w,
  state,
  canManage,
  onCancel,
  canceling,
}: {
  w: MaintenanceWindow;
  state: WindowState;
  canManage: boolean;
  onCancel?: () => void;
  canceling?: boolean;
}) {
  const tone = state === "active" ? "bg-info/15 text-info" : state === "upcoming" ? "bg-brand/15 text-brand" : "bg-muted/15 text-muted";
  const label = w.canceledAt ? "Canceled" : state === "active" ? "Active" : state === "upcoming" ? "Scheduled" : "Ended";
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-2">
      <span className={cn("mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", tone)}>{label}</span>
      <div className="min-w-0 flex-1">
        {isBlankHtml(w.reason) ? (
          <div className="text-sm">Maintenance</div>
        ) : (
          <div className="pulse-editor text-sm" dangerouslySetInnerHTML={{ __html: w.reason }} />
        )}
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
          <span>{formatDateTime(w.startAt)} → {formatDateTime(w.endAt)}</span>
          {w.source === "deploy-token" && <Badge tone="neutral">deploy</Badge>}
        </div>
      </div>
      {canManage && !w.canceledAt && (state === "active" || state === "upcoming") && (
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={canceling}>
          Cancel
        </Button>
      )}
    </div>
  );
}
