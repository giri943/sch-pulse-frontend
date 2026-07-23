"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/hooks";
import { useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/mutations";
import { cn } from "@/lib/cn";
import type { AppNotification } from "@/lib/types";

const ICON: Record<AppNotification["type"], string> = {
  mention: "💬",
  project: "📁",
  incident: "🚨",
  maintenance: "🛠️",
  expiry: "⏰",
};

function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  function openItem(n: AppNotification) {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-full transition-colors",
          open ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-down ring-2 ring-surface" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] origin-top-right animate-fade-in overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_48px_-12px_rgb(0_0_0/0.5)] ring-1 ring-black/5">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.01em]">Notifications</span>
              {unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand/15 px-1.5 text-[11px] font-semibold text-brand">{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button type="button" onClick={() => markAll.mutate()} className="text-[12px] font-medium text-brand transition-opacity hover:opacity-70">
                Mark all read
              </button>
            )}
          </div>

          {!items.length ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-xl">🔔</div>
              <div className="text-sm font-medium">You&apos;re all caught up</div>
              <div className="mt-0.5 text-[12px] text-muted">New activity will show up here.</div>
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto border-t border-border py-1">
              {items.map((n) => (
                <li key={n.id} className="px-1.5">
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2",
                      !n.read && "bg-brand/[0.05]",
                    )}
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-surface-2 text-[15px]">{ICON[n.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13px] leading-snug", n.read ? "text-fg/90" : "font-semibold text-fg")}>{n.title}</span>
                      {n.body && <span className="mt-0.5 block truncate text-[12px] text-muted">{n.body}</span>}
                    </span>
                    <span className="flex flex-none flex-col items-end gap-1 pt-0.5">
                      <span className="text-[11px] tabular-nums text-muted/70">{ago(n.createdAt)}</span>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-brand" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
