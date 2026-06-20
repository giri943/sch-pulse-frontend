"use client";

import { useState } from "react";
import { useProjectMembers, useProjectRequests } from "@/lib/hooks";
import {
  useAcceptRequest,
  useRejectRequest,
  useAddProjectMember,
  useUpdateMemberRole,
  useRemoveMember,
} from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { UserPicker } from "@/components/UserPicker";
import { Card, Button, Field, Select, EmptyState } from "@/components/ui";
import type { UserLite } from "@/lib/types";

const ROLES = ["owner", "editor", "viewer"] as const;

export function ProjectMembersPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: members, isLoading } = useProjectMembers(projectId);
  const { data: requests } = useProjectRequests(projectId, canManage);
  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const addMember = useAddProjectMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const toast = useToast();

  const [invitees, setInvitees] = useState<UserLite[]>([]);
  const [inviteRole, setInviteRole] = useState("viewer");
  const [reqRole, setReqRole] = useState<Record<string, string>>({});

  async function invite() {
    if (!invitees.length) return;
    for (const u of invitees) {
      await addMember.mutateAsync({ projectId, userId: u.id, role: inviteRole }).catch(() => null);
    }
    toast.success(`Added ${invitees.length} member(s)`);
    setInvitees([]);
  }

  return (
    <div className="space-y-4">
      {/* Pending requests (owners only) */}
      {canManage && (requests?.length ?? 0) > 0 && (
        <Card>
          <h3 className="mb-3 font-semibold">Pending access requests</h3>
          <ul className="divide-y divide-border">
            {requests!.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="text-sm">{r.user?.name ?? "Unknown"}</div>
                  <div className="text-xs text-muted">{r.user?.email}</div>
                  {r.message && <div className="mt-0.5 text-xs italic text-muted">“{r.message}”</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={reqRole[r.id] ?? "viewer"}
                    onChange={(e) => setReqRole((m) => ({ ...m, [r.id]: e.target.value }))}
                    className="w-auto"
                  >
                    {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => accept.mutate({ id: r.id, role: reqRole[r.id] ?? "viewer" }, { onSuccess: () => toast.success("Request accepted") })}
                  >
                    Accept
                  </Button>
                  <button
                    onClick={() => reject.mutate(r.id, { onSuccess: () => toast.success("Request declined") })}
                    className="px-2 text-xs text-muted hover:text-down"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Invite (owners only) */}
      {canManage && (
        <Card>
          <h3 className="mb-3 font-semibold">Add members</h3>
          <div className="space-y-3">
            <UserPicker value={invitees} onChange={setInvitees} />
            <div className="flex items-center gap-2">
              <Field label="Role">
                <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-auto">
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </Select>
              </Field>
              <div className="flex-1" />
              <Button onClick={invite} disabled={!invitees.length || addMember.isPending}>
                Add to project
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <h3 className="mb-3 font-semibold">Members</h3>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : !members?.length ? (
          <EmptyState icon="👤" title="No members" description="Add members or accept access requests." />
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm">{m.user.name}</div>
                  <div className="text-xs text-muted">{m.user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Select
                      value={m.role}
                      onChange={(e) => updateRole.mutate({ projectId, userId: m.user.id, role: e.target.value }, { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed") })}
                      className="w-auto"
                    >
                      {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </Select>
                  ) : (
                    <span className="text-xs capitalize text-muted">{m.role}</span>
                  )}
                  {canManage && (
                    <button
                      onClick={() => { if (confirm(`Remove ${m.user.name} from this project?`)) removeMember.mutate({ projectId, userId: m.user.id }, { onSuccess: () => toast.success("Member removed"), onError: (err) => toast.error(err instanceof Error ? err.message : "Failed") }); }}
                      className="px-2 text-xs text-muted hover:text-down"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
