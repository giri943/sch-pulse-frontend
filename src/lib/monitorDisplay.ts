// Small display helpers shared by the monitor card and the monitor table.

/** Relative "time ago" from an ISO timestamp. */
export function ago(iso?: string | null): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Whole days from now until `iso` (negative = already past). */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** "in 34d" / "in 1d" / "today" / "expired" / "—". */
export function expiryLabel(iso?: string | null): string {
  const d = daysUntil(iso);
  if (d == null) return "—";
  if (d < 0) return "expired";
  if (d === 0) return "today";
  return `in ${d}d`;
}

/** Tailwind text tone class for an expiry date (red ≤0, amber ≤15, green else). */
export function expiryTone(iso?: string | null): string {
  const d = daysUntil(iso);
  if (d == null) return "text-muted";
  if (d < 0) return "text-down";
  if (d <= 15) return "text-degraded";
  return "text-up";
}
