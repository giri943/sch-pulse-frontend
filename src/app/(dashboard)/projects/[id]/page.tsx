"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useProject } from "@/lib/hooks";
import { useMe, can, isSuperAdmin, PERM } from "@/lib/permissions";
import { PageHeader, Button, Input, Select, Skeleton, EmptyState, Card, Tabs } from "@/components/ui";
import { Icon } from "@/components/icons";
import { MonitorCard } from "@/components/MonitorCard";
import { ArchivedMonitorCard } from "@/components/ArchivedMonitorCard";
import { MonitorFormModal } from "@/components/MonitorFormModal";
import { ProjectMembersPanel } from "@/components/ProjectMembersPanel";
import { cn } from "@/lib/cn";
import type { Monitor, Paginated } from "@/lib/types";

export default function ProjectDetailPage() {
  const id = String(useParams().id);
  const { data: me } = useMe();
  const { data: project } = useProject(id);
  const isProjectOwner = project?.myRole === "owner" || project?.myRole === "super";

  const [tab, setTab] = useState("monitors");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Monitor | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const canCreate = can(me, PERM.MONITOR_CREATE);
  const canManage =
    isSuperAdmin(me) ||
    !!me?.permissions.some((p) => p.startsWith("monitor:update") || p.startsWith("monitor:run") || p.startsWith("monitor:delete"));

  const { data, isLoading } = useQuery({
    queryKey: ["monitors", "project", id],
    queryFn: () => apiFetch<Paginated<Monitor>>(`/monitors?projectId=${id}&limit=100`),
    refetchInterval: 15_000,
  });

  // Archived (soft-deleted) monitors — fetched only when the Archived filter is on.
  const isArchived = status === "archived";
  const { data: archivedData, isLoading: archivedLoading } = useQuery({
    queryKey: ["monitors", "project", id, "archived"],
    queryFn: () => apiFetch<Paginated<Monitor>>(`/monitors?projectId=${id}&deleted=true&limit=100`),
    enabled: isArchived,
    refetchInterval: 30_000,
  });
  const archived = useMemo(() => {
    const list = archivedData?.data ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter((m) => m.name.toLowerCase().includes(needle) || m.url.toLowerCase().includes(needle));
  }, [archivedData, q]);

  const all = data?.data ?? [];
  const kpis = useMemo(() => {
    const up = all.filter((m) => m.status === "operational").length;
    const down = all.filter((m) => m.status === "down" || m.status === "degraded").length;
    const paused = all.filter((m) => !m.enabled).length;
    return { total: all.length, up, down, paused };
  }, [all]);

  const monitors = useMemo(() => {
    let list = all;
    if (type !== "all") list = list.filter((m) => m.type === type);
    if (status !== "all") list = list.filter((m) => (status === "paused" ? !m.enabled : m.status === status));
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(needle) || m.url.toLowerCase().includes(needle));
    }
    // Surface trouble first: down → degraded → operational → unknown → paused, then by name.
    const rank = (m: Monitor) =>
      !m.enabled ? 4 : ({ down: 0, degraded: 1, operational: 2 } as Record<string, number>)[m.status] ?? 3;
    return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [all, type, status, q]);

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        ‹ Projects
      </Link>

      <PageHeader
        title={project?.name ?? "Project"}
        subtitle={project?.description || "Monitors in this project."}
        actions={
          canCreate && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Icon name="plus" width={15} height={15} /> New Monitor
            </Button>
          )
        }
      />

      <Tabs
        tabs={[{ key: "monitors", label: "Monitors" }, { key: "members", label: "Members" }]}
        active={tab}
        onChange={setTab}
      />

      {tab === "members" && <ProjectMembersPanel projectId={id} canManage={isProjectOwner} />}

      {tab === "monitors" && (
      <>
      {/* Project KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Monitors", value: kpis.total, tone: "text-fg", alert: false },
          { label: "Operational", value: kpis.up, tone: "text-up", alert: false },
          { label: "Down", value: kpis.down, tone: kpis.down ? "text-down" : "text-fg", alert: kpis.down > 0 },
          { label: "Paused", value: kpis.paused, tone: "text-muted", alert: false },
        ].map((k) => (
          <Card key={k.label} className={cn(k.alert && "border-down/40 bg-down/[0.04]")}>
            <div className="text-xs text-muted">{k.label}</div>
            <div className={cn("text-2xl font-semibold", k.tone)}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" width={15} height={15} />
          </span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or URL…" className="pl-9" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
          <option value="all">All types</option>
          <option value="website">Websites</option>
          <option value="api">APIs</option>
          <option value="ssl">SSL</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="operational">Operational</option>
          <option value="degraded">Degraded</option>
          <option value="down">Down</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {isArchived ? (
        archivedLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : !archived.length ? (
          <div className="bg-surface border border-border rounded-xl">
            <EmptyState
              icon="🗄️"
              title="No archived monitors"
              description="When a monitor's monitoring period ends it's archived here for 7 days — restore it before it's permanently deleted."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
            {archived.map((m) => (
              <ArchivedMonitorCard key={m._id} monitor={m} canManage={canManage} />
            ))}
          </div>
        )
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !monitors.length ? (
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState
            icon="📡"
            title={all.length ? "No monitors match your filters" : "No monitors in this project yet"}
            description={all.length ? "Try clearing the search or filters." : "Add a monitor to start tracking this project."}
            action={canCreate && !all.length ? <Button onClick={() => { setEditing(null); setOpen(true); }}>+ New Monitor</Button> : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
          {monitors.map((m) => (
            <MonitorCard key={m._id} monitor={m} canManage={canManage} onEdit={(mm) => { setEditing(mm); setOpen(true); }} />
          ))}
        </div>
      )}
      </>
      )}

      {open && (
        <MonitorFormModal open onClose={() => setOpen(false)} monitor={editing} lockProjectId={id} />
      )}
    </div>
  );
}
