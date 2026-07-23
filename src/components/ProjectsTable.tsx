"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import { Icon } from "@/components/icons";
import { Avatar, AvatarStack } from "@/components/Avatars";
import { initials, projectTint } from "@/lib/projectVisual";
import type { Project } from "@/lib/types";

export function ProjectsTable({
  projects,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const router = useRouter();

  const columns: Column<Project>[] = [
    {
      key: "name",
      header: "Project",
      primary: true,
      sortValue: (p) => p.name.toLowerCase(),
      render: (p) => {
        const tint = projectTint(p.name, p.isSystem);
        const desc = p.description || (p.isSystem ? "Ungrouped monitors" : "");
        return (
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[11px] font-bold" style={{ background: tint.bg, color: tint.fg }} aria-hidden>
              {initials(p.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              {desc && <div className="truncate text-[11px] text-muted">{desc}</div>}
            </div>
          </div>
        );
      },
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (p) => (p.owner?.name ?? "").toLowerCase(),
      render: (p) =>
        p.owner ? (
          <div className="flex items-center gap-2">
            <Avatar person={p.owner} />
            <span className="truncate">{p.owner.name || p.owner.email}</span>
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "members",
      header: "Members",
      sortValue: (p) => p.members?.length ?? 0,
      render: (p) => <AvatarStack people={p.members ?? []} />,
    },
    {
      key: "monitors",
      header: "Monitors",
      align: "right",
      className: "tabular-nums",
      sortValue: (p) => p.monitorCount,
      render: (p) => p.monitorCount,
    },
    {
      key: "health",
      header: "Health",
      sortValue: (p) => (p.downCount > 0 ? 0 : p.monitorCount > 0 ? 1 : 2),
      render: (p) =>
        p.downCount > 0 ? (
          <span className="inline-flex items-center gap-2 font-medium text-down">
            <span className="h-1.5 w-1.5 rounded-full bg-down" />
            {p.downCount} of {p.monitorCount} down
          </span>
        ) : p.monitorCount > 0 ? (
          <span className="inline-flex items-center gap-2 font-medium text-up">
            <span className="h-1.5 w-1.5 rounded-full bg-up" />
            All operational
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
            No monitors yet
          </span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "w-16",
      render: (p) =>
        !p.isSystem && (canUpdate || canDelete) ? (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            {canUpdate && (
              <button onClick={() => onEdit(p)} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit project">
                <Icon name="pencil" width={14} height={14} />
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(p)} className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-down" aria-label="Delete project">
                <Icon name="trash" width={14} height={14} />
              </button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={projects}
      rowKey={(p) => p.id}
      onRowClick={(p) => router.push(`/projects/${p.id}`)}
      initialSort={{ key: "health", dir: "asc" }}
    />
  );
}
