"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/lib/api-client";
import { useMonitorAction, useDeleteMonitor, useTestNotification } from "@/lib/mutations";
import type { Monitor, Paginated, IncidentRow, UserLite } from "@/lib/types";
import { Button, Card, CardTitle } from "@/components/ui";
import { MonitorFormModal } from "@/components/MonitorFormModal";

interface Check {
  _id: string;
  up: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string | null;
  checkedAt: string;
}
interface UptimeSeries {
  series: { t: string; uptime: number | null; avgResponseMs: number | null }[];
}
interface Summary {
  status: string;
  down: boolean;
  stateSince: string | null;
  lastCheckedAt: string | null;
  intervalSec?: number;
  sslExpiresAt: string | null;
  uptime: { "24h": number | null; "7d": number | null; "30d": number | null };
  response: { avg: number | null; min: number | null; max: number | null; checks: number };
  totalIncidents: number;
}

const STATUS_COLOR: Record<string, string> = {
  operational: "bg-up",
  degraded: "bg-degraded",
  down: "bg-down",
  paused: "bg-muted",
  unknown: "bg-muted",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"} ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.floor(h / 24)} day(s) ago`;
}

function sinceDuration(iso: string | null): string {
  if (!iso) return "—";
  let s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}

function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${v}%`;
}
function dateStr(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}
function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const action = useMonitorAction();
  const del = useDeleteMonitor();
  const test = useTestNotification();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: monitor } = useQuery({
    queryKey: ["monitor", id],
    queryFn: () => apiFetch<Monitor>(`/monitors/${id}`),
    refetchInterval: 15_000,
  });
  const { data: summary } = useQuery({
    queryKey: ["monitor", id, "summary"],
    queryFn: () => apiFetch<Summary>(`/monitors/${id}/summary`),
    refetchInterval: 20_000,
  });
  const { data: uptime } = useQuery({
    queryKey: ["monitor", id, "uptime"],
    queryFn: () => apiFetch<UptimeSeries>(`/monitors/${id}/uptime?range=24h`),
    refetchInterval: 30_000,
  });
  const { data: checks } = useQuery({
    queryKey: ["monitor", id, "checks"],
    queryFn: () => apiFetch<Paginated<Check>>(`/monitors/${id}/checks?limit=20`),
    refetchInterval: 15_000,
  });
  const { data: incidents } = useQuery({
    queryKey: ["monitor", id, "incidents"],
    queryFn: () => apiFetch<Paginated<IncidentRow>>(`/incidents?monitorId=${id}&limit=20`),
  });

  const memberUsers = ((monitor?.members ?? []).filter((m) => typeof m === "object") as UserLite[]);
  const recipients = [...memberUsers.map((u) => u.email), ...(monitor?.extraAlertEmails ?? [])];
  const chart =
    uptime?.series.map((p) => ({
      t: new Date(p.t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }),
      ms: p.avgResponseMs ?? 0,
    })) ?? [];
  const bars = uptime?.series.slice(-30) ?? [];

  async function runTest() {
    setToast(null);
    try {
      const res = await test.mutateAsync(id);
      setToast(res.message);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to send test notification");
    }
  }

  const intervalMin = (summary?.intervalSec ?? monitor?.intervalSec ?? 0) / 60;

  return (
    <div className="space-y-5">
      <Link href="/monitors" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg bg-surface border border-border rounded-lg px-3 py-1.5">
        ‹ Monitors
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-full grid place-items-center ${STATUS_COLOR[monitor?.status ?? "unknown"]}/20`}>
            <div className={`h-9 w-9 rounded-full grid place-items-center ${STATUS_COLOR[monitor?.status ?? "unknown"]} text-bg font-bold`}>
              {monitor?.status === "down" ? "▼" : "▲"}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{monitor?.name ?? "…"}</h1>
            <p className="text-sm text-muted">
              {(monitor?.type ?? "").toUpperCase()} monitor for{" "}
              <a href={monitor?.url} target="_blank" rel="noreferrer" className="hover:text-brand">
                {monitor?.url}
              </a>
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-surface border border-border rounded px-2 py-0.5 text-muted capitalize">
                {monitor?.type}
              </span>
              {intervalMin > 0 && (
                <span className="text-xs bg-surface border border-border rounded px-2 py-0.5 text-muted">
                  every {intervalMin}m
                </span>
              )}
            </div>
          </div>
        </div>
        {monitor && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={runTest} disabled={test.isPending}>
              🔔 {test.isPending ? "Sending…" : "Test notification"}
            </Button>
            <Button variant="ghost" onClick={() => action.mutate({ id, action: monitor.enabled ? "pause" : "resume" })}>
              {monitor.enabled ? "⏸ Pause" : "▶ Resume"}
            </Button>
            <Button variant="ghost" onClick={() => action.mutate({ id, action: "run" })}>
              Run now
            </Button>
            <Button variant="ghost" onClick={() => setEditing(true)}>
              ⚙ Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Delete monitor "${monitor.name}"?`)) {
                  del.mutate(id);
                  router.replace("/monitors");
                }
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {toast && (
        <div className="bg-up/15 text-up text-sm rounded-lg px-3 py-2 border border-up/20">{toast}</div>
      )}

      {/* Top cards + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-muted">Current status</div>
          <div className={`mt-2 text-2xl font-semibold ${summary?.down ? "text-down" : "text-up"}`}>
            {summary?.down ? "Down" : monitor?.status === "paused" ? "Paused" : "Up"}
          </div>
          <div className="text-xs text-muted mt-1">
            {summary?.down ? "Down for" : "Currently up for"} {sinceDuration(summary?.stateSince ?? null)}
          </div>
        </Card>

        <Card>
          <div className="text-sm text-muted">Last check</div>
          <div className="mt-2 text-2xl font-semibold">{timeAgo(summary?.lastCheckedAt ?? null)}</div>
          <div className="text-xs text-muted mt-1">Checked every {intervalMin}m</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">Last 24 hours</div>
            <div className="text-sm font-semibold text-up">{pct(summary?.uptime["24h"])}</div>
          </div>
          <div className="mt-3 flex items-end gap-[3px] h-9">
            {bars.length ? (
              bars.map((b, i) => (
                <div
                  key={i}
                  title={`${b.uptime ?? "?"}%`}
                  className={`flex-1 rounded-sm ${
                    b.uptime == null ? "bg-muted/30" : b.uptime >= 100 ? "bg-up" : b.uptime > 0 ? "bg-degraded" : "bg-down"
                  }`}
                  style={{ height: "100%" }}
                />
              ))
            ) : (
              <div className="text-xs text-muted">No data yet</div>
            )}
          </div>
          <div className="text-xs text-muted mt-2">{summary?.totalIncidents ?? 0} incidents total</div>
        </Card>

        <Card>
          <div className="text-sm text-muted">Domain &amp; SSL cert.</div>
          {summary?.sslExpiresAt ? (
            <>
              <div className="text-xs text-muted mt-3">SSL certificate valid until</div>
              <div className="text-lg font-semibold">🔒 {dateStr(summary.sslExpiresAt)}</div>
              {(() => {
                const days = Math.ceil(
                  (new Date(summary.sslExpiresAt).getTime() - Date.now()) / 86400000,
                );
                const tone = days <= 7 ? "text-down" : days <= 15 ? "text-degraded" : "text-up";
                return <div className={`text-xs mt-1 ${tone}`}>{days} days remaining</div>;
              })()}
            </>
          ) : (
            <p className="text-xs text-muted mt-3">
              No SSL details available{monitor && !monitor.url.startsWith("https://") ? " (not an HTTPS URL)." : "."}
            </p>
          )}
        </Card>
      </div>

      {/* Uptime stats */}
      <Card>
        <CardTitle>Uptime stats</CardTitle>
        <div className="grid grid-cols-3 gap-6">
          {(["24h", "7d", "30d"] as const).map((w) => (
            <div key={w}>
              <div className="text-sm text-muted">Last {w === "24h" ? "24 hours" : w === "7d" ? "7 days" : "30 days"}</div>
              <div className="text-2xl font-semibold text-up mt-1">{pct(summary?.uptime[w])}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Response time + To be notified */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <CardTitle>Response time (last 24h)</CardTitle>
            <span className="text-xs text-muted">
              avg {summary?.response.avg ?? "—"}ms · min {summary?.response.min ?? "—"} · max {summary?.response.max ?? "—"}
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="rt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fill: "#6b7280", fontSize: 11 }} minTickGap={40} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={44} unit="ms" />
                <Tooltip
                  contentStyle={{ background: "#11151d", border: "1px solid #1e2530", borderRadius: 8 }}
                  labelStyle={{ color: "#e6e9ef" }}
                />
                <Area type="monotone" dataKey="ms" stroke="#22c55e" fill="url(#rt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>To be notified</CardTitle>
          {recipients.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {recipients.map((r) => (
                  <span
                    key={r}
                    title={r}
                    className="h-8 w-8 grid place-items-center rounded-full bg-brand/20 text-brand text-xs font-semibold"
                  >
                    {initials(r)}
                  </span>
                ))}
              </div>
              <ul className="text-xs text-muted space-y-1 mt-2">
                {recipients.map((r) => (
                  <li key={r} className="truncate">{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted">
              No recipients yet. Click <b>Edit</b> to add alert emails for this monitor.
            </p>
          )}
        </Card>
      </div>

      {/* Latest events + recent checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Latest events</CardTitle>
          {!incidents?.data.length ? (
            <p className="text-muted text-sm">No incidents 🎉</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {incidents.data.map((i) => (
                <li key={i._id} className="flex items-center justify-between py-2">
                  <span className={i.status === "open" ? "text-down" : "text-up"}>
                    {i.status === "open" ? "🔴 Down" : "🟢 Recovered"}
                  </span>
                  <span className="text-muted">{new Date(i.startedAt).toLocaleString()}</span>
                  <span className="text-muted">
                    {i.durationSec != null ? `${Math.round(i.durationSec / 60)}m` : "ongoing"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Recent checks</CardTitle>
          {!checks?.data.length ? (
            <p className="text-muted text-sm">No checks yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {checks.data.map((c) => (
                <li key={c._id} className="flex items-center justify-between py-2">
                  <span className={c.up ? "text-up" : "text-down"}>{c.up ? "● up" : "● down"}</span>
                  <span className="text-muted">{c.statusCode ?? c.error ?? "—"}</span>
                  <span className="text-muted">{c.responseTimeMs != null ? `${c.responseTimeMs}ms` : "—"}</span>
                  <span className="text-muted">{new Date(c.checkedAt).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {monitor && (
        <MonitorFormModal key={monitor._id} open={editing} onClose={() => setEditing(false)} monitor={monitor} />
      )}
    </div>
  );
}
