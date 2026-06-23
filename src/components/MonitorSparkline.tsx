"use client";

import { useId } from "react";

/**
 * A compact 24h response-time sparkline for a monitor card: a line with a soft
 * area fill, tinted by health. Falls back to a dashed baseline when there isn't
 * enough data yet. Decorative — the numeric stats carry the precise values.
 */
export function MonitorSparkline({ points, color }: { points: number[]; color: string }) {
  const id = useId();
  const W = 100;
  const H = 28;
  const pad = 3;
  const pts = points?.filter((n) => Number.isFinite(n)) ?? [];

  if (pts.length < 2) {
    return (
      <svg className="h-7 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgb(var(--border))" strokeWidth="1" strokeDasharray="2 3" />
      </svg>
    );
  }

  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const stepX = W / (pts.length - 1);
  const xy = pts.map((p, i) => [i * stepX, pad + (H - 2 * pad) * (1 - (p - min) / range)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg className="h-7 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
