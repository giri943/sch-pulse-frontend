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

export function useTestNotification() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string; recipients: string[] }>(`/monitors/${id}/test-notification`, {
        method: "POST",
      }),
  });
}
