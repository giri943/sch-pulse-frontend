"use client";

import { useState } from "react";
import { useSopTemplates } from "@/lib/hooks";
import { useCreateSop, useUpdateSop, useArchiveSop, type SopBody } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Button, Card, CardTitle, Field, Input, Select, Modal, Skeleton, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { SopTemplate, SopFrequency } from "@/lib/types";

const FREQ: SopFrequency[] = ["daily", "weekly", "monthly", "quarterly"];

/** Super-admin: the reusable SOP catalog attached to project maintenance plans. */
export function SopLibraryPanel() {
  const { data: sops, isLoading } = useSopTemplates();
  const archive = useArchiveSop();
  const toast = useToast();
  const [editing, setEditing] = useState<SopTemplate | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardTitle
        right={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Icon name="plus" width={15} height={15} /> New SOP
          </Button>
        }
      >
        SOP library
      </CardTitle>
      <p className="-mt-1 mb-4 text-sm text-muted">
        Reusable server-maintenance tasks. Create once, then attach them to any project&apos;s Service log with a
        per-project frequency.
      </p>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !sops?.length ? (
        <EmptyState icon="📋" title="No SOPs yet" description="Add tasks like DB backup, security patch check, log rotation, restore test." />
      ) : (
        <div className="space-y-2">
          {sops.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{s.name}</span>
                  {s.category && <Badge tone="neutral">{s.category}</Badge>}
                  <Badge tone="brand">default: {s.defaultFrequency}</Badge>
                </div>
                {s.description && <div className="mt-0.5 truncate text-[12px] text-muted">{s.description}</div>}
                {s.steps.length > 0 && <div className="mt-0.5 text-[11px] text-muted/70">{s.steps.length} step{s.steps.length === 1 ? "" : "s"}</div>}
              </div>
              <div className="flex flex-none gap-0.5">
                <button onClick={() => { setEditing(s); setOpen(true); }} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit SOP">
                  <Icon name="pencil" width={14} height={14} />
                </button>
                <button
                  onClick={() => { if (confirm(`Retire "${s.name}"? It stays on existing plans but won't appear in the picker.`)) archive.mutate(s.id, { onSuccess: () => toast.success("SOP retired") }); }}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-down"
                  aria-label="Retire SOP"
                >
                  <Icon name="trash" width={14} height={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <SopModal sop={editing} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function SopModal({ sop, onClose }: { sop: SopTemplate | null; onClose: () => void }) {
  const create = useCreateSop();
  const update = useUpdateSop();
  const toast = useToast();
  const [name, setName] = useState(sop?.name ?? "");
  const [category, setCategory] = useState(sop?.category ?? "");
  const [description, setDescription] = useState(sop?.description ?? "");
  const [defaultFrequency, setDefaultFrequency] = useState<SopFrequency>(sop?.defaultFrequency ?? "monthly");
  const [steps, setSteps] = useState((sop?.steps ?? []).join("\n"));
  const pending = create.isPending || update.isPending;

  function save() {
    const body: SopBody = {
      name: name.trim(),
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      defaultFrequency,
      steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    if (!body.name || body.name.length < 2) return toast.error("Name is required");
    const opts = { onSuccess: () => { toast.success(sop ? "SOP updated" : "SOP created"); onClose(); }, onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't save") };
    if (sop) update.mutate({ id: sop.id, body }, opts);
    else create.mutate(body, opts);
  }

  return (
    <Modal open onClose={onClose} title={sop ? "Edit SOP" : "New SOP"}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Database backup" />
          </Field>
          <Field label="Category" hint="For grouping (optional).">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Backup" />
          </Field>
        </div>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Verify nightly DB backup ran and is restorable." />
        </Field>
        <Field label="Default frequency" hint="Prefilled when attaching; adjustable per project.">
          <Select value={defaultFrequency} onChange={(e) => setDefaultFrequency(e.target.value as SopFrequency)}>
            {FREQ.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
          </Select>
        </Field>
        <Field label="Checklist steps (one per line)">
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={4}
            placeholder={"Check backup job status\nVerify backup size\nRun a restore test"}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={pending}>{pending ? "Saving…" : sop ? "Save" : "Create"}</Button>
        </div>
      </div>
    </Modal>
  );
}
