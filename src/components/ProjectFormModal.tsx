"use client";

import { useState } from "react";
import { useCreateProject, useUpdateProject, useCreateMonitor } from "@/lib/mutations";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import type { Project } from "@/lib/types";
import { Button, Field, Input, Modal, Select } from "@/components/ui";

interface MonitorRow {
  name: string;
  url: string;
  type: "website" | "api" | "ssl";
  expectedStatusCode: string;
}

const newRow = (): MonitorRow => ({ name: "", url: "", type: "website", expectedStatusCode: "200" });

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
  const toast = useToast();
  const isEdit = !!project;

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [rows, setRows] = useState<MonitorRow[]>([newRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRow = (i: number, patch: Partial<MonitorRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

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
      let added = 0;
      let duplicates = 0;
      let failed = 0;
      for (const r of toAdd) {
        const url = withScheme(r.url);
        try {
          await createMonitor.mutateAsync({
            name: r.name.trim() || hostOf(url),
            url,
            type: r.type,
            projectId: proj.id,
            method: "GET",
            intervalSec: 60,
            expectedStatusCode: Number(r.expectedStatusCode) || 200,
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
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.3fr_auto_5.5rem_auto] items-center gap-2">
                  <Input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Name (optional)" />
                  <Input value={r.url} onChange={(e) => setRow(i, { url: e.target.value })} placeholder="https://example.com" />
                  <Select value={r.type} onChange={(e) => setRow(i, { type: e.target.value as MonitorRow["type"] })} className="w-auto">
                    <option value="website">Website</option>
                    <option value="api">API</option>
                    <option value="ssl">SSL</option>
                  </Select>
                  <Input
                    list="http-status-codes"
                    inputMode="numeric"
                    value={r.expectedStatusCode}
                    onChange={(e) => setRow(i, { expectedStatusCode: e.target.value })}
                    placeholder="200"
                    title="Expected status code"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    className="px-1 text-muted hover:text-down disabled:opacity-30"
                    aria-label="Remove monitor"
                  >
                    ×
                  </button>
                </div>
              ))}
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
