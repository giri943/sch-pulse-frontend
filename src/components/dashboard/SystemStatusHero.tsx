"use client";

import Link from "next/link";
import { useStatusBoard, useDashboardStats, useSslExpiring, useDomainExpiring } from "@/lib/hooks";
import { Skeleton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Tone = "up" | "degraded" | "down" | "neutral";

const TONE: Record<Tone, { var: string; panel: string; text: string; icon: "check" | "alert" | "activity" }> = {
  up: { var: "--up", panel: "border-up/30 bg-up/[0.06]", text: "text-up", icon: "check" },
  degraded: { var: "--degraded", panel: "border-degraded/30 bg-degraded/[0.06]", text: "text-degraded", icon: "alert" },
  down: { var: "--down", panel: "border-down/40 bg-down/[0.07]", text: "text-down", icon: "alert" },
  neutral: { var: "--muted", panel: "border-border bg-surface", text: "text-fg", icon: "activity" },
};

/**
 * The dashboard's lead element: a single, state-reactive verdict on overall
 * system health, a proportional fleet-health bar, and the few stats that imply
 * action. Serene green when all's well; clearly alert when something's down.
 */
export function SystemStatusHero() {
  const { data: board, isLoading } = useStatusBoard();
  const { data: dash } = useDashboardStats();
  const { data: ssl } = useSslExpiring();
  const { data: domain } = useDomainExpiring();

  if (isLoading || !board) return <Skeleton className="h-40 rounded-2xl" />;

  const active = board.filter((m) => m.enabled !== false);
  const paused = board.length - active.length;
  const by = (s: string) => active.filter((m) => m.status === s).length;
  const down = by("down");
  const degraded = by("degraded");
  const healthy = by("operational");
  const unknown = by("unknown");
  const total = board.length;
  const incidents = dash?.stats.openIncidents ?? 0;
  const sslCount = ssl?.length ?? 0;
  const domainCount = domain?.length ?? 0;
  const uptime30d = dash?.stats.uptime30d ?? null;

  const tone: Tone =
    total === 0
      ? "neutral"
      : active.length === 0 // every monitor paused
        ? "neutral"
        : down > 0
          ? "down"
          : degraded > 0
            ? "degraded"
            : healthy === 0 && unknown > 0 // active, but no results yet
              ? "neutral"
              : "up";
  const t = TONE[tone];
  const trouble = tone === "down" || tone === "degraded";
  const { title, sub } = verdict({ tone, total, activeCount: active.length, down, degraded, healthy, incidents });

  const segs = [
    { n: healthy, v: "--up" },
    { n: degraded, v: "--degraded" },
    { n: down, v: "--down" },
    { n: unknown + paused, v: "--muted" },
  ].filter((s) => s.n > 0);

  return (
    <section className={cn("rounded-2xl border p-5 transition-colors md:p-6", t.panel)}>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Verdict */}
        <div className="flex items-center gap-4">
          <span
            className={cn("relative grid h-12 w-12 flex-none place-items-center rounded-2xl", t.text)}
            style={{ background: `rgb(var(${t.var}) / 0.14)` }}
          >
            {trouble && (
              <span
                className="absolute inset-0 rounded-2xl opacity-30 animate-ping motion-reduce:animate-none"
                style={{ background: `rgb(var(${t.var}) / 0.6)` }}
                aria-hidden
              />
            )}
            <Icon name={t.icon} width={22} height={22} className="relative" />
          </span>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">System status</div>
            <h1 className={cn("text-2xl font-semibold tracking-tight md:text-[28px]", t.text)}>{title}</h1>
            <p className="mt-0.5 text-sm text-muted">{sub}</p>
          </div>
        </div>

        {/* Fleet health + action stats */}
        <div className="md:w-[42%] md:max-w-md">
          {total > 0 ? (
            <>
              <div className="flex h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${healthy} healthy, ${degraded} degraded, ${down} down, ${paused} paused`}>
                {segs.map((s, i) => (
                  <span key={i} style={{ width: `${(s.n / total) * 100}%`, background: `rgb(var(${s.v}))` }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <Legend varName="--up" label="healthy" n={healthy} />
                {degraded > 0 && <Legend varName="--degraded" label="degraded" n={degraded} />}
                {down > 0 && <Legend varName="--down" label="down" n={down} />}
                {paused > 0 && <Legend varName="--muted" label="paused" n={paused} />}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No monitors to report on yet.</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label="Uptime 30d" value={uptime30d == null ? "—" : `${uptime30d}%`} />
            <Link href="/incidents" className="rounded-lg transition-transform hover:-translate-y-0.5">
              <Chip label="Active incidents" value={incidents} tone={incidents > 0 ? "down" : undefined} />
            </Link>
            <Chip label="Domain expiring" value={domainCount} tone={domainCount > 0 ? "down" : undefined} />
            <Chip label="SSL expiring" value={sslCount} tone={sslCount > 0 ? "degraded" : undefined} />
          </div>
        </div>
      </div>
    </section>
  );
}

function verdict(p: { tone: Tone; total: number; activeCount: number; down: number; degraded: number; healthy: number; incidents: number }): {
  title: string;
  sub: string;
} {
  if (p.total === 0) return { title: "No monitors yet", sub: "Add a project and your first monitor to start tracking uptime." };
  if (p.activeCount === 0)
    return { title: "Monitoring paused", sub: `All ${p.total} monitor${p.total === 1 ? "" : "s"} are paused.` };
  if (p.tone === "down")
    return {
      title: `${p.down} ${p.down === 1 ? "monitor" : "monitors"} down`,
      sub: p.incidents > 0 ? `${p.incidents} active incident${p.incidents === 1 ? "" : "s"} — needs attention now.` : "Needs attention now.",
    };
  if (p.tone === "degraded")
    return { title: `${p.degraded} ${p.degraded === 1 ? "monitor" : "monitors"} degraded`, sub: "Response times are below normal." };
  if (p.tone === "neutral") return { title: "Awaiting first checks", sub: "Monitors are set up — results will appear shortly." };
  return { title: "All systems operational", sub: `All ${p.healthy} active monitor${p.healthy === 1 ? "" : "s"} are healthy.` };
}

function Legend({ varName, label, n }: { varName: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `rgb(var(${varName}))` }} />
      <span className="font-medium text-fg">{n}</span> {label}
    </span>
  );
}

function Chip({ label, value, tone }: { label: string; value: string | number; tone?: "down" | "degraded" }) {
  const toneText = tone === "down" ? "text-down" : tone === "degraded" ? "text-degraded" : "text-fg";
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("text-sm font-semibold", toneText)}>{value}</div>
    </div>
  );
}
