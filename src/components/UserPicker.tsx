"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { UserLite } from "@/lib/types";

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function Avatar({ user, size = 24 }: { user: UserLite; size?: number }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-brand/20 text-[10px] font-semibold text-brand"
      style={{ width: size, height: size }}
    >
      {initials(user.name)}
    </span>
  );
}

/**
 * Searchable multi-select of users (typeahead against /users/search).
 * The options menu is rendered in a portal so it's never clipped by the
 * scrollable modal it lives in, and always paints above it.
 */
export function UserPicker({
  value,
  onChange,
}: {
  value: UserLite[];
  onChange: (users: UserLite[]) => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Build marker — open the browser console to confirm the deployed bundle is
  // current. If you don't see this line on Vercel, an old build is being served.
  useEffect(() => {
    console.info("[Schbang Pulse] UserPicker build: tagfix-v3 (index-based removal)");
  }, []);

  // Debounce keystrokes before hitting the search API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["users", "search", debouncedQ],
    queryFn: () => apiFetch<UserLite[]>(`/users/search?q=${encodeURIComponent(debouncedQ)}`),
    enabled: open,
    staleTime: 10_000,
  });

  const selectedIds = useMemo(() => new Set(value.map((u) => u.id)), [value]);
  const suggestions = useMemo(
    () => (results ?? []).filter((u) => !selectedIds.has(u.id)),
    [results, selectedIds],
  );

  useEffect(() => {
    setActive(0);
  }, [suggestions.length]);

  // Position the portal menu under the field; track scroll/resize so it follows.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Close on click outside (the menu is portaled, so check both elements).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function add(u: UserLite) {
    if (selectedIds.has(u.id)) return; // never select twice
    onChange([...value, u]);
    setQ("");
    setDebouncedQ("");
    inputRef.current?.focus();
  }
  // Remove by position so a single chip goes even if ids are duplicated/missing.
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && suggestions[active]) {
        e.preventDefault();
        add(suggestions[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && q === "" && value.length > 0) {
      remove(value.length - 1);
    }
  }

  const showMenu = open && rect && typeof document !== "undefined";

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg px-2 py-1.5 focus-within:border-brand"
      >
        {value.map((u, i) => (
          <span
            key={`tag-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand/15 py-0.5 pl-1 pr-1.5 text-xs text-fg"
          >
            <Avatar user={u} size={18} />
            {u.name}
            <button
              type="button"
              onMouseDown={(e) => {
                // mousedown + stopPropagation so neither the field's onClick nor a
                // focus/blur cycle can interfere; remove strictly this chip's index.
                e.preventDefault();
                e.stopPropagation();
                remove(i);
              }}
              className="px-0.5 text-muted hover:text-down"
              aria-label={`Remove ${u.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? "" : "Search teammates by name or email…"}
          className="min-w-[140px] flex-1 bg-transparent py-0.5 text-sm outline-none"
        />
      </div>

      {showMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: rect!.top, left: rect!.left, width: rect!.width, zIndex: 70 }}
            className="max-h-60 overflow-auto rounded-lg border border-border bg-surface shadow-pop"
          >
            {isFetching && suggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted">Searching…</div>
            )}
            {!isFetching && suggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted">
                {debouncedQ ? "No users found" : "Type to search teammates"}
              </div>
            )}
            {suggestions.map((u, i) => (
              <button
                type="button"
                key={u.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused so multi-select works
                  add(u);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  i === active ? "bg-brand/10" : "hover:bg-bg",
                )}
              >
                <Avatar user={u} />
                <span className="min-w-0">
                  <span className="block truncate text-fg">{u.name}</span>
                  <span className="block truncate text-xs text-muted">{u.email}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
