"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type {
  DashboardStats,
  IncidentRow,
  SslExpiringItem,
  StatusBoardItem,
  UptimeOverview,
} from "./types";

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
