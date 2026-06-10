"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, getAccessToken } from "./api-client";
import type { Me } from "./types";

/** Permission keys (mirror the backend catalog). */
export const PERM = {
  MONITOR_CREATE: "monitor:create",
  MONITOR_READ_ALL: "monitor:read:all",
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  ROLE_READ: "role:read",
  RULE_READ: "rule:read",
  AUDIT_READ: "audit:read",
} as const;

/** Current user (role + permissions). Cached; drives UI gating. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/auth/me"),
    enabled: typeof window !== "undefined" && !!getAccessToken(),
    staleTime: 60_000,
  });
}

export function can(me: Me | undefined, ...keys: string[]): boolean {
  if (!me) return false;
  return keys.some((k) => me.permissions.includes(k));
}
