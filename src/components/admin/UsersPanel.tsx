"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCreateUser, useUpdateUser, useDeleteUser } from "@/lib/mutations";
import { useMe, can, PERM } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import { Button, Card, Field, Input, Modal, Select, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";

interface RoleLite {
  id: string;
  name: string;
}
interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  authProvider: string;
  role: { id: string; name: string } | null;
}

export function UsersPanel() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const update = useUpdateUser();
  const del = useDeleteUser();
  const toast = useToast();
  const canManage = can(me, PERM.USER_UPDATE);
  const canDelete = can(me, PERM.USER_DELETE);
  const canSeeRoles = can(me, PERM.ROLE_READ);
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ data: UserRow[] }>("/users?limit=100"),
  });
  // Only fetch roles if allowed to see them (avoids a 403 and hides the column).
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<RoleLite[]>("/roles"),
    enabled: canSeeRoles,
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Users</h3>
          <p className="text-xs text-muted">Manage accounts and assign roles.</p>
        </div>
        {can(me, PERM.USER_CREATE) && <Button onClick={() => setOpen(true)}>+ New User</Button>}
      </div>

      {isLoading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-muted text-left">
            <tr>
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Auth</th>
              {canSeeRoles && <th>Role</th>}
              <th>Status</th>
              {canDelete && <th className="text-right pr-1">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users?.data.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="py-2.5">{u.name}</td>
                <td className="text-muted">{u.email}</td>
                <td className="text-muted">{u.authProvider}</td>
                {canSeeRoles && (
                  <td>
                    <Select
                      value={u.role?.id ?? ""}
                      disabled={!canManage}
                      onChange={(e) => update.mutate({ id: u.id, body: { roleId: e.target.value } })}
                      className="max-w-[160px]"
                    >
                      {roles?.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                )}
                <td>
                  <button
                    disabled={!canManage}
                    onClick={() =>
                      update.mutate({ id: u.id, body: { status: u.status === "active" ? "disabled" : "active" } })
                    }
                    title="Toggle status"
                  >
                    <StatusBadge status={u.status} />
                  </button>
                </td>
                {canDelete && (
                  <td className="text-right">
                    <button
                      disabled={u.id === me?.id}
                      onClick={() => {
                        if (confirm(`Delete ${u.name} (${u.email})? This removes their account and access. This can't be undone.`))
                          del.mutate(u.id, {
                            onSuccess: () => toast.success("User deleted"),
                            onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
                          });
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-down disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
                      aria-label={`Delete ${u.name}`}
                      title={u.id === me?.id ? "You can't delete your own account" : "Delete user"}
                    >
                      <Icon name="trash" width={14} height={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <NewUserModal open={open} onClose={() => setOpen(false)} roles={roles ?? []} />
    </Card>
  );
}

function NewUserModal({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: RoleLite[] }) {
  const create = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ name, email, roleId: roleId || roles[0]?.id });
      onClose();
      setName("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New User">
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Role">
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
            <option value="">Select a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          They'll get an email to set their own password — or they can sign in with their Schbang Google account. No
          password needed here.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
