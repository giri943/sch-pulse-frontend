/** Map a monitor status (+ enabled flag) to its theme colour tokens. */
const STATUS_VAR: Record<string, string> = {
  operational: "--up",
  degraded: "--degraded",
  down: "--down",
  paused: "--muted",
  maintenance: "--info",
  unknown: "--muted",
};

export function statusVar(status: string, enabled = true): string {
  return STATUS_VAR[enabled ? status : "paused"] ?? "--muted";
}

export function statusColor(status: string, enabled = true): { color: string; glow: string; cssVar: string } {
  const cssVar = statusVar(status, enabled);
  return { color: `rgb(var(${cssVar}))`, glow: `rgb(var(${cssVar}) / 0.16)`, cssVar };
}

/** Sort rank — surfaces trouble first: down → degraded → operational → unknown → paused. */
export function statusRank(status: string, enabled = true): number {
  if (!enabled) return 4;
  return ({ down: 0, degraded: 1, operational: 2 } as Record<string, number>)[status] ?? 3;
}
