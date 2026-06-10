"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { UserLite } from "@/lib/types";

/** Searchable multi-select of users (typeahead against /users/search). */
export function UserPicker({
  value,
  onChange,
}: {
  value: UserLite[];
  onChange: (users: UserLite[]) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const { data: results } = useQuery({
    queryKey: ["users", "search", q],
    queryFn: () => apiFetch<UserLite[]>(`/users/search?q=${encodeURIComponent(q)}`),
    enabled: open,
    staleTime: 10_000,
  });

  const selectedIds = new Set(value.map((u) => u.id));
  const suggestions = (results ?? []).filter((u) => !selectedIds.has(u.id));

  function add(u: UserLite) {
    onChange([...value, u]);
    setQ("");
  }
  function remove(id: string) {
    onChange(value.filter((u) => u.id !== id));
  }

  return (
    <div className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 bg-brand/15 text-fg rounded-full pl-2 pr-1 py-0.5 text-xs">
              {u.name}
              <button type="button" onClick={() => remove(u.id)} className="text-muted hover:text-down px-1">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search teammates by name or email…"
        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
          {suggestions.map((u) => (
            <button
              type="button"
              key={u.id}
              onMouseDown={(e) => {
                e.preventDefault();
                add(u);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg"
            >
              <div>{u.name}</div>
              <div className="text-xs text-muted">{u.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
