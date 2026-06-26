"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/lib/api-client";
import { useMonitorAction, useDeleteMonitor, useTestNotification } from "@/lib/mutations";
import { useProject } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import type { Monitor, Paginated, IncidentRow, UserLite } from "@/lib/types";
import { Button, Card, CardTitle, StatusDot, StatusBadge, Tabs, Skeleton, EmptyState, Badge } from "@/components/ui";
import { MetricCard } from "@/components/MetricCard";
import { MonitorFormModal } from "@/components/MonitorFormModal";
import { IncidentDetailRow } from "@/components/IncidentDetailRow";
import { WafNotice } from "@/components/WafNotice";

interface Check { _id: string; up: boolean; statusCode?: number; responseTimeMs?: number; error?: string | null; checkedAt: string }
interface UptimeSeries { series: { t: string; uptime: number | null; avgResponseMs: number | null }[] }
interface Summary {
  status: string; down: boolean; stateSince: string | null; lastCheckedAt: string | null;
  monitoringSince?: string | null;
  intervalSec?: number; sslExpiresAt: string | null; domainExpiresAt?: string | null;
  uptime: { "24h": number | null; "7d": number | null; "30d": number | null };
  response: { avg: number | null; min: number | null; max: number | null; checks: number };
  totalIncidents: number;
}

function sinceDuration(iso: string | null): string {
  if (!iso) return "—";
  let s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}
const pct = (v: number | null | undefined) => (v == null ? "—" : `${v}%`);
const dateStr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

export default function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const action = useMonitorAction();
  const del = useDeleteMonitor();
  const test = useTestNotification();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("overview");
  // Which incident is expanded, and the one we arrived at via ?incident= (flashed once).
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [deepTarget, setDeepTarget] = useState<string | null>(null);

  // Honour deep links (?tab= / ?incident=) after mount — avoids a Suspense
  // boundary and any SSR/hydration mismatch from reading the URL during render.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const inc = sp.get("incident");
    const t = sp.get("tab") ?? (inc ? "incidents" : null);
    if (t) setTab(t);
    if (inc) {
      setOpenIncidentId(inc);
      setDeepTarget(inc);
    }
  }, []);

  const { data: monitor } = useQuery({ queryKey: ["monitor", id], queryFn: () => apiFetch<Monitor>(`/monitors/${id}`), refetchInterval: 15_000 });
  const { data: summary } = useQuery({ queryKey: ["monitor", id, "summary"], queryFn: () => apiFetch<Summary>(`/monitors/${id}/summary`), refetchInterval: 20_000 });
  const { data: uptime } = useQuery({ queryKey: ["monitor", id, "uptime"], queryFn: () => apiFetch<UptimeSeries>(`/monitors/${id}/uptime?range=24h`), refetchInterval: 30_000 });
  const { data: checks } = useQuery({ queryKey: ["monitor", id, "checks"], queryFn: () => apiFetch<Paginated<Check>>(`/monitors/${id}/checks?limit=20`), refetchInterval: 15_000 });
  const { data: incidents } = useQuery({ queryKey: ["monitor", id, "incidents"], queryFn: () => apiFetch<Paginated<IncidentRow>>(`/incidents?monitorId=${id}&limit=50`), refetchInterval: 30_000 });
  // Project role decides who can edit incident notes (owner/editor/super).
  const { data: projectDetail } = useProject(monitor?.project?.id ?? "");
  const canEditIncident = ["owner", "editor", "super"].includes(projectDetail?.myRole ?? "");

  const memberUsers = (monitor?.members ?? []).filter((m) => typeof m === "object") as UserLite[];
  const recipients = [...memberUsers.map((u) => u.email), ...(monitor?.extraAlertEmails ?? [])];
  const chart = uptime?.series.map((p) => ({ t: new Date(p.t).toLocaleString([], { hour: "2-digit", day: "numeric", month: "short" }), ms: p.avgResponseMs })) ?? [];
  const bars = uptime?.series.slice(-32) ?? [];
  const intervalMin = (summary?.intervalSec ?? monitor?.intervalSec ?? 0) / 60;

  async function runTest() {
    try {
      const res = await test.mutateAsync(id);
      if (res.emailFailed) toast.error(res.message);
      else toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    }
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "incidents", label: `Incidents${summary?.totalIncidents ? ` (${summary.totalIncidents})` : ""}` },
    { key: "checks", label: "Recent checks" },
    { key: "ssl", label: "SSL & config" },
    { key: "alerts", label: "Alerts" },
  ];

  return (
    <div className="space-y-6">
      <Link
        href={monitor?.project?.id ? `/projects/${monitor.project.id}` : "/projects"}
        className="text-sm text-muted hover:text-fg"
      >
        ‹ {monitor?.project?.name ?? "Projects"}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl grid place-items-center bg-surface-2">
            <StatusDot status={monitor?.status ?? "unknown"} pulse />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              {monitor?.name ?? "…"} {monitor && <StatusBadge status={monitor.enabled ? monitor.status : "paused"} />}
            </h1>
            <a href={monitor?.url} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-brand">{monitor?.url}</a>
            {monitor && <ExpiryChip expiresAt={monitor.expiresAt ?? null} />}
          </div>
        </div>
        {monitor && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={runTest} disabled={test.isPending}>🔔 {test.isPending ? "Sending…" : "Test"}</Button>
            <Button variant="ghost" size="sm" onClick={() => action.mutate({ id, action: monitor.enabled ? "pause" : "resume" })}>{monitor.enabled ? "Pause" : "Resume"}</Button>
            <Button variant="ghost" size="sm" onClick={() => action.mutate({ id, action: "run" }, { onSuccess: () => toast.success("Check scheduled") })}>Run now</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="danger" size="sm" onClick={() => { if (confirm(`Delete "${monitor.name}"?`)) { del.mutate(id); router.replace(monitor.project?.id ? `/projects/${monitor.project.id}` : "/projects"); } }}>Delete</Button>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard label="Uptime 24h" value={pct(summary?.uptime["24h"])} tone="up" />
        <MetricCard label="Uptime 7d" value={pct(summary?.uptime["7d"])} tone="up" />
        <MetricCard label="Uptime 30d" value={pct(summary?.uptime["30d"])} tone="up" />
        <MetricCard label="Avg (24h)" value={summary?.response.avg != null ? `${summary.response.avg}ms` : "—"} />
        <MetricCard label="Current state" value={summary?.down ? "Down" : "Up"} tone={summary?.down ? "down" : "up"} hint={`for ${sinceDuration(summary?.stateSince ?? null)}`} />
        <MetricCard label="Incidents" value={summary?.totalIncidents ?? "—"} tone="neutral" />
      </div>

      {summary?.monitoringSince && (
        <p className="-mt-1 text-xs text-muted">
          Monitoring since{" "}
          {new Date(summary.monitoringSince).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}{" "}
          · {sinceDuration(summary.monitoringSince)} of data so far.
        </p>
      )}

      {monitor && <WafNotice monitor={monitor} />}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="space-y-4">
          <Card>
            <CardTitle right={<span className="text-xs text-muted">avg {summary?.response.avg ?? "—"}ms · min {summary?.response.min ?? "—"} · max {summary?.response.max ?? "—"}</span>}>
              Response time (24h)
            </CardTitle>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: 4, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="rt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} minTickGap={48} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} width={64} unit="ms" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "rgb(var(--fg))" }} />
                  <Area type="monotone" dataKey="ms" stroke="#22c55e" fill="url(#rt)" strokeWidth={2} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <CardTitle>Availability (last 24h)</CardTitle>
            <div className="flex items-end gap-[3px] h-10">
              {bars.length ? bars.map((b, i) => (
                <div key={i} title={`${b.uptime ?? "?"}%`} className={`flex-1 rounded-sm ${b.uptime == null ? "bg-muted/30" : b.uptime >= 100 ? "bg-up" : b.uptime > 0 ? "bg-degraded" : "bg-down"}`} style={{ height: "100%" }} />
              )) : <span className="text-xs text-muted">No data yet</span>}
            </div>
          </Card>
        </div>
      )}

      {tab === "incidents" && (
        <Card>
          {!incidents?.data.length ? (
            <EmptyState icon="✅" title="No incidents" description="This monitor hasn't had any downtime." />
          ) : (
            <ul className="space-y-1">
              {incidents.data.map((i) => (
                <IncidentDetailRow
                  key={i._id}
                  incident={i}
                  open={openIncidentId === i._id}
                  onToggle={() => setOpenIncidentId((cur) => (cur === i._id ? null : i._id))}
                  canEdit={canEditIncident}
                  deepLinked={deepTarget === i._id}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "checks" && (
        <Card>
          {!checks?.data.length ? (
            <EmptyState icon="🩺" title="No checks yet" description="Run a check to see results here." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted text-left"><tr><th className="py-2">Result</th><th>Code / error</th><th>Latency</th><th>Time</th></tr></thead>
              <tbody>
                {checks.data.map((c) => (
                  <tr key={c._id} className="border-t border-border">
                    <td className={`py-2 ${c.up ? "text-up" : "text-down"}`}>{c.up ? "● up" : "● down"}</td>
                    <td className="text-muted">{c.statusCode ?? c.error ?? "—"}</td>
                    <td className="text-muted">{c.responseTimeMs != null ? `${c.responseTimeMs}ms` : "—"}</td>
                    <td className="text-muted">{new Date(c.checkedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "ssl" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardTitle>Domain &amp; SSL</CardTitle>
            {summary?.sslExpiresAt ? (
              <div className="text-sm space-y-1">
                <div className="text-muted text-xs">SSL certificate valid until</div>
                <div className="text-lg font-semibold">🔒 {dateStr(summary.sslExpiresAt)}</div>
                {(() => {
                  const days = Math.ceil((new Date(summary.sslExpiresAt).getTime() - Date.now()) / 86400000);
                  const tone = days <= 7 ? "text-down" : days <= 15 ? "text-degraded" : "text-up";
                  return <div className={`text-xs ${tone}`}>{days} days remaining</div>;
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted">No SSL details available{monitor && !monitor.url.startsWith("https://") ? " (not an HTTPS URL)." : "."}</p>
            )}
            <div className="mt-4 border-t border-border pt-3 text-sm space-y-1">
              <div className="text-muted text-xs">Domain registration expires</div>
              {summary?.domainExpiresAt ? (
                <>
                  <div className="text-lg font-semibold">🌐 {dateStr(summary.domainExpiresAt)}</div>
                  {(() => {
                    const days = Math.ceil((new Date(summary.domainExpiresAt).getTime() - Date.now()) / 86400000);
                    const tone = days <= 7 ? "text-down" : days <= 15 ? "text-degraded" : "text-up";
                    return <div className={`text-xs ${tone}`}>{days} days remaining</div>;
                  })()}
                </>
              ) : (
                <div className="text-xs text-muted">Checking… (updates within a day)</div>
              )}
            </div>
          </Card>
          <Card>
            <CardTitle>Configuration</CardTitle>
            {monitor ? (
              <dl className="text-sm space-y-2">
                {[["Type", monitor.type], ["Method", monitor.method ?? "GET"], ["Interval", `${intervalMin} min`], ["Expected", String(monitor.expectedStatusCode ?? 200)], ["Enabled", monitor.enabled ? "Yes" : "Paused"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="capitalize">{v}</dd></div>
                ))}
              </dl>
            ) : <Skeleton className="h-24" />}
          </Card>
        </div>
      )}

      {tab === "alerts" && (
        <Card>
          <CardTitle right={monitor && <Button size="sm" variant="ghost" onClick={runTest} disabled={test.isPending}>🔔 Send test</Button>}>
            Alert recipients
          </CardTitle>
          <p className="text-xs text-muted mb-3">Channels: <Badge tone="brand">Email</Badge>{" "}
            {((monitor?.channels ?? []).filter((c) => typeof c === "object") as { id: string; name: string }[]).map((c) => (
              <Badge key={c.id} tone="up">💬 {c.name}</Badge>
            ))}
            <span className="opacity-50"> WhatsApp (planned)</span>
          </p>
          {recipients.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {memberUsers.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 bg-surface-2 rounded-full pl-1 pr-2.5 py-1 text-xs">
                    <span className="h-5 w-5 grid place-items-center rounded-full bg-brand/20 text-brand text-[10px] font-semibold">{u.name.slice(0, 1).toUpperCase()}</span>
                    {u.name}
                  </span>
                ))}
                {(monitor?.extraAlertEmails ?? []).map((e) => (
                  <span key={e} className="inline-flex items-center bg-surface-2 rounded-full px-2.5 py-1 text-xs text-muted">{e}</span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon="🔔" title="No recipients" description="Edit this monitor to tag teammates or add alert emails." action={monitor && <Button size="sm" onClick={() => setEditing(true)}>Edit monitor</Button>} />
          )}
        </Card>
      )}

      {monitor && <MonitorFormModal key={monitor._id} open={editing} onClose={() => setEditing(false)} monitor={monitor} />}
    </div>
  );
}

function ExpiryChip({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <Badge tone="neutral">♾ No expiry</Badge>;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  const tone = days <= 3 ? "down" : days <= 7 ? "degraded" : "neutral";
  return (
    <Badge tone={tone}>
      {days < 0 ? "Expired" : `Expires in ${days}d`} · {new Date(expiresAt).toLocaleDateString()}
    </Badge>
  );
}
