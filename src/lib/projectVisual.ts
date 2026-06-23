/**
 * Deterministic visual identity for a project: a monogram + a tint.
 *
 * Tints are a small curated set chosen to harmonize with the indigo brand —
 * not a random rainbow. The same name always maps to the same tint, so a
 * project keeps its colour across sessions and views.
 */

// [r, g, b] — indigo, teal, pink, sky, violet, orange, emerald, rose.
const TINTS: readonly [number, number, number][] = [
  [99, 102, 241],
  [20, 184, 166],
  [244, 114, 182],
  [56, 189, 248],
  [167, 139, 250],
  [251, 146, 60],
  [52, 211, 153],
  [248, 113, 113],
];

const MUTED: [number, number, number] = [138, 146, 167];

/** Up to two initials from a project name (letters/digits only). */
export function initials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** Stable tint for a project. The system (General) project gets a neutral grey. */
export function projectTint(name: string, isSystem = false): { bg: string; fg: string } {
  const [r, g, b] = isSystem ? MUTED : pick(name);
  return { bg: `rgb(${r} ${g} ${b} / 0.14)`, fg: `rgb(${r} ${g} ${b})` };
}

function pick(name: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
