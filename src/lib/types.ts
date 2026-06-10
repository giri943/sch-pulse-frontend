export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface DashboardStats {
  stats: { totalMonitors: number; monitorsDown: number; openIncidents: number; uptime30d: number };
  generatedAt: string;
}

export interface UptimePoint {
  t: string;
  uptime: number | null;
  avgResponseMs: number | null;
}
export interface UptimeOverview {
  range: string;
  series: UptimePoint[];
}

export type MonitorStatus = "operational" | "degraded" | "down" | "paused" | "unknown";

export interface StatusBoardItem {
  monitorId: string;
  name: string;
  url: string;
  status: MonitorStatus;
  lastResponseTimeMs: number | null;
}

export interface SslExpiringItem {
  monitorId: string;
  name: string;
  url: string;
  sslExpiresAt: string | null;
  daysRemaining: number | null;
}

export interface IncidentRow {
  _id: string;
  status: "open" | "resolved";
  startedAt: string;
  durationSec: number | null;
  monitorId?: { name?: string; url?: string };
}

export interface UserLite {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: { id: string; name: string };
  permissions: string[];
}

export interface Monitor {
  _id: string;
  name: string;
  type: "website" | "api" | "ssl";
  url: string;
  method?: string;
  intervalSec?: number;
  expectedStatusCode?: number;
  members?: (string | UserLite)[];
  extraAlertEmails?: string[];
  enabled: boolean;
  status: MonitorStatus;
  lastResponseTimeMs?: number;
  lastCheckedAt?: string;
}
