"use client";

import { useState } from "react";
import { useCreateProject, useUpdateProject, useCreateMonitor } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { Project } from "@/lib/types";
import { Button, Field, Input, Modal, Select } from "@/components/ui";

interface MonitorRow {
  name: string;
  url: string;
  type: "website" | "api" | "ssl";
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
  const [rows, setRows] = useState<MonitorRow[]>([{ name: "", url: "", type: "website" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRow = (i: number, patch: Partial<MonitorRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { name: "", url: "", type: "website" }]);
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
      const skipped: string[] = [];
      for (const r of toAdd) {
        try {
          await createMonitor.mutateAsync({
            name: r.name.trim() || hostOf(r.url.trim()),
            url: r.url.trim(),
            type: r.type,
            projectId: proj.id,
            method: "GET",
            intervalSec: 60,
            expectedStatusCode: 200,
          });
          added += 1;
        } catch {
          skipped.push(r.url.trim());
        }
      }
      toast.success(
        `Project created${added ? ` with ${added} monitor${added === 1 ? "" : "s"}` : ""}` +
          (skipped.length ? ` · ${skipped.length} skipped (invalid or already exists)` : ""),
      );
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
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_auto_auto] items-center gap-2">
                  <Input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Name (optional)" />
                  <Input value={r.url} onChange={(e) => setRow(i, { url: e.target.value })} placeholder="https://example.com" />
                  <Select value={r.type} onChange={(e) => setRow(i, { type: e.target.value as MonitorRow["type"] })} className="w-auto">
                    <option value="website">Website</option>
                    <option value="api">API</option>
                    <option value="ssl">SSL</option>
                  </Select>
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
