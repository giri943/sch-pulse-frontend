"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProjectsInfinite } from "@/lib/hooks";
import { useDeleteProject } from "@/lib/mutations";
import { useMe, can, PERM } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { BrowseProjectsModal } from "@/components/BrowseProjectsModal";
import { PageHeader, Button, Input, Skeleton, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { data: me } = useMe();
  const del = useDeleteProject();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const canCreate = can(me, PERM.PROJECT_CREATE);
  const canUpdate = can(me, PERM.PROJECT_UPDATE);
  const canDelete = can(me, PERM.PROJECT_DELETE);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useProjectsInfinite(dq);
  const projects = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  // Load more as the sentinel scrolls into view (Facebook-style infinite scroll).
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="A group of monitors per project, client or service. Open one to manage its monitors."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setJoinOpen(true)}>
              <Icon name="search" width={15} height={15} /> Find a project to join
            </Button>
            {canCreate && (
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Icon name="plus" width={15} height={15} /> New Project
              </Button>
            )}
          </div>
        }
      />

      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="search" width={15} height={15} />
        </span>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !projects.length ? (
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState
            icon="📁"
            title={dq ? "No projects match your search" : "No projects yet"}
            description={dq ? "Try a different search." : "Create a project to organize your monitors."}
            action={canCreate && !dq ? <Button onClick={() => { setEditing(null); setOpen(true); }}>+ New Project</Button> : undefined}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-3">
            {projects.map((p) => (
              <div key={p.id} className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/50">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                    <div className="truncate font-semibold group-hover:text-brand">📁 {p.name}</div>
                    <div className="truncate text-xs text-muted">{p.description || (p.isSystem ? "Default project" : "—")}</div>
                  </Link>
                  {!p.isSystem && (canUpdate || canDelete) && (
                    <div className="flex shrink-0 gap-1">
                      {canUpdate && (
                        <button onClick={() => { setEditing(p); setOpen(true); }} className="px-1 text-xs text-muted hover:text-fg" aria-label="Edit project">✏️</button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => { if (confirm(`Delete "${p.name}"? Its monitors will move to the General project.`)) del.mutate(p.id, { onSuccess: () => toast.success("Project deleted") }); }}
                          className="px-1 text-xs text-muted hover:text-down"
                          aria-label="Delete project"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <Link href={`/projects/${p.id}`} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{p.monitorCount} monitor{p.monitorCount === 1 ? "" : "s"}</span>
                  {p.downCount > 0 ? (
                    <span className="font-medium text-down">● {p.downCount} down</span>
                  ) : p.monitorCount > 0 ? (
                    <span className="font-medium text-up">● all operational</span>
                  ) : (
                    <span className="text-muted">no monitors yet</span>
                  )}
                </Link>
              </div>
            ))}
          </div>
          <div ref={sentinel} className="h-8" />
          {isFetchingNextPage && <p className="text-center text-xs text-muted">Loading more…</p>}
        </>
      )}

      {open && <ProjectFormModal open onClose={() => setOpen(false)} project={editing} />}
      {joinOpen && <BrowseProjectsModal open onClose={() => setJoinOpen(false)} />}
    </div>
  );
}
