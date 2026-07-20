"use client";

import type { ViewMode } from "@/lib/useViewPreference";
import { cn } from "@/lib/cn";

const GridIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const RowsIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

/** Card ⇄ Table view switcher. */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const items: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: "card", label: "Card view", icon: <GridIcon /> },
    { mode: "table", label: "Table view", icon: <RowsIcon /> },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {items.map((it) => (
        <button
          key={it.mode}
          type="button"
          onClick={() => onChange(it.mode)}
          title={it.label}
          aria-label={it.label}
          aria-pressed={value === it.mode}
          className={cn(
            "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
            value === it.mode ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
          )}
        >
          {it.icon}
        </button>
      ))}
    </div>
  );
}
