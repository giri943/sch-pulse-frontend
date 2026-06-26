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
