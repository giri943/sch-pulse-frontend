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
  ups?: number;
  count?: number;
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
  project?: string | null;
  status: MonitorStatus;
  enabled?: boolean;
  lastResponseTimeMs: number | null;
  /** Last-24h hourly avg response times (for the row sparkline). */
  spark?: number[];
}

export interface SslExpiringItem {
  monitorId: string;
  name: string;
  url: string;
  project?: string | null;
  sslExpiresAt: string | null;
  daysRemaining: number | null;
}

export interface DomainExpiringItem {
  monitorId: string;
  name: string;
  url: string;
  project?: string | null;
  domainExpiresAt: string | null;
  daysRemaining: number | null;
}

export interface ExpiringMonitorItem {
  monitorId: string;
  name: string;
  url: string;
  project?: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
}

export interface IncidentRow {
  _id: string;
  status: "open" | "resolved";
  startedAt: string;
  resolvedAt?: string | null;
  durationSec: number | null;
  monitorId?: { _id?: string; name?: string; url?: string; projectId?: { name?: string } | null };
}

export interface IncidentRecommendation {
  title: string;
  category?: string;
  steps: string[];
}

/** Full incident, as returned by GET /incidents/:id (lazy-loaded on expand). */
export interface IncidentDetail {
  _id: string;
  status: "open" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  durationSec: number | null;
  trigger?: { statusCode?: number; error?: string; responseTimeMs?: number; server?: string } | null;
  recommendations?: IncidentRecommendation[];
  rootCauseNotes?: string;
  resolutionNotes?: string;
  acknowledgedBy?: string | null;
  monitorId?: { _id?: string; name?: string; url?: string; type?: string } | null;
  /** Plain-language explanation of the failure (server-computed). */
  humanized?: string;
  /** Escalation tiers (minutes) already fired — non-empty means it was escalated. */
  escalationsSent?: number[];
}

export interface UserLite {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface EscalationPolicy {
  enabled: boolean;
  afterMinutes: number;
  emails: string[];
}

export interface RcaReminderPolicy {
  enabled: boolean;
  everyMinutes: number;
  windowMinutes: number;
}

export interface AppNotification {
  id: string;
  type: "mention" | "project" | "incident" | "maintenance" | "expiry";
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string | null;
}

export interface DeployToken {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt?: string | null;
  createdAt?: string | null;
}

export interface MaintenanceWindow {
  _id: string;
  scope: "monitor" | "project";
  monitorId?: string | null;
  projectId?: string | null;
  startAt: string;
  endAt: string;
  reason: string;
  proofUrl?: string | null;
  source: "manual" | "deploy-token";
  canceledAt?: string | null;
  createdAt: string;
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
  owner?: UserLite | null; // primary owner (on the list response)
  members?: UserLite[]; // all project members (on the list response)
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
  monitoringScope?: "full" | "ssl" | "domain";
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
  /** Last-24h hourly avg response times (for the card sparkline). */
  spark?: number[];
  /** Last-24h uptime percentage; null when there's no data yet. */
  uptime24h?: number | null;
  /** WAF-aware classification of the latest check. */
  lastClassification?: Classification | null;
  /** Firewall detected in front of this target, if any. */
  waf?: WafVendor | null;
  wafDetectedAt?: string | null;
  /** Certificate / domain-registration expiry (used by SSL-only / Domain-only cards). */
  sslExpiresAt?: string | null;
  domainExpiresAt?: string | null;
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
