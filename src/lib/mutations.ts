"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface MonitorBody {
  name: string;
  type: "website" | "api" | "ssl";
  monitoringScope?: "full" | "ssl" | "domain";
  url: string;
  projectId?: string;
  method?: string;
  intervalSec?: number;
  expectedStatusCode?: number;
  timeoutMs?: number;
  members?: string[];
  extraAlertEmails?: string[];
  channels?: string[];
  expiresAt?: string | null;
}

function useInvalidate(keys: string[][]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));
}

type AnyRec = Record<string, unknown>;
/** Optimistically patch a monitor by id across every cached view (lists, detail, status board). */
function patchMonitor(qc: ReturnType<typeof useQueryClient>, id: string, patch: AnyRec) {
  qc.setQueriesData({ queryKey: ["monitors"] }, (old: unknown) => {
    if (old && typeof old === "object" && Array.isArray((old as { data?: unknown }).data)) {
      const o = old as { data: Array<AnyRec> };
      return { ...o, data: o.data.map((m) => (m._id === id ? { ...m, ...patch } : m)) };
    }
    if (Array.isArray(old)) return (old as Array<AnyRec>).map((m) => (m._id === id ? { ...m, ...patch } : m));
    return old;
  });
  qc.setQueryData(["monitor", id], (old: unknown) => (old ? { ...(old as AnyRec), ...patch } : old));
  qc.setQueriesData({ queryKey: ["dashboard", "status-board"] }, (old: unknown) =>
    Array.isArray(old) ? (old as Array<AnyRec>).map((m) => (m.monitorId === id ? { ...m, ...patch } : m)) : old,
  );
}

/** Optimistically remove a monitor by id from every cached list/board. */
function removeMonitor(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.setQueriesData({ queryKey: ["monitors"] }, (old: unknown) => {
    if (old && typeof old === "object" && Array.isArray((old as { data?: unknown }).data)) {
      const o = old as { data: Array<AnyRec> };
      return { ...o, data: o.data.filter((m) => m._id !== id) };
    }
    if (Array.isArray(old)) return (old as Array<AnyRec>).filter((m) => m._id !== id);
    return old;
  });
  qc.setQueriesData({ queryKey: ["dashboard", "status-board"] }, (old: unknown) =>
    Array.isArray(old) ? (old as Array<AnyRec>).filter((m) => m.monitorId !== id) : old,
  );
}

export function useCreateMonitor() {
  const invalidate = useInvalidate([["monitors"], ["dashboard"], ["projects"]]);
  return useMutation({
    mutationFn: (body: MonitorBody) => apiFetch("/monitors", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useUpdateMonitor() {
  const invalidate = useInvalidate([["monitors"], ["monitor"], ["dashboard"], ["projects"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MonitorBody> }) =>
      apiFetch(`/monitors/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useDeleteMonitor() {
  const qc = useQueryClient();
  const invalidate = useInvalidate([["monitors"], ["dashboard"], ["projects"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/monitors/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["monitors"] });
      removeMonitor(qc, id); // disappears from the list immediately
    },
    onSettled: invalidate,
  });
}
export function useRestoreMonitor() {
  const invalidate = useInvalidate([["monitors"], ["dashboard"], ["projects"]]);
  return useMutation({
    mutationFn: ({ id, expiresAt }: { id: string; expiresAt?: string | null }) =>
      apiFetch(`/monitors/${id}/restore`, { method: "POST", body: JSON.stringify({ expiresAt: expiresAt ?? null }) }),
    onSuccess: invalidate,
  });
}
/** Join an existing monitor (added to its members → appears on your dashboard + alerts). */
export function useJoinMonitor() {
  const invalidate = useInvalidate([["monitors"], ["dashboard"], ["projects"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/monitors/${id}/join`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

/* ── Notification channels ── */
export interface ChannelBody {
  name: string;
  type?: string;
  webhookUrl: string;
  enabled?: boolean;
}
export function useCreateChannel() {
  const invalidate = useInvalidate([["channels"]]);
  return useMutation({
    mutationFn: (body: ChannelBody) => apiFetch("/channels", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useUpdateChannel() {
  const invalidate = useInvalidate([["channels"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ChannelBody> }) =>
      apiFetch(`/channels/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useDeleteChannel() {
  const invalidate = useInvalidate([["channels"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/channels/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
export function useTestChannel() {
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ message: string }>(`/channels/${id}/test`, { method: "POST" }),
  });
}

export function useMonitorAction() {
  const qc = useQueryClient();
  const invalidate = useInvalidate([["monitors"], ["monitor"], ["dashboard"], ["projects"]]);
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "run" | "pause" | "resume" }) =>
      apiFetch(`/monitors/${id}/${action}`, { method: "POST" }),
    // Pause/resume updates enabled + status instantly so the UI (and the
    // paused/operational filters) reflect on click — matching the server, which
    // sets paused / operational respectively.
    onMutate: async ({ id, action }) => {
      if (action === "pause" || action === "resume") {
        await qc.cancelQueries({ queryKey: ["monitors"] });
        patchMonitor(qc, id, action === "resume" ? { enabled: true, status: "operational" } : { enabled: false, status: "paused" });
      }
    },
    onSettled: invalidate, // reconcile with the server (also corrects the cache if it failed)
  });
}

/* ── Users (admin) ── */
export function useCreateUser() {
  const invalidate = useInvalidate([["users"]]);
  return useMutation({
    mutationFn: (body: { name: string; email: string; password?: string; roleId: string }) =>
      apiFetch("/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidate([["users"], ["projects"]]);
  return useMutation({
    mutationFn: ({ id, transferToUserId }: { id: string; transferToUserId?: string }) =>
      apiFetch(`/users/${id}`, {
        method: "DELETE",
        body: transferToUserId ? JSON.stringify({ transferToUserId }) : undefined,
      }),
    onSuccess: invalidate,
  });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  const invalidate = useInvalidate([["users"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { roleId?: string; status?: "active" | "disabled" } }) =>
      apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    // Role/status change reflects instantly in the Users table.
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      qc.setQueriesData({ queryKey: ["users"] }, (old: unknown) => {
        if (!old || typeof old !== "object" || !Array.isArray((old as { data?: unknown }).data)) return old;
        const o = old as { data: Array<AnyRec & { id: string; role?: { id: string; name: string } | null }> };
        return {
          ...o,
          data: o.data.map((u) => {
            if (u.id !== id) return u;
            const next: typeof u = { ...u };
            if (body.status) next.status = body.status;
            if (body.roleId) next.role = { id: body.roleId, name: u.role?.name ?? "" };
            return next;
          }),
        };
      });
    },
    onSettled: invalidate, // reconcile (fills the real role name, etc.)
  });
}

/* ── Roles (super admin) ── */
export interface RoleBody {
  name: string;
  description?: string;
  permissions: string[];
}
export function useCreateRole() {
  const invalidate = useInvalidate([["roles"]]);
  return useMutation({
    mutationFn: (body: RoleBody) => apiFetch("/roles", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useUpdateRole() {
  const invalidate = useInvalidate([["roles"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<RoleBody> }) =>
      apiFetch(`/roles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useDeleteRole() {
  const invalidate = useInvalidate([["roles"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/roles/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/* ── Incidents ── */
export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { rootCauseNotes?: string; resolutionNotes?: string; rootCauseMentions?: string[]; resolutionMentions?: string[]; acknowledge?: boolean } }) =>
      apiFetch(`/incidents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: ["incident", id] });
      void qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/* ── Escalation policy (super admin) ── */
export function useUpdateEscalationPolicy() {
  const invalidate = useInvalidate([["settings", "escalation"]]);
  return useMutation({
    mutationFn: (body: { enabled?: boolean; afterMinutes?: number; emails?: string[] }) =>
      apiFetch("/settings/escalation", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateRcaReminderPolicy() {
  const invalidate = useInvalidate([["settings", "rca-reminder"]]);
  return useMutation({
    mutationFn: (body: { enabled?: boolean; everyMinutes?: number; windowMinutes?: number }) =>
      apiFetch("/settings/rca-reminder", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateMaintenancePolicy() {
  const invalidate = useInvalidate([["settings", "maintenance"]]);
  return useMutation({
    mutationFn: (body: { defaultDurationMinutes?: number }) =>
      apiFetch("/settings/maintenance", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export interface MaintenanceBody {
  scope: "monitor" | "project";
  monitorId?: string;
  projectId?: string;
  startAt?: string;
  durationMinutes?: number;
  reason?: string;
  reasonMentions?: string[];
  proofKey?: string;
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MaintenanceBody) => apiFetch("/maintenance", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
      void qc.invalidateQueries({ queryKey: ["monitor"] });
      void qc.invalidateQueries({ queryKey: ["monitors"] });
    },
  });
}

export function useCancelMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/maintenance/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["maintenance"] });
      void qc.invalidateQueries({ queryKey: ["monitor"] });
      void qc.invalidateQueries({ queryKey: ["monitors"] });
    },
  });
}

export function useCreateDeployToken(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string }) =>
      apiFetch<{ id: string; name: string; prefix: string; token: string }>(`/projects/${projectId}/deploy-tokens`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["deploy-tokens", projectId] }),
  });
}

export function useRevokeDeployToken(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/deploy-tokens/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["deploy-tokens", projectId] }),
  });
}

export function useTestNotification() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string; recipients: string[]; emailFailed?: boolean; emailError?: string }>(
        `/monitors/${id}/test-notification`,
        { method: "POST" },
      ),
  });
}

/* ── Projects ── */
export interface ProjectBody {
  name: string;
  description?: string;
}
export function useCreateProject() {
  const invalidate = useInvalidate([["projects"]]);
  return useMutation({
    mutationFn: (body: ProjectBody) => apiFetch("/projects", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useUpdateProject() {
  const invalidate = useInvalidate([["projects"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProjectBody> }) =>
      apiFetch(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useDeleteProject() {
  const invalidate = useInvalidate([["projects"], ["monitors"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/* ── Project membership & join requests ── */
export function useRequestJoin() {
  const invalidate = useInvalidate([["projects", "discover"], ["join-requests"]]);
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) =>
      apiFetch(`/projects/${id}/join-requests`, { method: "POST", body: JSON.stringify({ message }) }),
    onSuccess: invalidate,
  });
}
export function useCancelJoinRequest() {
  const invalidate = useInvalidate([["projects", "discover"], ["join-requests"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/projects/join-requests/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
export function useAcceptRequest() {
  const invalidate = useInvalidate([["projects"], ["join-requests"]]);
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiFetch(`/projects/join-requests/${id}/accept`, { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: invalidate,
  });
}
export function useRejectRequest() {
  const invalidate = useInvalidate([["projects"], ["join-requests"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/projects/join-requests/${id}/reject`, { method: "POST" }),
    onSuccess: invalidate,
  });
}
export function useAddProjectMember() {
  const invalidate = useInvalidate([["projects"]]);
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      apiFetch(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ userId, role }) }),
    onSuccess: invalidate,
  });
}
export function useUpdateMemberRole() {
  const invalidate = useInvalidate([["projects"]]);
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      apiFetch(`/projects/${projectId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: invalidate,
  });
}
export function useRemoveMember() {
  const invalidate = useInvalidate([["projects"]]);
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      apiFetch(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/** Set/replace the current user's password (e.g. a Google user enabling email login). */
export function useSetPassword() {
  const invalidate = useInvalidate([["me"]]);
  return useMutation({
    mutationFn: (password: string) =>
      apiFetch<{ message: string }>("/auth/set-password", { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: invalidate,
  });
}
