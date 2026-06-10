/** Tiny classnames joiner (clsx-lite) — no dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
