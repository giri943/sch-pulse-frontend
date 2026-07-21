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
  USER_DELETE: "user:delete",
  ROLE_READ: "role:read",
  ROLE_CREATE: "role:create",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",
  RULE_READ: "rule:read",
  CHANNEL_READ: "channel:read",
  CHANNEL_MANAGE: "channel:manage",
  PROJECT_READ: "project:read",
  PROJECT_CREATE: "project:create",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",
  AUDIT_READ: "audit:read",
} as const;

/** Current user (role + permissions). Cached; drives UI gating. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/auth/me"),
    enabled: typeof window !== "undefined" && !!getAccessToken(),
    // Poll so a role/permission change (made by an admin) reflects for the
    // affected user within a cycle — not only after a manual refresh.
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

/** Wildcard permission held only by Super Admin — grants everything. */
export const WILDCARD = "*";

export function isSuperAdmin(me: Me | undefined): boolean {
  return !!me?.permissions.includes(WILDCARD);
}

export function can(me: Me | undefined, ...keys: string[]): boolean {
  if (!me) return false;
  if (me.permissions.includes(WILDCARD)) return true;
  return keys.some((k) => me.permissions.includes(k));
}
