"use client";

import { useEffect, useState } from "react";

export type ViewMode = "card" | "table";

/**
 * Card/Table view preference, persisted per-surface in localStorage so a user's
 * choice sticks across visits. SSR-safe (reads on mount, defaults until then).
 */
export function useViewPreference(key: string, def: ViewMode = "card"): [ViewMode, (v: ViewMode) => void] {
  const storageKey = `pulse_view_${key}`;
  const [view, setView] = useState<ViewMode>(def);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "card" || stored === "table") setView(stored);
    } catch {
      /* ignore (private mode / SSR) */
    }
  }, [storageKey]);

  const set = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(storageKey, v);
    } catch {
      /* ignore */
    }
  };

  return [view, set];
}
