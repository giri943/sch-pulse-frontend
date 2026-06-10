"use client";

import Link from "next/link";
import { useSslExpiring } from "@/lib/hooks";
import { Card, CardTitle, Skeleton, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";

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
      <CardTitle>SSL expiring</CardTitle>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState icon="🔒" title="Certificates healthy" description="No SSL certificates are nearing expiry." />
      ) : (
        <ul className="divide-y divide-border">
          {data.map((c) => (
            <li key={c.monitorId} className="flex items-center justify-between py-2.5">
              <Link href={`/monitors/${c.monitorId}`} className="text-sm truncate hover:text-brand">
                {c.name}
              </Link>
              <span className={cn("text-sm font-medium shrink-0", tone(c.daysRemaining))}>
                {c.daysRemaining != null ? `${c.daysRemaining}d` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
