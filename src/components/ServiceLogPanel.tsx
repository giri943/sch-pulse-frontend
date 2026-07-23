"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useServiceLog, useSopTemplates, useProjectMembers, useServiceLogHistory } from "@/lib/hooks";
import { useMe } from "@/lib/permissions";
import {
  useUpdateServicePlan,
  useAttachSop,
  useUpdateProjectSop,
  useDetachSop,
  useCompleteSop,
  useUncompleteSop,
} from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Card, CardTitle, Button, Input, Select, Skeleton, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ChannelPicker } from "@/components/ChannelPicker";
import { apiBaseUrl, getAccessToken } from "@/lib/api-client";
import { uploadImage, deleteImage } from "@/lib/uploadImage";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { ProjectSopItem, SopFrequency } from "@/lib/types";

const FREQ: SopFrequency[] = ["daily", "weekly", "monthly", "quarterly"];

// Editor pulls in TipTap — load on demand so it doesn't weigh down the page.
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <div className="h-28 animate-pulse rounded-lg border border-border bg-bg" />,
});

// Blank when there's no visible text AND no image.
const isBlankHtml = (html?: string | null) =>
  !html || (html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0 && !/<img/i.test(html ?? ""));

export function ServiceLogPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data, isLoading } = useServiceLog(projectId);
  const { data: templates } = useSopTemplates();
  const { data: members } = useProjectMembers(projectId);
  const { data: me } = useMe();
  const updatePlan = useUpdateServicePlan(projectId);
  const attach = useAttachSop(projectId);
  const updateSop = useUpdateProjectSop(projectId);
  const detach = useDetachSop(projectId);
  const toast = useToast();

  const [addId, setAddId] = useState("");
  const [addFreq, setAddFreq] = useState<SopFrequency>("monthly");

  const memberUsers = useMemo(() => (members ?? []).map((m) => m.user).filter(Boolean), [members]);
  const attachedTemplateIds = new Set((data?.sops ?? []).map((s) => s.templateId).filter(Boolean));
  const available = (templates ?? []).filter((t) => !attachedTemplateIds.has(t.id));

  if (isLoading) return <Card><Skeleton className="h-40" /></Card>;

  const enabled = data?.enabled ?? false;
  const myId = me?.id;
  const iAmMaintenanceOwner = data?.owner?.id === myId;

  function addSop() {
    if (!addId) return;
    attach.mutate({ templateId: addId, frequency: addFreq }, {
      onSuccess: () => { setAddId(""); toast.success("SOP added to plan"); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't add"),
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle right={enabled && data?.sops.length ? <ReportControl projectId={projectId} /> : undefined}>Service log</CardTitle>
        <p className="-mt-1 mb-4 text-sm text-muted">
          Recurring server-maintenance SOPs for this project. Tick each off in its period (with proof) — this builds the
          month-on-month record and the monthly client report.
        </p>

        <div className="mb-5 space-y-3 rounded-lg border border-border p-3">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!canManage || updatePlan.isPending}
              onChange={(e) => updatePlan.mutate({ enabled: e.target.checked })}
              className="h-4 w-4 accent-[rgb(var(--brand))]"
            />
            This project has server maintenance
          </label>
          {enabled && (
            <div className="space-y-3">
              <label className="block max-w-xs">
                <span className="text-[11px] font-medium text-muted">Maintenance owner</span>
                <Select value={data?.owner?.id ?? ""} disabled={!canManage} onChange={(e) => updatePlan.mutate({ ownerId: e.target.value || null })} className="mt-1">
                  <option value="">Unassigned</option>
                  {memberUsers.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </Select>
              </label>
              <div>
                <span className="text-[11px] font-medium text-muted">Alert channels</span>
                <p className="mb-1.5 mt-0.5 text-[11px] text-muted/80">
                  Where upcoming &amp; overdue task alerts post on Google Chat. Owners are always emailed and notified in-app.
                </p>
                {canManage ? (
                  <ChannelPicker value={data?.channels ?? []} onChange={(channels) => updatePlan.mutate({ channels })} />
                ) : (
                  <span className="text-xs text-muted">{data?.channels?.length ? `${data.channels.length} channel(s)` : "None"}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {!enabled ? (
          <p className="text-sm text-muted">Turn on server maintenance to attach SOPs.</p>
        ) : (
          <>
            {canManage && (
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <label className="min-w-[200px] flex-1">
                  <span className="text-[11px] font-medium text-muted">Add SOP from library</span>
                  <Select value={addId} onChange={(e) => { setAddId(e.target.value); const t = available.find((x) => x.id === e.target.value); if (t) setAddFreq(t.defaultFrequency); }} className="mt-1">
                    <option value="">Select an SOP…</option>
                    {available.map((t) => <option key={t.id} value={t.id}>{t.category ? `${t.category} · ` : ""}{t.name}</option>)}
                  </Select>
                </label>
                <label className="w-36">
                  <span className="text-[11px] font-medium text-muted">Frequency</span>
                  <Select value={addFreq} onChange={(e) => setAddFreq(e.target.value as SopFrequency)} className="mt-1 capitalize">
                    {FREQ.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </Select>
                </label>
                <Button size="sm" onClick={addSop} disabled={!addId || attach.isPending}>Add</Button>
              </div>
            )}

            {!data?.sops.length ? (
              <EmptyState icon="🗂️" title="No SOPs attached" description={canManage ? "Add SOPs from the library above." : "No SOPs configured yet."} />
            ) : (
              <div className="space-y-2">
                {data.sops.map((s) => (
                  <SopRow
                    key={s.id}
                    sop={s}
                    projectId={projectId}
                    canManage={canManage}
                    canComplete={canManage || s.owner?.id === myId || iAmMaintenanceOwner}
                    onFreq={(frequency) => updateSop.mutate({ sopId: s.id, body: { frequency } })}
                    onRemove={() => detach.mutate(s.id, { onSuccess: () => toast.success("Removed") })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {enabled && !!data?.sops.length && <HistoryCard projectId={projectId} />}
    </div>
  );
}

function SopRow({
  sop,
  projectId,
  canManage,
  canComplete,
  onFreq,
  onRemove,
}: {
  sop: ProjectSopItem;
  projectId: string;
  canManage: boolean;
  canComplete: boolean;
  onFreq: (f: string) => void;
  onRemove: () => void;
}) {
  const complete = useCompleteSop(projectId);
  const uncomplete = useUncompleteSop(projectId);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const cp = sop.currentPeriod;

  function reset() {
    setOpen(false);
    setNote("");
  }

  function submit() {
    complete.mutate(
      { sopId: sop.id, body: { note: isBlankHtml(note) ? undefined : note } },
      {
        onSuccess: () => { reset(); toast.success("Marked done"); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
      },
    );
  }

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", cp.done ? "border-up/30 bg-up/[0.03]" : "border-border")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("grid h-6 w-6 flex-none place-items-center rounded-full text-xs", cp.done ? "bg-up/20 text-up" : "bg-surface-2 text-muted")}>
          {cp.done ? "✓" : "•"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{sop.name}</span>
            {sop.category && <Badge tone="neutral">{sop.category}</Badge>}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {cp.label} ·{" "}
            {cp.done ? (
              <span className="text-up">Done{cp.completedBy ? ` by ${cp.completedBy.name}` : ""}{cp.completedAt ? ` · ${formatDate(cp.completedAt)}` : ""}</span>
            ) : (
              <span className="text-degraded">Pending</span>
            )}
          </div>
        </div>

        {canManage ? (
          <Select value={sop.frequency} onChange={(e) => onFreq(e.target.value)} className="w-28 capitalize">
            {FREQ.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
          </Select>
        ) : (
          <Badge tone="brand">{sop.frequency}</Badge>
        )}

        {canComplete && !cp.done && <Button size="sm" onClick={() => setOpen((v) => !v)}>Mark done</Button>}
        {canComplete && cp.done && <Button size="sm" variant="ghost" onClick={() => uncomplete.mutate(sop.id)}>Undo</Button>}
        {canManage && (
          <button onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-down" aria-label="Remove SOP">
            <Icon name="trash" width={14} height={14} />
          </button>
        )}
      </div>

      {/* Done details — rich note with inline proof */}
      {cp.done && (!isBlankHtml(cp.note) || cp.proofUrl) && (
        <div className="mt-2 border-t border-border/60 pt-2">
          {!isBlankHtml(cp.note) && <div className="pulse-editor text-[13px] text-muted" dangerouslySetInnerHTML={{ __html: cp.note }} />}
          {cp.proofUrl && <a href={cp.proofUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12px] text-brand hover:underline">View proof</a>}
        </div>
      )}

      {/* Complete form */}
      {open && !cp.done && (
        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
          {/* Not a <label> wrapper — clicking a label forwards the click to the editor's first button. */}
          <div>
            <span className="text-[11px] font-medium text-muted">Note &amp; proof</span>
            <p className="mt-0.5 text-[11px] text-muted/80">What you checked / any findings — paste or drop a screenshot as proof.</p>
            <div className="mt-1.5">
              <RichTextEditor
                value={note}
                onChange={(html) => setNote(html)}
                onImageUpload={uploadImage}
                onImageRemove={deleteImage}
                placeholder="e.g. Verified backup job succeeded — paste the confirmation screenshot…"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={complete.isPending}>{complete.isPending ? "Saving…" : "Complete"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportControl({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${apiBaseUrl}/projects/${projectId}/service-log/report?month=${month}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maintenance-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't generate the report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 w-auto py-1 text-xs" />
      <Button size="sm" variant="subtle" onClick={download} disabled={busy}>{busy ? "Generating…" : "Download PDF"}</Button>
    </div>
  );
}

function HistoryCard({ projectId }: { projectId: string }) {
  const { data } = useServiceLogHistory(projectId);
  const items = data?.items ?? [];
  if (!items.length) return null;
  return (
    <Card>
      <CardTitle>Recent activity</CardTitle>
      <ul className="mt-1 space-y-1.5">
        {items.slice(0, 20).map((h) => (
          <li key={h.id} className="flex items-center gap-3 text-sm">
            <span className="text-up">✓</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{h.sopName}</span>
              <span className="text-muted"> · {h.periodLabel}</span>
              {h.completedBy && <span className="text-muted"> · {h.completedBy.name}</span>}
            </span>
            {h.proofUrl && <a href={h.proofUrl} target="_blank" rel="noreferrer" className="text-[12px] text-brand hover:underline">proof</a>}
            <span className="text-[11px] text-muted/70">{formatDate(h.completedAt)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
