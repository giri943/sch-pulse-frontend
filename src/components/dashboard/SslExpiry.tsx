"use client";

import { useSslExpiring } from "@/lib/hooks";
import { Card, CardTitle } from "@/components/ui";

function tone(days: number | null): string {
  if (days == null) return "text-muted";
  if (days <= 7) return "text-down";
  if (days <= 15) return "text-degraded";
  return "text-up";
}

export function SslExpiry() {
  const { data, isLoading } = useSslExpiring();
  return (
    <Card>
      <CardTitle>SSL Expiring</CardTitle>
      {isLoading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : !data?.length ? (
        <p className="text-muted text-sm">No certificates nearing expiry.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((c) => (
            <li key={c.monitorId} className="flex items-center justify-between py-2.5">
              <span className="text-sm truncate">{c.name}</span>
              <span className={`text-sm font-medium ${tone(c.daysRemaining)}`}>
                {c.daysRemaining != null ? `${c.daysRemaining}d` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
