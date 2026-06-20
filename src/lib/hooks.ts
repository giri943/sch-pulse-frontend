"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type {
  DashboardStats,
  DiscoverMonitor,
  IncidentRow,
  Paginated,
  Project,
  SslExpiringItem,
  StatusBoardItem,
  UptimeOverview,
} from "./types";

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
