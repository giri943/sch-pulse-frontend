"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUptimeOverview, useDashboardStats } from "@/lib/hooks";
import { Card, CardTitle, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";

const RANGES = ["24h", "7d", "30d"] as const;

export function UptimeOverview() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("24h");
  const { data, isLoading } = useUptimeOverview(range);
  const { data: dash } = useDashboardStats();
  const stats = dash?.stats;

  const series =
    data?.series.map((p) => ({
      t: new Date(p.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }),
      ms: p.avgResponseMs, // null = no data → rendered as a gap, not a 0 dip
    })) ?? [];

  return (
    <Card>
      <CardTitle
        right={
          <div className="flex items-center gap-3">
            {stats?.uptime30d != null && (
              <span className="text-xs text-up font-medium">{stats.uptime30d}% · 30d</span>
            )}
            <div className="flex gap-0.5 bg-bg border border-border rounded-lg p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs transition-colors",
                    range === r ? "bg-brand text-white" : "text-muted hover:text-fg",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        }
      >
        Response time &amp; uptime
      </CardTitle>
      {isLoading ? (
        <Skeleton className="h-56" />
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -8, right: 4, top: 4 }}>
              <defs>
                <linearGradient id="up-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} minTickGap={48} tickLine={false} axisLine={false} />
              <YAxis dataKey="ms" tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} width={44} tickLine={false} axisLine={false} unit="ms" />
              <Tooltip
                contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "rgb(var(--fg))" }}
              />
              <Area type="monotone" dataKey="ms" name="avg ms" stroke="#6366f1" fill="url(#up-grad)" strokeWidth={2} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
