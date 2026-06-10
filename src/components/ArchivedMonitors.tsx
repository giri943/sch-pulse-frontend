"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useRestoreMonitor, useDeleteMonitor } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { Monitor, Paginated } from "@/lib/types";
import { Card, Button, EmptyState, Skeleton } from "@/components/ui";

function purgeIn(softDeletedAt?: string | null): string {
  if (!softDeletedAt) return "";
  const days = 7 - Math.floor((Date.now() - new Date(softDeletedAt).getTime()) / 86400000);
  return days > 0 ? `purges in ${days}d` : "purging soon";
}

export function ArchivedMonitors({ canManage }: { canManage: boolean }) {
  const restore = useRestoreMonitor();
  const del = useDeleteMonitor();
  const toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["monitors", "archived"],
    queryFn: () => apiFetch<Paginated<Monitor>>("/monitors?deleted=true&limit=100"),
  });

  return (
    <Card>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !data?.data.length ? (
        <EmptyState icon="🗃️" title="Nothing archived" description="Expired monitors land here for 7 days before permanent deletion." />
      ) : (
        <ul className="divide-y divide-border">
          {data.data.map((m) => (
            <li key={m._id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="text-sm truncate">{m.name}</div>
                <div className="text-[11px] text-muted truncate">{m.url} · {purgeIn(m.softDeletedAt)}</div>
              </div>
              {canManage && (
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="subtle" onClick={() => restore.mutate(m._id, { onSuccess: () => toast.success("Monitor restored (no expiry)") })}>
                    Restore
                  </Button>
                  <button
                    onClick={() => { if (confirm(`Permanently delete "${m.name}"?`)) del.mutate(m._id, { onSuccess: () => toast.success("Deleted") }); }}
                    className="text-muted hover:text-down text-xs px-2"
                  >
                    Delete now
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
