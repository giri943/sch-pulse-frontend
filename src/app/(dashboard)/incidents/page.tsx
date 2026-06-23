"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { IncidentRow, Paginated } from "@/lib/types";
import { PageHeader, Card, StatusBadge, StatusDot, Select, Skeleton, EmptyState } from "@/components/ui";

function duration(sec: number | null): string {
  if (sec == null) return "ongoing";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function IncidentsPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["incidents", status],
    queryFn: () => apiFetch<Paginated<IncidentRow>>(`/incidents?limit=50${status ? `&status=${status}` : ""}`),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6 mx-auto w-full max-w-[1200px]">
      <PageHeader
        title="Incidents"
        subtitle="Downtime events across the monitors you can see."
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </Select>
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : !data?.data.length ? (
          <EmptyState icon="✅" title="No incidents" description="Nothing to see here — all monitored services are healthy." />
        ) : (
          <ul className="relative space-y-1 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {data.data.map((i) => (
              <li key={i._id} className="relative flex items-center gap-3 pl-6 py-2.5">
                <span className="absolute left-0 top-1/2 -translate-y-1/2"><StatusDot status={i.status} pulse /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={i.monitorId ? `/monitors/${(i as unknown as { monitorId: { _id?: string } }).monitorId?._id ?? ""}` : "#"} className="text-sm font-medium truncate hover:text-brand">
                      {i.monitorId?.name ?? "Monitor"}
                    </Link>
                    <StatusBadge status={i.status} />
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    {i.monitorId?.projectId?.name && <span className="text-fg/65">{i.monitorId.projectId.name} · </span>}
                    {i.monitorId?.url ?? ""} · started {new Date(i.startedAt).toLocaleString()}
                  </div>
                </div>
                <span className="text-sm text-muted shrink-0">{duration(i.durationSec)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
