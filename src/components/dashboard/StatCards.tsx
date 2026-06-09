"use client";

import { useDashboardStats } from "@/lib/hooks";
import { Card } from "@/components/ui";

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${accent ?? ""}`}>{value}</div>
    </Card>
  );
}

export function StatCards() {
  const { data, isLoading } = useDashboardStats();
  const s = data?.stats;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Total Monitors" value={isLoading ? "…" : String(s?.totalMonitors ?? 0)} />
      <Stat
        label="Monitors Down"
        value={isLoading ? "…" : String(s?.monitorsDown ?? 0)}
        accent={s && s.monitorsDown > 0 ? "text-down" : "text-up"}
      />
      <Stat
        label="Open Incidents"
        value={isLoading ? "…" : String(s?.openIncidents ?? 0)}
        accent={s && s.openIncidents > 0 ? "text-down" : "text-up"}
      />
      <Stat label="Uptime (30d)" value={isLoading ? "…" : `${s?.uptime30d ?? 100}%`} accent="text-up" />
    </div>
  );
}
