"use client";

import Link from "next/link";
import { useStatusBoard } from "@/lib/hooks";
import { Card, CardTitle, StatusDot, Skeleton, EmptyState } from "@/components/ui";

export function StatusGrid() {
  const { data, isLoading } = useStatusBoard();

  return (
    <Card>
      <CardTitle right={data ? <span className="text-xs text-muted">{data.length} monitors</span> : null}>
        Monitor status
      </CardTitle>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState icon="📡" title="No monitors yet" description="Create a monitor to see its live status here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.map((m) => (
            <Link
              key={m.monitorId}
              href={`/monitors/${m.monitorId}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg hover:bg-surface-2 transition-colors px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <StatusDot status={m.status} pulse />
                <div className="min-w-0">
                  <div className="text-sm truncate">{m.name}</div>
                  <div className="text-[11px] text-muted truncate">{m.url}</div>
                </div>
              </div>
              <span className="text-xs text-muted shrink-0">
                {m.lastResponseTimeMs != null ? `${m.lastResponseTimeMs}ms` : "—"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
