"use client";

import { useState } from "react";
import { useCreateProject, useUpdateProject, useCreateMonitor } from "@/lib/mutations";
import { useChannels } from "@/lib/hooks";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import type { Project } from "@/lib/types";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

// Mirrors the standalone monitor form: a scope preset + (for Full) a check type.
type MonitorScope = "full" | "ssl" | "domain";

interface MonitorRow {
  name: string;
  url: string;
  scope: MonitorScope;
  /** Only used when scope = full. */
  type: "website" | "api";
  expectedStatusCode: string;
}

const newRow = (): MonitorRow => ({ name: "", url: "", scope: "full", type: "website", expectedStatusCode: "200" });

/** Short scope summary for the collapsed accordion header. */
function scopeSummary(r: MonitorRow): string {
  if (r.scope === "ssl") return "SSL certificate only";
  if (r.scope === "domain") return "Domain expiry only";
  return `Full · ${r.type === "api" ? "API" : "Website"}`;
}

/** Compact labeled field for an inline monitor row. */
function RowField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Resolve a row to the monitor's stored type + scope (same rules as the monitor form). */
function rowToTypeScope(r: MonitorRow): { type: "website" | "api" | "ssl"; monitoringScope: MonitorScope } {
  if (r.scope === "ssl") return { type: "ssl", monitoringScope: "ssl" };
  if (r.scope === "domain") return { type: "website", monitoringScope: "domain" }; // type unused for domain-only
  return { type: r.type, monitoringScope: "full" };
}

/** Common HTTP status codes for the expected-status datalist (typeahead). */
const STATUS_CODES: [string, string][] = [
  ["200", "OK"], ["201", "Created"], ["202", "Accepted"], ["204", "No Content"],
  ["301", "Moved Permanently"], ["302", "Found"], ["304", "Not Modified"], ["307", "Temporary Redirect"], ["308", "Permanent Redirect"],
  ["400", "Bad Request"], ["401", "Unauthorized"], ["403", "Forbidden"], ["404", "Not Found"], ["405", "Method Not Allowed"],
  ["409", "Conflict"], ["410", "Gone"], ["422", "Unprocessable Entity"], ["429", "Too Many Requests"],
  ["500", "Internal Server Error"], ["502", "Bad Gateway"], ["503", "Service Unavailable"], ["504", "Gateway Timeout"],
];

/** Default to https:// when the user omits the scheme (e.g. "www.google.com"). */
function withScheme(u: string): string {
  const t = u.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Default monitoring period for inline-created monitors: 3 months out. */
function inThreeMonths(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

/** Create or edit a project. On create you can also add monitors inline. */
export function ProjectFormModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
}) {
  const create = useCreateProject();
  const update = useUpdateProject();
  const createMonitor = useCreateMonitor();
  const { data: allChannels } = useChannels();
  const toast = useToast();
  const isEdit = !!project;

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [rows, setRows] = useState<MonitorRow[]>([newRow()]);
  // Which monitor accordion item is expanded (-1 = all collapsed).
  const [openIndex, setOpenIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRow = (i: number, patch: Partial<MonitorRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => {
    setOpenIndex(rows.length); // expand the newly added one
    setRows((rs) => [...rs, newRow()]);
  };
  const removeRow = (i: number) => {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
    setOpenIndex((cur) => (cur > i ? cur - 1 : cur === i ? Math.max(0, i - 1) : cur));
  };
  const toggleRow = (i: number) => setOpenIndex((cur) => (cur === i ? -1 : i));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Edit: just update the project.
    if (isEdit) {
      try {
        await update.mutateAsync({ id: project!.id, body: { name, description } });
        toast.success("Project updated");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save project");
      }
      return;
    }

    // Create: make the project, then create each filled-in monitor row inside it.
    setBusy(true);
    try {
      const proj = (await create.mutateAsync({ name, description })) as { id: string };
      const toAdd = rows.filter((r) => r.url.trim());
      const channels = (allChannels ?? []).map((c) => c.id);
      let added = 0;
      let duplicates = 0;
      let failed = 0;
      for (const r of toAdd) {
        const url = withScheme(r.url);
        const { type, monitoringScope } = rowToTypeScope(r);
        try {
          await createMonitor.mutateAsync({
            name: r.name.trim() || hostOf(url),
            url,
            type,
            monitoringScope,
            projectId: proj.id,
            method: "GET",
            intervalSec: 300,
            // Expected status only applies to Full (uptime) monitors.
            ...(monitoringScope === "full" ? { expectedStatusCode: Number(r.expectedStatusCode) || 200 } : {}),
            channels,
            expiresAt: inThreeMonths(),
          });
          added += 1;
        } catch (err) {
          if (err instanceof ApiError && err.code === "DUPLICATE_MONITOR") duplicates += 1;
          else failed += 1;
        }
      }
      const parts = [`Project created`];
      if (added) parts.push(`with ${added} monitor${added === 1 ? "" : "s"}`);
      const notes: string[] = [];
      if (duplicates) notes.push(`${duplicates} already existed`);
      if (failed) notes.push(`${failed} had an invalid URL`);
      toast.success(parts.join(" ") + (notes.length ? ` · ${notes.join(", ")}` : ""));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Project" : "New Project"} wide={!isEdit}>
      <form onSubmit={submit} className="space-y-3 max-h-[78vh] overflow-auto pr-1">
        {error && <div className="rounded-lg bg-down/15 px-3 py-2 text-sm text-down">{error}</div>}
        <Field label="Project name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Cadila" />
        </Field>
        <Field label="Description (optional)">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cadila web properties" />
        </Field>

        {!isEdit && (
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Add monitors (optional)</span>
              <span className="text-[11px] text-muted">You can configure each in detail later.</span>
            </div>
            <datalist id="http-status-codes">
              {STATUS_CODES.map(([code, label]) => (
                <option key={code} value={code}>{`${code} ${label}`}</option>
              ))}
            </datalist>
            <div className="space-y-2">
              {rows.map((r, i) => {
                const openRow = openIndex === i;
                const title = r.name.trim() || (r.url.trim() ? hostOf(withScheme(r.url)) : `Monitor ${i + 1}`);
                return (
                  <div key={i} className="overflow-hidden rounded-lg border border-border">
                    {/* Collapsed header — summary + expand/remove */}
                    <div className="flex items-center gap-2 bg-bg/40 px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => toggleRow(i)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={openRow}
                      >
                        <Icon name="chevron" width={14} height={14} className={cn("shrink-0 text-muted transition-transform", openRow && "rotate-180")} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{title}</span>
                          <span className="block truncate text-[11px] text-muted">
                            {r.url.trim() || "No URL yet"} · {scopeSummary(r)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                        className="grid h-7 w-7 flex-none place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-down disabled:opacity-30"
                        aria-label="Remove monitor"
                      >
                        ×
                      </button>
                    </div>

                    {/* Expanded body — the mini monitor form */}
                    {openRow && (
                      <div className="space-y-2 border-t border-border p-3">
                        <RowField label="Name (optional)">
                          <Input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Britannia Website" />
                        </RowField>
                        <RowField label={r.scope === "domain" ? "Domain" : "URL"}>
                          <Input
                            value={r.url}
                            onChange={(e) => setRow(i, { url: e.target.value })}
                            placeholder={r.scope === "domain" ? "example.com" : "https://example.com"}
                          />
                        </RowField>
                        <div className="grid grid-cols-2 gap-2">
                          <RowField label="What to monitor">
                            <Select value={r.scope} onChange={(e) => setRow(i, { scope: e.target.value as MonitorScope })}>
                              <option value="full">Full — uptime + SSL + domain</option>
                              <option value="ssl">SSL certificate only</option>
                              <option value="domain">Domain expiry only</option>
                            </Select>
                          </RowField>
                          {r.scope === "full" && (
                            <RowField label="Check type">
                              <Select value={r.type} onChange={(e) => setRow(i, { type: e.target.value as MonitorRow["type"] })}>
                                <option value="website">Website</option>
                                <option value="api">API</option>
                              </Select>
                            </RowField>
                          )}
                          {r.scope === "full" && (
                            <RowField label="Expected status">
                              <Input
                                list="http-status-codes"
                                inputMode="numeric"
                                value={r.expectedStatusCode}
                                onChange={(e) => setRow(i, { expectedStatusCode: e.target.value })}
                                placeholder="200"
                              />
                            </RowField>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addRow} className="mt-2 text-xs text-brand hover:underline">
              + Add another monitor
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || create.isPending || update.isPending}>
            {busy ? "Creating…" : isEdit ? "Save" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
