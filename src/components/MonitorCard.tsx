"use client";

import Link from "next/link";
import { useMonitorAction, useDeleteMonitor } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { Monitor } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { WafBadge } from "@/components/WafNotice";
import { MonitorSparkline } from "@/components/MonitorSparkline";
import { initials, projectTint } from "@/lib/projectVisual";
import { cn } from "@/lib/cn";

const TYPE_ICON = { website: "globe", api: "braces", ssl: "shield" } as const;

const STATUS_VAR: Record<string, string> = {
  operational: "--up",
  degraded: "--degraded",
  down: "--down",
  paused: "--muted",
  unknown: "--muted",
};

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

  const effStatus = !m.enabled ? "paused" : m.status;
  const isTrouble = m.enabled && (m.status === "down" || m.status === "degraded");
  const cssVar = STATUS_VAR[effStatus] ?? STATUS_VAR.unknown;
  const color = `rgb(var(${cssVar}))`;
  const glow = `rgb(var(${cssVar}) / 0.16)`;
  const tint = projectTint(m.name);

  const lat = m.lastResponseTimeMs;
  const latTone = lat == null ? "text-muted" : lat < 400 ? "text-up" : lat < 1000 ? "text-fg" : "text-degraded";
  const uptimeTone = m.uptime24h == null ? "text-muted" : m.uptime24h >= 99.5 ? "text-up" : m.uptime24h >= 95 ? "text-degraded" : "text-down";

  return (
    <div
      className={cn(
        "group flex flex-col gap-3.5 rounded-2xl border bg-surface p-4 shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_28px_-12px_rgb(0_0_0/0.6)]",
        isTrouble ? "border-down/40" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 flex-none place-items-center rounded-xl text-sm font-bold tracking-tight"
          style={{ background: tint.bg, color: tint.fg }}
          aria-hidden
        >
          {initials(m.name)}
        </div>
        <Link href={`/monitors/${m._id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: color, boxShadow: `0 0 0 3px ${glow}` }} />
            <span className="truncate font-semibold tracking-[-0.01em] group-hover:text-brand">{m.name}</span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted">{m.url}</div>
        </Link>
        <div className="flex flex-none flex-col items-end gap-1">
          <Badge tone="neutral">
            <Icon name={TYPE_ICON[m.type]} width={11} height={11} className="mr-1" />
            {m.type}
          </Badge>
          <WafBadge monitor={m} />
        </div>
      </div>

      <MonitorSparkline points={m.spark ?? []} color={color} />

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Uptime 24h" value={m.uptime24h == null ? "—" : `${m.uptime24h}%`} tone={uptimeTone} />
        <Stat label="Latency" value={lat != null ? `${lat}ms` : "—"} tone={latTone} />
        <Stat label="Checked" value={ago(m.lastCheckedAt)} tone="text-fg" />
      </div>

      {canManage && (
        <div className="flex items-center gap-1.5 border-t border-border pt-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => action.mutate({ id: m._id, action: "run" }, { onSuccess: () => toast.success("Check scheduled") })}
          >
            Run
          </Button>
          <Button size="sm" variant="subtle" onClick={() => action.mutate({ id: m._id, action: m.enabled ? "pause" : "resume" })}>
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
            className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-down"
            aria-label="Delete monitor"
          >
            <Icon name="trash" width={14} height={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={cn("text-sm font-medium", tone)}>{value}</div>
    </div>
  );
}
