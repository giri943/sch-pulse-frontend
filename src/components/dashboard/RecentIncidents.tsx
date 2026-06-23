"use client";

import { useRecentIncidents } from "@/lib/hooks";
import { Card, CardTitle, StatusDot, Skeleton, EmptyState } from "@/components/ui";

function duration(sec: number | null): string {
  if (sec == null) return "ongoing";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function RecentIncidents() {
  const { data, isLoading } = useRecentIncidents();

  return (
    <Card>
      <CardTitle>Recent incidents</CardTitle>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState icon="✅" title="All clear" description="No incidents recorded. Everything is operating normally." />
      ) : (
        <ul className="relative max-h-72 space-y-1 overflow-y-auto pr-1 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-border">
          {data.map((i) => (
            <li key={i._id} className="relative flex items-start gap-3 pl-5 py-1.5">
              <span className="absolute left-0 top-2.5">
                <StatusDot status={i.status} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{i.monitorId?.name ?? "Monitor"}</div>
                <div className="truncate text-[11px] text-muted">
                  {i.monitorId?.projectId?.name && <span className="text-fg/65">{i.monitorId.projectId.name} · </span>}
                  {i.status === "open" ? "Down" : "Recovered"} · {new Date(i.startedAt).toLocaleString()}
                </div>
              </div>
              <span className="text-xs text-muted shrink-0">{duration(i.durationSec)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
