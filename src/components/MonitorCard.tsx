"use client";

import Link from "next/link";
import { useMonitorAction, useDeleteMonitor } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { Monitor } from "@/lib/types";
import { StatusDot, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";

const TYPE_ICON = { website: "globe", api: "braces", ssl: "shield" } as const;

function ago(iso?: string): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function MonitorCard({
  monitor: m,
  canManage,
  onEdit,
}: {
  monitor: Monitor;
  canManage: boolean;
  onEdit: (m: Monitor) => void;
}) {
  const action = useMonitorAction();
  const del = useDeleteMonitor();
  const toast = useToast();

  return (
    <div className="group bg-surface border border-border rounded-xl p-4 shadow-card hover:border-brand/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/monitors/${m._id}`} className="flex items-center gap-2.5 min-w-0">
          <StatusDot status={m.status} pulse />
          <div className="min-w-0">
            <div className="font-medium truncate group-hover:text-brand transition-colors">{m.name}</div>
            <div className="text-[11px] text-muted truncate">{m.url}</div>
          </div>
        </Link>
        <Badge tone="neutral">
          <Icon name={TYPE_ICON[m.type]} width={11} height={11} className="mr-1" />
          {m.type}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div>
          <div className="text-[11px] text-muted">Latency</div>
          <div className="text-sm font-medium">{m.lastResponseTimeMs != null ? `${m.lastResponseTimeMs}ms` : "—"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted">State</div>
          <div className="text-sm font-medium capitalize">{m.enabled ? m.status : "paused"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted">Checked</div>
          <div className="text-sm font-medium">{ago(m.lastCheckedAt)}</div>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border opacity-90">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => action.mutate({ id: m._id, action: "run" }, { onSuccess: () => toast.success("Check scheduled") })}
          >
            Run
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => action.mutate({ id: m._id, action: m.enabled ? "pause" : "resume" })}
          >
            {m.enabled ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(m)}>
            Edit
          </Button>
          <button
            onClick={() => {
              if (confirm(`Delete monitor "${m.name}"?`))
                del.mutate(m._id, {
                  onSuccess: () => toast.success("Monitor deleted"),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
                });
            }}
            className="ml-auto text-muted hover:text-down text-xs px-2 py-1"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
