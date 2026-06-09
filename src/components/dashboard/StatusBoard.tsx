"use client";

import { useStatusBoard } from "@/lib/hooks";
import { Card, CardTitle, StatusBadge } from "@/components/ui";

export function StatusBoard() {
  const { data, isLoading } = useStatusBoard();
  return (
    <Card>
      <CardTitle>Monitor Status Board</CardTitle>
      {isLoading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : !data?.length ? (
        <p className="text-muted text-sm">No monitors yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((m) => (
            <li key={m.monitorId} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-sm">{m.name}</div>
                <div className="text-xs text-muted truncate max-w-[220px]">{m.url}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {m.lastResponseTimeMs != null ? `${m.lastResponseTimeMs}ms` : "—"}
                </span>
                <StatusBadge status={m.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
