"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { AvatarStack } from "@/components/Avatars";
import { useMonitorAction, useDeleteMonitor } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { statusColor, statusRank } from "@/lib/status";
import { ago, expiryLabel, expiryTone } from "@/lib/monitorDisplay";
import type { Monitor, UserLite } from "@/lib/types";

/** Tagged users (populated members) on a monitor's alerts. */
const alertMembers = (m: Monitor): UserLite[] =>
  (m.members ?? []).filter((x): x is UserLite => typeof x === "object" && x !== null);

const kindLabel = (m: Monitor): string => {
  const scope = m.monitoringScope ?? "full";
  if (scope === "ssl") return "SSL only";
  if (scope === "domain") return "Domain only";
  return `Full · ${m.type === "api" ? "API" : "Website"}`;
};

export function MonitorsTable({
  monitors,
  canManage,
  onEdit,
}: {
  monitors: Monitor[];
  canManage: boolean;
  onEdit: (m: Monitor) => void;
}) {
  const router = useRouter();
  const action = useMonitorAction();
  const del = useDeleteMonitor();
  const toast = useToast();

  const columns: Column<Monitor>[] = [
    {
      key: "name",
      header: "Monitor",
      sortValue: (m) => m.name.toLowerCase(),
      render: (m) => {
        const { color, glow } = statusColor(m.status, m.enabled);
        return (
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: color, boxShadow: `0 0 0 3px ${glow}` }} />
            <div className="min-w-0">
              <div className="truncate font-medium">{m.name}</div>
              <div className="truncate text-[11px] text-muted">{m.url}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "kind",
      header: "Type",
      sortValue: (m) => kindLabel(m),
      render: (m) => <Badge tone="neutral">{kindLabel(m)}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (m) => statusRank(m.status, m.enabled),
      render: (m) => <StatusBadge status={m.enabled ? m.status : "paused"} />,
    },
    {
      key: "uptime",
      header: "Uptime 24h",
      align: "right",
      className: "tabular-nums",
      sortValue: (m) => m.uptime24h ?? -1,
      render: (m) => ((m.monitoringScope ?? "full") === "full" ? (m.uptime24h == null ? "—" : `${m.uptime24h}%`) : "—"),
    },
    {
      key: "expiry",
      header: "Expiry",
      sortValue: (m) => {
        const iso = (m.monitoringScope ?? "full") === "domain" ? m.domainExpiresAt : m.sslExpiresAt;
        return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER;
      },
      render: (m) => {
        const iso = (m.monitoringScope ?? "full") === "domain" ? m.domainExpiresAt : m.sslExpiresAt;
        return <span className={expiryTone(iso)}>{expiryLabel(iso)}</span>;
      },
    },
    {
      key: "alerts",
      header: "Alerts",
      sortValue: (m) => alertMembers(m).length + (m.extraAlertEmails?.length ?? 0),
      render: (m) => {
        const people = alertMembers(m);
        const extra = m.extraAlertEmails?.length ?? 0;
        if (!people.length && !extra) return <span className="text-muted">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <AvatarStack people={people} />
            {extra > 0 && (
              <span className="text-[11px] text-muted" title={m.extraAlertEmails?.join(", ")}>
                +{extra} email{extra === 1 ? "" : "s"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "checked",
      header: "Checked",
      className: "whitespace-nowrap",
      sortValue: (m) => (m.lastCheckedAt ? new Date(m.lastCheckedAt).getTime() : 0),
      render: (m) => <span className="text-muted">{ago(m.lastCheckedAt)}</span>,
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      align: "right",
      className: "whitespace-nowrap",
      render: (m) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="subtle" onClick={() => action.mutate({ id: m._id, action: "run" }, { onSuccess: () => toast.success(m.monitoringScope && m.monitoringScope !== "full" ? "Checked" : "Check scheduled") })}>
            {m.monitoringScope && m.monitoringScope !== "full" ? "Check" : "Run"}
          </Button>
          <Button size="sm" variant="subtle" onClick={() => action.mutate({ id: m._id, action: m.enabled ? "pause" : "resume" })}>
            {m.enabled ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(m)}>Edit</Button>
          <button
            onClick={() => {
              if (confirm(`Delete monitor "${m.name}"?`))
                del.mutate(m._id, { onSuccess: () => toast.success("Monitor deleted"), onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed") });
            }}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-down"
            aria-label="Delete monitor"
          >
            <Icon name="trash" width={14} height={14} />
          </button>
        </div>
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      rows={monitors}
      rowKey={(m) => m._id}
      onRowClick={(m) => router.push(`/monitors/${m._id}`)}
    />
  );
}
