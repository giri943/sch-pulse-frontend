"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStatusBoard } from "@/lib/hooks";
import { Card, CardTitle, Skeleton, EmptyState } from "@/components/ui";
import { MonitorSparkline } from "@/components/MonitorSparkline";
import { initials, projectTint } from "@/lib/projectVisual";
import { statusColor, statusRank } from "@/lib/status";

export function StatusGrid() {
  const { data, isLoading } = useStatusBoard();

  // Surface trouble first: down → degraded → operational → unknown → paused.
  const rows = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => statusRank(a.status, a.enabled) - statusRank(b.status, b.enabled) || a.name.localeCompare(b.name),
      ),
    [data],
  );

  return (
    <Card>
      <CardTitle right={data ? <span className="text-xs text-muted">{data.length} monitors</span> : null}>
        Monitor status
      </CardTitle>
      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState icon="📡" title="No monitors yet" description="Create a monitor to see its live status here." />
      ) : (
        <div className="-mx-2 max-h-72 overflow-y-auto pr-1">
          {rows.map((m) => {
            const { color, glow } = statusColor(m.status, m.enabled);
            const tint = projectTint(m.name);
            return (
              <Link
                key={m.monitorId}
                href={`/monitors/${m.monitorId}`}
                className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-surface-2"
              >
                {/* Identity + a presence dot for status, so the name keeps the full row width */}
                <span className="relative flex-none">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-lg text-xs font-bold tracking-tight"
                    style={{ background: tint.bg, color: tint.fg }}
                    aria-hidden
                  >
                    {initials(m.name)}
                  </span>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface"
                    style={{ background: color, boxShadow: `0 0 0 2px ${glow}` }}
                    aria-hidden
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium group-hover:text-brand" title={m.name}>
                    {m.name}
                  </div>
                  <div className="truncate text-[11px] text-muted" title={m.url}>
                    {m.url}
                  </div>
                </div>

                <div className="hidden w-16 flex-none sm:block">
                  <MonitorSparkline points={m.spark ?? []} color={color} />
                </div>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted">
                  {m.lastResponseTimeMs != null ? `${m.lastResponseTimeMs}ms` : "—"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
