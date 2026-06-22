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
import { cn } from "@/lib/cn";
import { initials, projectTint } from "@/lib/projectVisual";
import { ProjectPulse } from "@/components/ProjectPulse";
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
            {projects.map((p) => {
              const tint = projectTint(p.name, p.isSystem);
              const desc = p.description || (p.isSystem ? "Ungrouped monitors" : "");
              return (
              <div
                key={p.id}
                className={cn(
                  "group relative flex flex-col gap-3.5 rounded-2xl border bg-surface p-4 transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_12px_28px_-12px_rgb(0_0_0/0.6)]",
                  p.downCount > 0 ? "border-down/40" : "border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Monogram identity */}
                  <div
                    className="grid h-10 w-10 flex-none place-items-center rounded-xl text-sm font-bold tracking-tight"
                    style={{ background: tint.bg, color: tint.fg }}
                    aria-hidden
                  >
                    {initials(p.name)}
                  </div>
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                    <div className="truncate font-semibold tracking-[-0.01em] group-hover:text-brand">{p.name}</div>
                    {desc && <div className="truncate text-xs text-muted">{desc}</div>}
                  </Link>
                  {!p.isSystem && (canUpdate || canDelete) && (
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {canUpdate && (
                        <button
                          onClick={() => { setEditing(p); setOpen(true); }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                          aria-label="Edit project"
                        >
                          <Icon name="pencil" width={14} height={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => { if (confirm(`Delete "${p.name}"? This permanently deletes the project and all its monitors.`)) del.mutate(p.id, { onSuccess: () => toast.success("Project deleted") }); }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-down"
                          aria-label="Delete project"
                        >
                          <Icon name="trash" width={14} height={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <ProjectPulse monitorCount={p.monitorCount} downCount={p.downCount} />

                <Link href={`/projects/${p.id}`} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{p.monitorCount} monitor{p.monitorCount === 1 ? "" : "s"}</span>
                  {p.downCount > 0 ? (
                    <span className="inline-flex items-center gap-2 font-medium text-down">
                      <span className="h-1.5 w-1.5 rounded-full bg-down shadow-[0_0_0_3px_rgb(var(--down)/0.16)]" />
                      {p.downCount} of {p.monitorCount} down
                    </span>
                  ) : p.monitorCount > 0 ? (
                    <span className="inline-flex items-center gap-2 font-medium text-up">
                      <span className="h-1.5 w-1.5 rounded-full bg-up shadow-[0_0_0_3px_rgb(var(--up)/0.16)]" />
                      All operational
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
                      No monitors yet
                    </span>
                  )}
                </Link>
              </div>
              );
            })}
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
