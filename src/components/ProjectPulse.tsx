"use client";

import { useMemo } from "react";

type PulseState = "up" | "down" | "idle";

/**
 * Build a repeating heartbeat polyline across a 300×32 viewBox (baseline y=16).
 * Healthy = a calm, sparse beat; down = a faster, sharper rhythm; idle = flat.
 */
function buildPath(state: PulseState): string {
  const W = 300;
  const mid = 16;
  if (state === "idle") return `M0 ${mid} H${W}`;

  const beats = state === "down" ? 5 : 3;
  const amp = state === "down" ? 11 : 8;
  const step = W / beats;
  let d = `M0 ${mid}`;
  for (let i = 0; i < beats; i++) {
    const x = i * step;
    const f = (k: number) => (x + step * k).toFixed(1);
    d +=
      ` L${f(0.3)} ${mid}` +
      ` L${f(0.4)} ${(mid - amp * 0.35).toFixed(1)}` +
      ` L${f(0.48)} ${(mid + amp).toFixed(1)}` +
      ` L${f(0.56)} ${(mid - amp).toFixed(1)}` +
      ` L${f(0.64)} ${(mid + amp * 0.3).toFixed(1)}` +
      ` L${f(0.72)} ${mid}` +
      ` L${f(1)} ${mid}`;
  }
  return d;
}

/**
 * A small live ECG trace for a project card, tinted by health. A faint full
 * trace sits underneath a brighter blip that sweeps along it — the project's
 * "pulse". Purely decorative (aria-hidden); the status text carries the meaning.
 */
export function ProjectPulse({ monitorCount, downCount }: { monitorCount: number; downCount: number }) {
  const state: PulseState = monitorCount === 0 ? "idle" : downCount > 0 ? "down" : "up";
  const d = useMemo(() => buildPath(state), [state]);
  const color = state === "down" ? "rgb(var(--down))" : state === "up" ? "rgb(var(--up))" : "rgb(var(--muted))";

  return (
    <div className="h-7 w-full overflow-hidden" aria-hidden>
      <svg viewBox="0 0 300 32" preserveAspectRatio="none" width="100%" height="28">
        <path d={d} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {state !== "idle" && (
          <path
            className="card-ecg-sweep"
            pathLength={100}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animationDuration: state === "down" ? "2s" : "3.2s" }}
          />
        )}
      </svg>
    </div>
  );
}
