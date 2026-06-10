"use client";

import { useDashboardStats, useStatusBoard, useSslExpiring } from "@/lib/hooks";
import { MetricCard } from "@/components/MetricCard";
import { Icon } from "@/components/icons";

export function KpiGrid() {
  const { data: dash, isLoading: ls } = useDashboardStats();
  const { data: board, isLoading: lb } = useStatusBoard();
  const { data: ssl, isLoading: lssl } = useSslExpiring();
  const stats = dash?.stats;

  const count = (s: string) => (board ?? []).filter((m) => m.status === s).length;
  const total = board?.length ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <MetricCard label="Total monitors" value={total} icon={<Icon name="activity" width={15} height={15} />} loading={lb} hint={stats ? `${stats.uptime30d}% uptime · 30d` : undefined} />
      <MetricCard label="Healthy" value={count("operational")} tone="up" icon="●" loading={lb} />
      <MetricCard label="Degraded" value={count("degraded")} tone="degraded" icon="●" loading={lb} />
      <MetricCard label="Down" value={count("down")} tone="down" icon="●" loading={lb} />
      <MetricCard label="SSL expiring" value={ssl?.length ?? 0} tone="degraded" icon={<Icon name="shield" width={15} height={15} />} loading={lssl} />
      <MetricCard label="Active incidents" value={stats?.openIncidents ?? 0} tone={stats && stats.openIncidents > 0 ? "down" : "up"} icon={<Icon name="alert" width={15} height={15} />} loading={ls} />
    </div>
  );
}
