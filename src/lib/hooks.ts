"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type {
  Channel,
  DashboardStats,
  DomainExpiringItem,
  ExpiringMonitorItem,
  DiscoverMonitor,
  DiscoverProject,
  IncidentRow,
  MyJoinRequest,
  Paginated,
  PendingRequest,
  Project,
  ProjectMemberRow,
  SslExpiringItem,
  StatusBoardItem,
  UptimeOverview,
} from "./types";

/** Members of a project. */
export const useProjectMembers = (id: string) =>
  useQuery({
    queryKey: ["projects", id, "members"],
    queryFn: () => apiFetch<ProjectMemberRow[]>(`/projects/${id}/members`),
    enabled: !!id,
  });

/** Pending join requests for a project (owner inbox). */
export const useProjectRequests = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: ["projects", id, "requests"],
    queryFn: () => apiFetch<PendingRequest[]>(`/projects/${id}/join-requests`),
    enabled: enabled && !!id,
  });

/** The current user's own pending join requests. */
export const useMyJoinRequests = () =>
  useQuery({
    queryKey: ["join-requests", "mine"],
    queryFn: () => apiFetch<MyJoinRequest[]>("/projects/requests/mine"),
  });

/** Projects the current user can request to join. */
export const useDiscoverProjects = (q: string, enabled: boolean) =>
  useQuery({
    queryKey: ["projects", "discover", q],
    queryFn: () => apiFetch<DiscoverProject[]>(`/projects/discover?q=${encodeURIComponent(q)}`),
    enabled,
  });

/** All projects (capped) — for the monitor form's project selector. */
export const useProjects = () =>
  useQuery({
    queryKey: ["projects", "all"],
    queryFn: async () => (await apiFetch<Paginated<Project>>("/projects?limit=100")).data,
    staleTime: 30_000,
  });

/** A single project (for the project detail header). */
export const useProject = (id: string) =>
  useQuery({
    queryKey: ["projects", id],
    queryFn: () => apiFetch<Project>(`/projects/${id}`),
    enabled: !!id,
  });

/** Paginated + searchable projects for the landing page's infinite scroll. */
export const useProjectsInfinite = (q: string) =>
  useInfiniteQuery({
    queryKey: ["projects", "list", q],
    queryFn: ({ pageParam }) =>
      apiFetch<Paginated<Project>>(`/projects?q=${encodeURIComponent(q)}&page=${pageParam}&limit=24`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    staleTime: 15_000,
  });

/** Org-wide monitor search for discover-and-join. Enabled only while the picker is open. */
export const useDiscoverMonitors = (q: string, enabled: boolean) =>
  useQuery({
    queryKey: ["monitors", "discover", q],
    queryFn: () => apiFetch<{ data: DiscoverMonitor[] }>(`/monitors/discover?q=${encodeURIComponent(q)}`),
    enabled,
  });

export const useDashboardStats = () =>
  useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiFetch<DashboardStats>("/dashboard"),
    refetchInterval: 30_000,
  });

export const useUptimeOverview = (range: "24h" | "7d" | "30d") =>
  useQuery({
    queryKey: ["dashboard", "uptime", range],
    queryFn: () => apiFetch<UptimeOverview>(`/dashboard/uptime?range=${range}`),
    refetchInterval: 60_000,
  });

export const useStatusBoard = () =>
  useQuery({
    queryKey: ["dashboard", "status-board"],
    queryFn: () => apiFetch<StatusBoardItem[]>("/dashboard/status-board"),
    refetchInterval: 30_000,
  });

export const useRecentIncidents = () =>
  useQuery({
    queryKey: ["dashboard", "incidents"],
    queryFn: () => apiFetch<IncidentRow[]>("/dashboard/incidents/recent"),
    refetchInterval: 30_000,
  });

export const useSslExpiring = () =>
  useQuery({
    queryKey: ["dashboard", "ssl"],
    queryFn: () => apiFetch<SslExpiringItem[]>("/dashboard/ssl-expiring"),
  });

export const useDomainExpiring = () =>
  useQuery({
    queryKey: ["dashboard", "domain"],
    queryFn: () => apiFetch<DomainExpiringItem[]>("/dashboard/domain-expiring"),
  });

export const useExpiringMonitors = () =>
  useQuery({
    queryKey: ["dashboard", "expiring-monitors"],
    queryFn: () => apiFetch<ExpiringMonitorItem[]>("/dashboard/expiring-monitors"),
  });

export const useChannels = () =>
  useQuery({ queryKey: ["channels"], queryFn: () => apiFetch<Channel[]>("/channels") });
