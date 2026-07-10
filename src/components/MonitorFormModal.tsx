"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateMonitor, useUpdateMonitor, useJoinMonitor, type MonitorBody } from "@/lib/mutations";
import { useProjects, useProjectMembers, useChannels } from "@/lib/hooks";
import { ApiError } from "@/lib/api-client";
import type { Monitor, UserLite } from "@/lib/types";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { UserPicker } from "@/components/UserPicker";
import { ChannelPicker } from "@/components/ChannelPicker";
import { cn } from "@/lib/cn";

// Read an id from a ref that may be a string, a {id}, or a populated {_id}.
function refId(r: unknown): string | null {
  if (!r) return null;
  if (typeof r === "string") return r;
  const o = r as { id?: unknown; _id?: unknown };
  const id = o.id ?? o._id;
  return id ? String(id) : null;
}

function toUserLites(members: Monitor["members"]): UserLite[] {
  if (!members) return [];
  return members
    .filter((m): m is UserLite => typeof m === "object" && m !== null && !!refId(m))
    .map((m) => ({ id: refId(m)!, name: m.name, email: m.email, avatarUrl: m.avatarUrl }));
}

function toChannelIds(channels: Monitor["channels"]): string[] {
  if (!channels) return [];
  return channels.map(refId).filter((id): id is string => !!id);
}

/** YYYY-MM-DD string N months from now (for the date input). */
function inMonths(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** Create/edit a monitor. `monitor=null` → create. Pass a fresh `key` to reset state. */
export function MonitorFormModal({
  open,
  onClose,
  monitor,
  lockProjectId,
}: {
  open: boolean;
  onClose: () => void;
  monitor: Monitor | null;
  /** When creating inside a project, pre-set the project and hide the selector. */
  lockProjectId?: string;
}) {
  const create = useCreateMonitor();
  const update = useUpdateMonitor();
  const join = useJoinMonitor();

  const { data: projects } = useProjects();
  const [name, setName] = useState(monitor?.name ?? "");
  const [projectId, setProjectId] = useState<string>(
    monitor?.project?.id ?? monitor?.projectId ?? lockProjectId ?? "",
  );
  const [type, setType] = useState<Monitor["type"]>(monitor?.type ?? "website");
  const [url, setUrl] = useState(monitor?.url ?? "");
  const [method, setMethod] = useState(monitor?.method ?? "GET");
  const [intervalSec, setIntervalSec] = useState(monitor?.intervalSec ?? 300);
  const [expectedStatusCode, setExpectedStatusCode] = useState(monitor?.expectedStatusCode ?? 200);
  const [members, setMembers] = useState<UserLite[]>(toUserLites(monitor?.members));
  const [extraEmails, setExtraEmails] = useState((monitor?.extraAlertEmails ?? []).join(", "));
  const [channels, setChannels] = useState<string[]>(toChannelIds(monitor?.channels));
  // New monitors default to a 3-month monitoring period; editing keeps the stored value.
  const [expiresAt, setExpiresAt] = useState<string>(
    monitor?.expiresAt ? monitor.expiresAt.slice(0, 10) : monitor ? "" : inMonths(3),
  );
  const [error, setError] = useState<string | null>(null);
  // Per-field validation error (shown inline at the field, not as a top banner).
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const clearErr = (f: string) => setFieldError((e) => (e?.field === f ? null : e));
  const errFor = (f: string) => (fieldError?.field === f ? fieldError.message : undefined);
  // Set when the backend reports an existing monitor for this URL (409).
  const [dup, setDup] = useState<{ id: string; name: string; url: string; alreadyMember: boolean } | null>(null);
  const pending = create.isPending || update.isPending || join.isPending;

  // Default to the first project (General) when creating outside a project context.
  useEffect(() => {
    if (!projectId && !lockProjectId && projects?.length) setProjectId(projects[0].id);
  }, [projects, projectId, lockProjectId]);

  // The project owner is always alerted automatically — hide them from Tag Users.
  const { data: projectMembers } = useProjectMembers(projectId);
  const ownerIds = useMemo(
    () => (projectMembers ?? []).filter((m) => m.role === "owner").map((m) => m.user.id),
    [projectMembers],
  );

  // For a NEW monitor, pre-select all notification channels so the owner is notified there too.
  const { data: allChannels } = useChannels();
  const didDefaultChannels = useRef(false);
  useEffect(() => {
    if (monitor || didDefaultChannels.current) return;
    if (allChannels && allChannels.length) {
      setChannels(allChannels.map((c) => c.id));
      didDefaultChannels.current = true;
    }
  }, [allChannels, monitor]);

  // Hide the picker when creating inside a project; show it when editing (to move projects).
  const showProjectField = !lockProjectId || !!monitor;

  function buildBody(): MonitorBody {
    return {
      name,
      projectId,
      type,
      // Default to https:// when the scheme is omitted (e.g. "www.google.com").
      url: /^https?:\/\//i.test(url.trim()) || !url.trim() ? url.trim() : `https://${url.trim()}`,
      method,
      intervalSec,
      expectedStatusCode,
      members: members.map((m) => m.id),
      extraAlertEmails: extraEmails.split(",").map((s) => s.trim()).filter(Boolean),
      channels,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
  }

  async function runCreate() {
    setError(null);
    try {
      await create.mutateAsync(buildBody());
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_MONITOR") {
        const existing = (err.details as { existing?: typeof dup })?.existing;
        if (existing) {
          setDup(existing);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Failed to save monitor");
    }
  }

  function validate(): { field: string; message: string } | null {
    if (!name.trim()) return { field: "name", message: "Monitor name is required." };
    if (showProjectField && !projectId) return { field: "project", message: "Please choose a project." };
    if (!url.trim()) return { field: "url", message: "URL is required." };
    if (type !== "ssl") {
      if (!method) return { field: "method", message: "Request method is required." };
      if (!expectedStatusCode || Number.isNaN(Number(expectedStatusCode)))
        return { field: "status", message: "Expected status code is required." };
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const invalid = validate();
    if (invalid) {
      setFieldError(invalid);
      // Surface the error at its field — scroll it into view and focus it.
      const el = document.getElementById(`mf-${invalid.field}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus?.();
      return;
    }
    setFieldError(null);
    if (monitor) {
      try {
        await update.mutateAsync({ id: monitor._id, body: buildBody() });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save monitor");
      }
    } else {
      await runCreate();
    }
  }

  async function joinExisting() {
    if (!dup) return;
    setError(null);
    try {
      await join.mutateAsync(dup.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join monitor");
    }
  }

  if (dup) {
    return (
      <Modal open={open} onClose={onClose} title="Monitor already exists">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            A monitor is already set up for this URL. To avoid duplicates, only one monitor per target is allowed —
            join the existing one and it’ll appear on your dashboard with its alerts.
          </p>
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
            <div className="font-medium text-fg">{dup.name}</div>
            <div className="text-xs text-muted break-all">{dup.url}</div>
          </div>
          {dup.alreadyMember && (
            <div className="rounded-lg bg-up/15 text-up text-sm px-3 py-2">
              You’re already a member of this monitor — it’s on your dashboard already.
            </div>
          )}
          {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setDup(null)}>
              Back
            </Button>
            {!dup.alreadyMember && (
              <Button type="button" onClick={() => void joinExisting()} disabled={pending}>
                {join.isPending ? "Joining…" : "Join this monitor"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={monitor ? "Edit Monitor" : "New Monitor"}>
      <form onSubmit={submit} noValidate className="space-y-3 max-h-[75vh] overflow-auto pr-1">
        {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
        <Field label="Monitor name" required error={errFor("name")}>
          <Input id="mf-name" value={name} onChange={(e) => { setName(e.target.value); clearErr("name"); }} placeholder="Britannia Website" />
        </Field>
        {showProjectField && (
          <Field label="Project" required hint="Group this monitor under a project (e.g. Frontend, Backend)." error={errFor("project")}>
            <Select id="mf-project" value={projectId} onChange={(e) => { setProjectId(e.target.value); clearErr("project"); }}>
              {!projectId && <option value="">Select a project…</option>}
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as Monitor["type"])}>
              <option value="website">Website</option>
              <option value="api">API</option>
              <option value="ssl">SSL</option>
            </Select>
          </Field>
          <Field label="Method" required={type !== "ssl"} error={errFor("method")}>
            <Select id="mf-method" value={method} onChange={(e) => { setMethod(e.target.value); clearErr("method"); }} disabled={type === "ssl"}>
              {["GET", "POST", "HEAD", "PUT"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="URL" required error={errFor("url")}>
          <Input id="mf-url" type="text" value={url} onChange={(e) => { setUrl(e.target.value); clearErr("url"); }} placeholder="britannia.co.in (https:// added if omitted)" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Interval">
            <Select value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value))}>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
              <option value={1800}>30 minutes</option>
            </Select>
          </Field>
          <Field label="Expected status" required={type !== "ssl"} error={errFor("status")}>
            <Input
              id="mf-status"
              type="number"
              value={expectedStatusCode}
              onChange={(e) => { setExpectedStatusCode(Number(e.target.value)); clearErr("status"); }}
              disabled={type === "ssl"}
            />
          </Field>
        </div>
        <Field label="Tag users (visibility + alerts)" hint="Type @ to tag a teammate. The project owner is always alerted automatically.">
          <UserPicker value={members} onChange={setMembers} excludeIds={ownerIds} placeholder="Type @ to tag a teammate…" />
        </Field>
        <Field label="Extra alert emails (non-users, comma-separated)">
          <Input value={extraEmails} onChange={(e) => setExtraEmails(e.target.value)} placeholder="client@brand.com" />
        </Field>

        <Field label="Notify channels (Google Chat)">
          <ChannelPicker value={channels} onChange={setChannels} />
        </Field>

        <Field label="Monitoring period" hint="When the period ends, daily reminders go out for the last 3 days, then it's archived and removed.">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { l: "3 mo", v: inMonths(3) },
              { l: "6 mo", v: inMonths(6) },
              { l: "12 mo", v: inMonths(12) },
            ].map((p) => (
              <button
                key={p.l}
                type="button"
                onClick={() => setExpiresAt(p.v)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                  expiresAt === p.v ? "border-brand bg-brand/15 text-fg" : "border-border text-muted hover:text-fg",
                )}
              >
                {p.l}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setExpiresAt("")}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                !expiresAt ? "border-brand bg-brand/15 text-fg" : "border-border text-muted hover:text-fg",
              )}
            >
              No expiry
            </button>
            <Input
              type="date"
              value={expiresAt}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-auto"
            />
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : monitor ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
