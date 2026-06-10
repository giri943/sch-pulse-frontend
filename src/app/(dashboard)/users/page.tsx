"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCreateUser, useUpdateUser } from "@/lib/mutations";
import { Button, Card, Field, Input, Modal, Select, StatusBadge } from "@/components/ui";

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

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  const update = useUpdateUser();
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ data: UserRow[] }>("/users?limit=100"),
  });
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: () => apiFetch<RoleLite[]>("/roles") });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button onClick={() => setOpen(true)}>+ New User</Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted text-left">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Auth</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users?.data.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2.5">{u.name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td className="text-muted">{u.authProvider}</td>
                  <td>
                    <Select
                      value={u.role?.id ?? ""}
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
                  <td>
                    <button
                      onClick={() =>
                        update.mutate({
                          id: u.id,
                          body: { status: u.status === "active" ? "disabled" : "active" },
                        })
                      }
                      title="Toggle status"
                    >
                      <StatusBadge status={u.status} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <NewUserModal open={open} onClose={() => setOpen(false)} roles={roles ?? []} />
    </div>
  );
}

function NewUserModal({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: RoleLite[] }) {
  const create = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ name, email, password, roleId: roleId || roles[0]?.id });
      onClose();
      setName("");
      setEmail("");
      setPassword("");
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
        <Field label="Temporary password">
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 8 chars, mixed case + number" />
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
