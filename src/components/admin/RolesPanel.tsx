"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCreateRole, useUpdateRole, useDeleteRole, type RoleBody } from "@/lib/mutations";
import { useMe, can, PERM } from "@/lib/permissions";
import type { PermissionGroup, Role } from "@/lib/types";
import { Button, Card, Field, Input, Modal } from "@/components/ui";

export function RolesPanel() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const del = useDeleteRole();

  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => apiFetch<Role[]>("/roles") });
  const { data: catalog } = useQuery({
    queryKey: ["roles", "catalog"],
    queryFn: () => apiFetch<PermissionGroup[]>("/roles/permissions/catalog"),
  });

  const canCreate = can(me, PERM.ROLE_CREATE);
  const canUpdate = can(me, PERM.ROLE_UPDATE);
  const canDelete = can(me, PERM.ROLE_DELETE);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Roles &amp; permissions</h3>
          <p className="text-xs text-muted">Define what each role can do across the platform.</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New Role
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roles?.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.isSystem && (
                      <span className="text-[10px] uppercase tracking-wide bg-muted/15 text-muted rounded px-1.5 py-0.5">
                        system
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{r.description || "—"}</p>
                </div>
                <span className="text-xs text-muted">{r.userCount ?? 0} user(s)</span>
              </div>
              <div className="text-xs text-muted mt-3">{r.permissions.length} permission(s)</div>
              <div className="flex gap-1.5 mt-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  {r.isSystem || !canUpdate ? "View" : "Edit"}
                </Button>
                {canDelete && !r.isSystem && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Delete role "${r.name}"?`)) del.mutate(r.id);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RoleModal
        key={editing?.id ?? "new"}
        open={open}
        onClose={() => setOpen(false)}
        role={editing}
        catalog={catalog ?? []}
        readOnly={!!editing?.isSystem || (editing ? !canUpdate : !canCreate)}
      />
    </Card>
  );
}

function RoleModal({
  open,
  onClose,
  role,
  catalog,
  readOnly,
}: {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  catalog: PermissionGroup[];
  readOnly: boolean;
}) {
  const create = useCreateRole();
  const update = useUpdateRole();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  function toggle(key: string) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleGroup(group: PermissionGroup, on: boolean) {
    setPerms((prev) => {
      const next = new Set(prev);
      group.items.forEach((i) => (on ? next.add(i.key) : next.delete(i.key)));
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body: RoleBody = { name, description, permissions: [...perms] };
    try {
      if (role) await update.mutateAsync({ id: role.id, body });
      else await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    }
  }

  const title = role ? (readOnly ? `Role: ${role.name}` : "Edit Role") : "New Role";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-auto pr-1">
        {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
        {readOnly && role?.isSystem && (
          <div className="bg-muted/10 text-muted text-xs rounded-lg px-3 py-2">
            This is a system role and can't be edited.
          </div>
        )}
        <Field label="Role name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={readOnly} placeholder="e.g. SEO Team" />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={readOnly} placeholder="What this role is for" />
        </Field>

        <div className="space-y-3">
          <div className="text-xs text-muted">Permissions</div>
          {catalog.map((group) => {
            const allOn = group.items.every((i) => perms.has(i.key));
            return (
              <div key={group.resource} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{group.resource}</span>
                  {!readOnly && (
                    <button type="button" onClick={() => toggleGroup(group, !allOn)} className="text-xs text-brand hover:underline">
                      {allOn ? "Clear all" : "Select all"}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.items.map((i) => (
                    <label key={i.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={perms.has(i.key)}
                        onChange={() => toggle(i.key)}
                        disabled={readOnly}
                        className="accent-brand"
                      />
                      <span className={perms.has(i.key) ? "text-fg" : "text-muted"}>{i.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-surface">
          <Button type="button" variant="ghost" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : role ? "Save changes" : "Create role"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
