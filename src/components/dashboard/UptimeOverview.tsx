"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUptimeOverview } from "@/lib/hooks";
import { Card, Skeleton } from "@/components/ui";
import type { UptimePoint } from "@/lib/types";
import { cn } from "@/lib/cn";

const RANGES = ["24h", "7d", "30d"] as const;
type Range = (typeof RANGES)[number];
type Metric = "uptime" | "response";

/** ~56 bars regardless of range, so 7d/30d stay legible (hourly buckets are too many). */
const TARGET_BARS = 56;

function fmt(t: string, range: Range): string {
  const d = new Date(t);
  return range === "24h"
    ? d.toLocaleString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" });
}

function barColor(uptime: number | null): { bg: string; opacity: number } {
  if (uptime == null) return { bg: "rgb(var(--border))", opacity: 0.5 };
  if (uptime >= 99.5) return { bg: "rgb(var(--up))", opacity: 1 };
  if (uptime >= 90) return { bg: "rgb(var(--degraded))", opacity: 1 };
  return { bg: "rgb(var(--down))", opacity: 1 };
}

export function UptimeOverview() {
  const [range, setRange] = useState<Range>("24h");
  const [metric, setMetric] = useState<Metric>("uptime");
  const { data, isLoading } = useUptimeOverview(range);
  const series = useMemo(() => data?.series ?? [], [data]);

  // Accurate range-wide uptime from raw counts.
  const rangeUptime = useMemo(() => {
    const ups = series.reduce((s, p) => s + (p.ups ?? 0), 0);
    const count = series.reduce((s, p) => s + (p.count ?? 0), 0);
    return count ? Number(((ups / count) * 100).toFixed(2)) : null;
  }, [series]);

  // Downsample hourly buckets into ~TARGET_BARS, re-deriving uptime from raw counts.
  const bars = useMemo(() => {
    const n = series.length;
    if (!n) return [] as { t: string; tEnd: string; uptime: number | null }[];
    const size = Math.max(1, Math.ceil(n / TARGET_BARS));
    const out: { t: string; tEnd: string; uptime: number | null }[] = [];
    for (let i = 0; i < n; i += size) {
      const chunk = series.slice(i, i + size);
      const ups = chunk.reduce((s, p) => s + (p.ups ?? 0), 0);
      const count = chunk.reduce((s, p) => s + (p.count ?? 0), 0);
      out.push({ t: chunk[0].t, tEnd: chunk[chunk.length - 1].t, uptime: count ? (ups / count) * 100 : null });
    }
    return out;
  }, [series]);

  const responseSeries = useMemo(
    () => series.map((p: UptimePoint) => ({ t: fmt(p.t, range), ms: p.avgResponseMs })),
    [series, range],
  );

  const uptimeTone = rangeUptime == null ? "text-muted" : rangeUptime >= 99.5 ? "text-up" : rangeUptime >= 95 ? "text-degraded" : "text-down";
  const hasData = series.some((p) => (p.count ?? 0) > 0);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Metric>
          value={metric}
          onChange={setMetric}
          options={[
            { k: "uptime", label: "Uptime" },
            { k: "response", label: "Response time" },
          ]}
        />
        <div className="flex items-center gap-3">
          {rangeUptime != null && (
            <span className={cn("text-sm font-semibold tabular-nums", uptimeTone)}>
              {rangeUptime}% <span className="font-normal text-muted">· {range}</span>
            </span>
          )}
          <Segmented<Range> value={range} onChange={setRange} options={RANGES.map((r) => ({ k: r, label: r }))} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-56" />
      ) : !hasData ? (
        <div className="grid h-56 place-items-center text-sm text-muted">No data for this period yet.</div>
      ) : metric === "uptime" ? (
        <div className="h-56">
          <div
            className="flex h-44 items-stretch gap-[2px]"
            role="img"
            aria-label={`Uptime over ${range}: ${rangeUptime == null ? "no data" : `${rangeUptime}%`}`}
          >
            {bars.map((b, i) => {
              const c = barColor(b.uptime);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-[2px] transition-opacity hover:opacity-80"
                  style={{ background: c.bg, opacity: c.opacity }}
                  title={`${fmt(b.t, range)}${b.tEnd !== b.t ? `–${fmt(b.tEnd, range)}` : ""} · ${b.uptime == null ? "no data" : `${b.uptime.toFixed(1)}% uptime`}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
            <span>{series.length ? fmt(series[0].t, range) : ""}</span>
            <Legend />
            <span>{series.length ? fmt(series[series.length - 1].t, range) : "now"}</span>
          </div>
        </div>
      ) : (
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
      )}
    </Card>
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

function Legend() {
  const items = [
    { c: "--up", l: "100%" },
    { c: "--degraded", l: "≥90%" },
    { c: "--down", l: "<90%" },
  ];
  return (
    <div className="hidden items-center gap-3 sm:flex">
      {items.map((i) => (
        <span key={i.l} className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: `rgb(var(${i.c}))` }} />
          {i.l}
        </span>
      ))}
    </div>
  );
}
