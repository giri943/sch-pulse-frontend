/**
 * App-wide date formatting — always dd/mm/yyyy, independent of the viewer's
 * machine locale (which would otherwise render US-style mm/dd/yyyy). Use these
 * instead of bare toLocaleDateString()/toLocaleString().
 */

/** dd/mm/yyyy (e.g. 24/06/2026), or "—" when missing/invalid. */
export function formatDate(iso?: string | Date | null): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** dd/mm/yyyy, HH:MM — only the date order is pinned; time follows the viewer's locale. */
export function formatDateTime(iso?: string | Date | null): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(d)}, ${time}`;
}

/**
 * Human duration from seconds. Rolls up into days beyond 24h so a long outage
 * reads "31d 23h 14m" rather than "767h 14m". null → "ongoing".
 */
export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "ongoing";
  if (sec < 60) return `${sec}s`;
  const totalMin = Math.floor(sec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const totalHours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (totalHours < 24) return `${totalHours}h ${mins}m`;
  return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h ${mins}m`;
}
