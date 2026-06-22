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
  stats: { totalMonitors: number; monitorsDown: number; openIncidents: number; uptime30d: number | null };
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

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount?: number;
}

export interface PermissionGroup {
  resource: string;
  items: { key: string; label: string }[];
}

export interface Me {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  authProvider?: "local" | "google";
  hasPassword?: boolean;
  role: { id: string; name: string };
  permissions: string[];
}

export type ProjectRole = "owner" | "editor" | "viewer";
export type EffectiveProjectRole = ProjectRole | "super" | null;

export interface Project {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  monitorCount: number;
  downCount: number;
  myRole?: EffectiveProjectRole; // only on GET /projects/:id
}

export interface ProjectMemberRow {
  id: string;
  role: ProjectRole;
  user: UserLite;
}

export interface PendingRequest {
  id: string;
  message: string;
  createdAt: string;
  user: UserLite | null;
}

export interface MyJoinRequest {
  id: string;
  project: { id: string; name: string } | null;
  createdAt: string;
}

export interface DiscoverProject {
  id: string;
  name: string;
  description: string;
  requested: boolean;
}

export interface ProjectLite {
  id: string;
  name: string;
}

export interface ChannelLite {
  id: string;
  name: string;
  type: string;
}
export interface Channel extends ChannelLite {
  webhookUrl: string;
  enabled: boolean;
}

export interface Monitor {
  _id: string;
  name: string;
  type: "website" | "api" | "ssl";
  url: string;
  projectId?: string | null;
  project?: ProjectLite | null;
  method?: string;
  intervalSec?: number;
  expectedStatusCode?: number;
  members?: (string | UserLite)[];
  extraAlertEmails?: string[];
  channels?: (string | ChannelLite)[];
  expiresAt?: string | null;
  softDeletedAt?: string | null;
  enabled: boolean;
  status: MonitorStatus;
  lastResponseTimeMs?: number;
  lastCheckedAt?: string;
  /** WAF-aware classification of the latest check. */
  lastClassification?: Classification | null;
  /** Firewall detected in front of this target, if any. */
  waf?: WafVendor | null;
  wafDetectedAt?: string | null;
}

export type Classification =
  | "up"
  | "up_blocked"
  | "up_challenged"
  | "content_mismatch"
  | "down_origin"
  | "down_network"
  | "dns_failed"
  | "tls_failed"
  | "timeout";

export type WafVendor = "cloudflare" | "akamai" | "f5-bigip" | "imperva" | "aws-waf" | "sucuri";

/** Minimal monitor info returned by org-wide discover/search (for joining). */
export interface DiscoverMonitor {
  id: string;
  name: string;
  url: string;
  type: Monitor["type"];
  status: MonitorStatus;
  memberCount: number;
  alreadyMember: boolean;
}
