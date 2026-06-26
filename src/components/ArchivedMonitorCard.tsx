"use client";

import { useState } from "react";
import { useRestoreMonitor } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { Monitor } from "@/lib/types";
import { Button } from "@/components/ui";
import { RestoreMonitorDialog } from "@/components/RestoreMonitorDialog";
import { initials, projectTint } from "@/lib/projectVisual";
import { formatDate } from "@/lib/dates";

/** Monitors are hard-deleted this many days after archiving (matches the backend). */
const PURGE_DAYS = 7;

function daysUntilPurge(softDeletedAt?: string | null): number | null {
  if (!softDeletedAt) return null;
  const purgeAt = new Date(softDeletedAt).getTime() + PURGE_DAYS * 86_400_000;
  return Math.ceil((purgeAt - Date.now()) / 86_400_000);
}

/** A soft-deleted (archived) monitor, with a Restore action before it's purged. */
export function ArchivedMonitorCard({ monitor: m, canManage }: { monitor: Monitor; canManage: boolean }) {
  const restore = useRestoreMonitor();
  const toast = useToast();
  const [dialog, setDialog] = useState(false);
  const tint = projectTint(m.name);
  const left = daysUntilPurge(m.softDeletedAt);

  const doRestore = (expiresAt: string | null) =>
    restore.mutate(
      { id: m._id, expiresAt },
      {
        onSuccess: () => {
          toast.success("Monitor restored");
          setDialog(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Restore failed"),
      },
    );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 flex-none place-items-center rounded-xl text-sm font-bold tracking-tight opacity-60"
          style={{ background: tint.bg, color: tint.fg }}
          aria-hidden
        >
          {initials(m.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold tracking-[-0.01em]" title={m.name}>
            {m.name}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted" title={m.url}>
            {m.url}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted">
        Archived{m.softDeletedAt ? ` ${formatDate(m.softDeletedAt)}` : ""}
        {left != null && (
          <>
            {" · "}
            <span className={left <= 2 ? "text-down" : "text-degraded"}>
              {left <= 0 ? "deletes anytime" : `auto-deletes in ${left}d`}
            </span>
          </>
        )}
      </div>

      {canManage && (
        <div className="border-t border-border pt-3">
          <Button size="sm" onClick={() => setDialog(true)} disabled={restore.isPending}>
            Restore monitor
          </Button>
        </div>
      )}

      {dialog && (
        <RestoreMonitorDialog
          open
          onClose={() => setDialog(false)}
          monitorName={m.name}
          pending={restore.isPending}
          onConfirm={doRestore}
        />
      )}
    </div>
  );
}
