"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";

export interface MonitorBody {
  name: string;
  type: "website" | "api" | "ssl";
  url: string;
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

export function useCreateMonitor() {
  const invalidate = useInvalidate([["monitors"], ["dashboard"]]);
  return useMutation({
    mutationFn: (body: MonitorBody) => apiFetch("/monitors", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useUpdateMonitor() {
  const invalidate = useInvalidate([["monitors"], ["monitor"], ["dashboard"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MonitorBody> }) =>
      apiFetch(`/monitors/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useDeleteMonitor() {
  const invalidate = useInvalidate([["monitors"], ["dashboard"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/monitors/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
export function useRestoreMonitor() {
  const invalidate = useInvalidate([["monitors"], ["dashboard"]]);
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/monitors/${id}/restore`, { method: "POST" }),
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
  const invalidate = useInvalidate([["monitors"], ["monitor"], ["dashboard"]]);
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "run" | "pause" | "resume" }) =>
      apiFetch(`/monitors/${id}/${action}`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

/* ── Users (admin) ── */
export function useCreateUser() {
  const invalidate = useInvalidate([["users"]]);
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; roleId: string }) =>
      apiFetch("/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}
export function useUpdateUser() {
  const invalidate = useInvalidate([["users"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { roleId?: string; status?: "active" | "disabled" } }) =>
      apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: invalidate,
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

export function useTestNotification() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string; recipients: string[] }>(`/monitors/${id}/test-notification`, {
        method: "POST",
      }),
  });
}
