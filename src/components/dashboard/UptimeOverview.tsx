"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUptimeOverview, useProjects } from "@/lib/hooks";
import { Card, Select, Skeleton } from "@/components/ui";
import { UptimeCalendar } from "@/components/UptimeCalendar";
import type { UptimePoint } from "@/lib/types";
import { cn } from "@/lib/cn";

const RANGES = ["24h", "7d", "30d"] as const;
type Range = (typeof RANGES)[number];
type Metric = "uptime" | "response";

function fmt(t: string, range: Range): string {
  const d = new Date(t);
  return range === "24h"
    ? d.toLocaleString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" });
}

/**
 * Dashboard uptime card. "Uptime" is a month calendar heatmap (one cell per day);
 * "Response time" is the hourly avg-latency chart over 24h/7d/30d.
 */
export function UptimeOverview() {
  const [range, setRange] = useState<Range>("24h");
  const [metric, setMetric] = useState<Metric>("uptime");
  const [projectId, setProjectId] = useState("");
  const { data: projects } = useProjects();

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-auto text-xs">
            <option value="">All projects</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Segmented<Metric>
            value={metric}
            onChange={setMetric}
            options={[
              { k: "uptime", label: "Uptime" },
              { k: "response", label: "Response time" },
            ]}
          />
        </div>
        {metric === "response" && (
          <Segmented<Range> value={range} onChange={setRange} options={RANGES.map((r) => ({ k: r, label: r }))} />
        )}
      </div>

      {metric === "uptime" ? (
        // key resets the calendar to the current month when the project changes.
        <UptimeCalendar key={projectId} projectId={projectId || undefined} />
      ) : (
        <ResponseChart range={range} projectId={projectId || undefined} />
      )}
    </Card>
  );
}

function ResponseChart({ range, projectId }: { range: Range; projectId?: string }) {
  const { data, isLoading } = useUptimeOverview(range, projectId);
  const series = useMemo(() => data?.series ?? [], [data]);
  const responseSeries = useMemo(
    () => series.map((p: UptimePoint) => ({ t: fmt(p.t, range), ms: p.avgResponseMs })),
    [series, range],
  );
  const hasData = series.some((p) => (p.count ?? 0) > 0);

  if (isLoading) return <Skeleton className="h-56" />;
  if (!hasData) return <div className="grid h-56 place-items-center text-sm text-muted">No data for this period yet.</div>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={responseSeries} margin={{ left: 4, right: 4, top: 4 }}>
          <defs>
            <linearGradient id="up-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} minTickGap={48} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} width={64} tickLine={false} axisLine={false} unit="ms" />
          <Tooltip
            contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: "rgb(var(--fg))" }}
          />
          <Area type="monotone" dataKey="ms" name="avg ms" stroke="#6366f1" fill="url(#up-grad)" strokeWidth={2} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { k: T; label: string }[];
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-border bg-bg p-0.5">
      {options.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            value === o.k ? "bg-brand text-white" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
