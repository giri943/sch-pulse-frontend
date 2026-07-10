"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useProjects } from "@/lib/hooks";
import type { IncidentRow, Paginated } from "@/lib/types";
import { PageHeader, Card, StatusBadge, StatusDot, Select, Skeleton, EmptyState } from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/dates";


export default function IncidentsPage() {
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const { data: projects } = useProjects();
  const { data, isLoading } = useQuery({
    queryKey: ["incidents", status, projectId],
    queryFn: () =>
      apiFetch<Paginated<IncidentRow>>(
        `/incidents?limit=50${status ? `&status=${status}` : ""}${projectId ? `&projectId=${projectId}` : ""}`,
      ),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6 mx-auto w-full max-w-[1200px]">
      <PageHeader
        title="Incidents"
        subtitle="Downtime events across the monitors you can see."
        actions={
          <div className="flex items-center gap-2">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-auto">
              <option value="">All projects</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </Select>
          </div>
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
            {data.data.map((i) => {
              const href = i.monitorId?._id
                ? `/monitors/${i.monitorId._id}?tab=incidents&incident=${i._id}`
                : "#";
              return (
                <li key={i._id} className="relative pl-6">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2"><StatusDot status={i.status} pulse /></span>
                  <Link href={href} className="group flex items-center gap-3 rounded-lg py-2.5 pr-1 transition-colors hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium group-hover:text-brand">{i.monitorId?.name ?? "Monitor"}</span>
                        <StatusBadge status={i.status} />
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {i.monitorId?.projectId?.name && <span className="text-fg/65">{i.monitorId.projectId.name} · </span>}
                        {i.monitorId?.url ?? ""} · started {formatDateTime(i.startedAt)}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm text-muted">{formatDuration(i.durationSec)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
