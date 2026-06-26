"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface PopoverItem {
  id: string;
  href: string;
  title: string;
  sub?: string;
  meta?: string;
  metaTone?: string;
}

/**
 * A count chip that drills into the entities behind it. Click (or hover) opens a
 * menu listing each item; arrow keys move the highlight, Enter opens, Esc closes,
 * and every row is a real link — so mouse, keyboard and touch all work. When the
 * count is zero the chip is inert (nothing to drill into).
 */
export function EntityPopover({
  label,
  value,
  tone,
  items,
  emptyText = "Nothing to show",
}: {
  label: string;
  value: string | number;
  tone?: "down" | "degraded";
  items: PopoverItem[];
  emptyText?: string;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toneText = tone === "down" ? "text-down" : tone === "degraded" ? "text-degraded" : "text-fg";
  const disabled = items.length === 0;

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus the panel when it opens so arrow keys work immediately.
  useEffect(() => {
    if (open) {
      setHi(0);
      panelRef.current?.focus();
    }
  }, [open]);

  function openWithHover() {
    if (disabled) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 120);
  }
  function closeWithHover() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(false), 160);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[hi];
      if (item) {
        setOpen(false);
        router.push(item.href);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={openWithHover} onMouseLeave={closeWithHover}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "w-full rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors",
          !disabled && "hover:border-brand/40 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
          disabled && "cursor-default",
        )}
      >
        <div className="flex items-center justify-between gap-1 text-[10px] uppercase tracking-wide text-muted">
          <span className="truncate">{label}</span>
          {!disabled && <Icon name="chevron" width={12} height={12} className={cn("shrink-0 transition-transform", open && "rotate-180")} />}
        </div>
        <div className={cn("mt-1 text-lg font-semibold tabular-nums", toneText)}>{value}</div>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute right-0 z-30 mt-2 max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-pop outline-none animate-fade-in"
        >
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted">{emptyText}</div>
          ) : (
            items.map((it, i) => (
              <Link
                key={it.id}
                href={it.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                onMouseEnter={() => setHi(i)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                  i === hi ? "bg-surface-2" : "hover:bg-surface-2/60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{it.title}</div>
                  {it.sub && <div className="truncate text-[11px] text-muted">{it.sub}</div>}
                </div>
                {it.meta && <span className={cn("shrink-0 text-xs font-medium", it.metaTone ?? "text-muted")}>{it.meta}</span>}
                <Icon name="arrowRight" width={13} height={13} className="shrink-0 text-muted/60" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
