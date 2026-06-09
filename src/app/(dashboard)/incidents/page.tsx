"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { IncidentRow, Paginated } from "@/lib/types";
import { Card, StatusBadge } from "@/components/ui";

function duration(sec: number | null): string {
  if (sec == null) return "ongoing";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function IncidentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => apiFetch<Paginated<IncidentRow>>("/incidents?limit=50"),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Incidents</h1>
      <Card>
        {isLoading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : !data?.data.length ? (
          <p className="text-muted text-sm">No incidents recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted text-left">
              <tr>
                <th className="py-2">Monitor</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((i) => (
                <tr key={i._id} className="border-t border-border">
                  <td className="py-2.5">{i.monitorId?.name ?? "—"}</td>
                  <td className="text-muted">{new Date(i.startedAt).toLocaleString()}</td>
                  <td className="text-muted">{duration(i.durationSec)}</td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
