"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUptimeOverview } from "@/lib/hooks";
import { Card, CardTitle } from "@/components/ui";

const RANGES = ["24h", "7d", "30d"] as const;

export function UptimeOverview() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("24h");
  const { data } = useUptimeOverview(range);
  const series =
    data?.series.map((p) => ({
      t: new Date(p.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }),
      uptime: p.uptime ?? 0,
    })) ?? [];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Uptime Overview</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded text-xs ${range === r ? "bg-brand text-white" : "text-muted hover:text-fg"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="up" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tick={{ fill: "#6b7280", fontSize: 11 }} minTickGap={40} />
            <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} width={32} />
            <Tooltip
              contentStyle={{ background: "#11151d", border: "1px solid #1e2530", borderRadius: 8 }}
              labelStyle={{ color: "#e6e9ef" }}
            />
            <Area type="monotone" dataKey="uptime" stroke="#6366f1" fill="url(#up)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
