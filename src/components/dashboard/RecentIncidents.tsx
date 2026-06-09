"use client";

import { useRecentIncidents } from "@/lib/hooks";
import { Card, CardTitle, StatusBadge } from "@/components/ui";

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
      <CardTitle>Recent Incidents</CardTitle>
      {isLoading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : !data?.length ? (
        <p className="text-muted text-sm">No incidents 🎉</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((i) => (
            <li key={i._id} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-sm">{i.monitorId?.name ?? "—"}</div>
                <div className="text-xs text-muted">
                  {new Date(i.startedAt).toLocaleString()} · {duration(i.durationSec)}
                </div>
              </div>
              <StatusBadge status={i.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
