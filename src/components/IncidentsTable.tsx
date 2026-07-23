"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge, StatusDot } from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/dates";
import type { IncidentRow } from "@/lib/types";

export function IncidentsTable({ incidents }: { incidents: IncidentRow[] }) {
  const router = useRouter();

  const columns: Column<IncidentRow>[] = [
    {
      key: "status",
      header: "Status",
      sortValue: (i) => (i.status === "open" ? 0 : 1),
      render: (i) => (
        <span className="inline-flex items-center gap-2">
          <StatusDot status={i.status} />
          <StatusBadge status={i.status} />
        </span>
      ),
    },
    {
      key: "monitor",
      header: "Monitor",
      primary: true,
      sortValue: (i) => (i.monitorId?.name ?? "").toLowerCase(),
      render: (i) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{i.monitorId?.name ?? "Monitor"}</div>
          <div className="truncate text-[11px] text-muted">{i.monitorId?.url ?? ""}</div>
        </div>
      ),
    },
    {
      key: "project",
      header: "Project",
      sortValue: (i) => (i.monitorId?.projectId?.name ?? "").toLowerCase(),
      render: (i) => <span className="text-muted">{i.monitorId?.projectId?.name ?? "—"}</span>,
    },
    {
      key: "started",
      header: "Started",
      className: "whitespace-nowrap",
      sortValue: (i) => new Date(i.startedAt).getTime(),
      render: (i) => <span className="text-muted">{formatDateTime(i.startedAt)}</span>,
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      className: "whitespace-nowrap tabular-nums",
      sortValue: (i) => i.durationSec ?? Number.MAX_SAFE_INTEGER, // ongoing sorts last
      render: (i) => formatDuration(i.durationSec),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={incidents}
      rowKey={(i) => i._id}
      onRowClick={(i) => {
        if (i.monitorId?._id) router.push(`/monitors/${i.monitorId._id}?tab=incidents&incident=${i._id}`);
      }}
      initialSort={{ key: "started", dir: "desc" }}
    />
  );
}
