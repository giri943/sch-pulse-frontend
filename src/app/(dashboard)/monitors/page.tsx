"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useMe, can, isSuperAdmin, PERM } from "@/lib/permissions";
import type { Monitor, Paginated } from "@/lib/types";
import { Button, PageHeader, Input, Select, Skeleton, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { MonitorCard } from "@/components/MonitorCard";
import { MonitorFormModal } from "@/components/MonitorFormModal";
import { JoinMonitorModal } from "@/components/JoinMonitorModal";
import { ArchivedMonitors } from "@/components/ArchivedMonitors";
import { cn } from "@/lib/cn";

function MonitorsInner() {
  const params = useSearchParams();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [editing, setEditing] = useState<Monitor | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name");
  const [archived, setArchived] = useState(false);

  const typeFilter = params.get("type"); // website | api | ssl | null (from sidebar)

  const { data, isLoading } = useQuery({
    queryKey: ["monitors"],
    queryFn: () => apiFetch<Paginated<Monitor>>("/monitors?limit=100"),
    refetchInterval: 15_000,
  });

  const canCreate = can(me, PERM.MONITOR_CREATE);
  const canManage =
    isSuperAdmin(me) ||
    !!me?.permissions.some(
      (p) => p.startsWith("monitor:update") || p.startsWith("monitor:run") || p.startsWith("monitor:delete"),
    );

  const monitors = useMemo(() => {
    let list = data?.data ?? [];
    if (typeFilter) list = list.filter((m) => m.type === typeFilter);
    if (status !== "all") list = list.filter((m) => (status === "paused" ? !m.enabled : m.status === status));
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(needle) || m.url.toLowerCase().includes(needle));
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "latency") sorted.sort((a, b) => (b.lastResponseTimeMs ?? 0) - (a.lastResponseTimeMs ?? 0));
    if (sort === "status") sorted.sort((a, b) => a.status.localeCompare(b.status));
    return sorted;
  }, [data, typeFilter, status, q, sort]);

  const title = typeFilter ? `${typeFilter.toUpperCase()} monitors` : "Monitors";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Search, filter and manage everything you're watching."
        actions={
          canCreate && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setJoinOpen(true)}>
                <Icon name="search" width={15} height={15} /> Join a monitor
              </Button>
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Icon name="plus" width={15} height={15} /> New Monitor
              </Button>
            </div>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" width={15} height={15} />
          </span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or URL…" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="operational">Operational</option>
          <option value="degraded">Degraded</option>
          <option value="down">Down</option>
          <option value="paused">Paused</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          <option value="name">Sort: Name</option>
          <option value="latency">Sort: Latency</option>
          <option value="status">Sort: Status</option>
        </Select>
        <button
          onClick={() => setArchived((v) => !v)}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm transition-colors",
            archived ? "border-brand bg-brand/15 text-fg" : "border-border text-muted hover:text-fg",
          )}
        >
          🗃️ Archived
        </button>
      </div>

      {archived ? (
        <ArchivedMonitors canManage={canManage} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !monitors.length ? (
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState
            icon="📡"
            title={data?.data.length ? "No monitors match your filters" : "No monitors yet"}
            description={data?.data.length ? "Try clearing the search or filters." : "Create your first monitor to start tracking uptime, response time and SSL."}
            action={canCreate && !data?.data.length ? <Button onClick={() => { setEditing(null); setOpen(true); }}>+ New Monitor</Button> : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
          {monitors.map((m) => (
            <MonitorCard key={m._id} monitor={m} canManage={canManage} onEdit={(mm) => { setEditing(mm); setOpen(true); }} />
          ))}
        </div>
      )}

      <MonitorFormModal key={editing?._id ?? "new"} open={open} onClose={() => setOpen(false)} monitor={editing} />
      <JoinMonitorModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

export default function MonitorsPage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
      <MonitorsInner />
    </Suspense>
  );
}
