"use client";

import { useState } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";

/** YYYY-MM-DD, N months from now. */
function inMonths(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** Restore an archived monitor, choosing its new monitoring period first. */
export function RestoreMonitorDialog({
  open,
  onClose,
  monitorName,
  pending,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  monitorName: string;
  pending: boolean;
  onConfirm: (expiresAt: string | null) => void;
}) {
  const [expiresAt, setExpiresAt] = useState<string>(inMonths(3));

  const presets = [
    { l: "3 mo", v: inMonths(3) },
    { l: "6 mo", v: inMonths(6) },
    { l: "12 mo", v: inMonths(12) },
  ];

  return (
    <Modal open={open} onClose={onClose} title={`Restore ${monitorName}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Set a new monitoring period. When it ends, the monitor is archived again — choose <b>No expiry</b> to monitor
          indefinitely.
        </p>
        <Field label="Monitoring period">
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((p) => (
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
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => onConfirm(expiresAt ? new Date(expiresAt).toISOString() : null)}>
            {pending ? "Restoring…" : "Restore monitor"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
