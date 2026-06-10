"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Channel } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Multi-select of Google Chat / notification channels (checkbox list). */
export function ChannelPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data: channels } = useQuery({ queryKey: ["channels"], queryFn: () => apiFetch<Channel[]>("/channels") });

  if (!channels) return <div className="text-xs text-muted">Loading channels…</div>;
  if (!channels.length)
    return <div className="text-xs text-muted">No channels yet. Add one in Settings → Channels to enable Google Chat alerts.</div>;

  const toggle = (id: string) => (value.includes(id) ? onChange(value.filter((x) => x !== id)) : onChange([...value, id]));

  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((c) => {
        const on = value.includes(c.id);
        return (
          <button
            type="button"
            key={c.id}
            onClick={() => toggle(c.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
              on ? "border-brand bg-brand/15 text-fg" : "border-border text-muted hover:text-fg hover:bg-surface-2",
            )}
          >
            <span className={cn("h-3.5 w-3.5 grid place-items-center rounded-[4px] border text-[9px]", on ? "bg-brand border-brand text-white" : "border-border")}>
              {on ? "✓" : ""}
            </span>
            💬 {c.name}
          </button>
        );
      })}
    </div>
  );
}
