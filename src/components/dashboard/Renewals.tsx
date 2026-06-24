"use client";

import Link from "next/link";
import { useSslExpiring, useDomainExpiring, useExpiringMonitors } from "@/lib/hooks";
import { Card, CardTitle, Skeleton, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Kind = "domain" | "ssl" | "monitor";
const KIND = {
  domain: { icon: "globe", label: "Domain" },
  ssl: { icon: "shield", label: "SSL" },
  monitor: { icon: "activity", label: "Monitoring" },
} as const;

interface Row {
  monitorId: string;
  name: string;
  url: string;
  project?: string | null;
  days: number | null;
  date: string | null;
  kind: Kind;
}

/** Human, never-negative label for days-remaining, with an urgency tone. */
function humanize(days: number | null): { label: string; tone: string } {
  if (days == null) return { label: "—", tone: "text-muted" };
  if (days < 0) return { label: "Expired", tone: "text-down" };
  if (days === 0) return { label: "Today", tone: "text-down" };
  if (days === 1) return { label: "Tomorrow", tone: "text-down" };
  if (days <= 7) return { label: `${days} days`, tone: "text-down" };
  if (days <= 30) return { label: `${days} days`, tone: "text-degraded" };
  return { label: `${days} days`, tone: "text-muted" };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Renewals — a single list of everything that needs renewing (domains, SSL,
 * monitoring periods), sorted soonest-first so the urgent items lead. Type is a
 * small leading glyph; urgency is the coloured label on the right. No section
 * headers — one calm, scannable list.
 */
export function Renewals() {
  const domain = useDomainExpiring();
  const ssl = useSslExpiring();
  const period = useExpiringMonitors();
  const loading = domain.isLoading || ssl.isLoading || period.isLoading;

  const rows: Row[] = [
    ...(domain.data ?? []).map((d) => ({ monitorId: d.monitorId, name: d.name, url: d.url, project: d.project, days: d.daysRemaining, date: d.domainExpiresAt, kind: "domain" as const })),
    ...(ssl.data ?? []).map((s) => ({ monitorId: s.monitorId, name: s.name, url: s.url, project: s.project, days: s.daysRemaining, date: s.sslExpiresAt, kind: "ssl" as const })),
    ...(period.data ?? []).map((m) => ({ monitorId: m.monitorId, name: m.name, url: m.url, project: m.project, days: m.daysRemaining, date: m.expiresAt, kind: "monitor" as const })),
  ].sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));

  const urgent = rows.filter((r) => r.days != null && r.days <= 7).length;

  return (
    <Card>
      <CardTitle
        right={
          rows.length ? (
            <span className={cn("text-xs font-medium", urgent ? "text-down" : "text-muted")}>
              {urgent ? `${urgent} need${urgent === 1 ? "s" : ""} attention` : `${rows.length} upcoming`}
            </span>
          ) : null
        }
      >
        Renewals
      </CardTitle>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState icon="🗓️" title="Nothing to renew" description="No domains, certificates or monitoring periods are nearing expiry." />
      ) : (
        <ul className="-mx-2 max-h-80 divide-y divide-border overflow-y-auto pr-1">
          {rows.map((r) => {
            const h = humanize(r.days);
            const k = KIND[r.kind];
            return (
              <li key={r.monitorId + r.kind}>
                <Link href={`/monitors/${r.monitorId}`} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2">
                  <Icon name={k.icon} width={15} height={15} className="shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm group-hover:text-brand" title={r.name}>
                      {r.name}
                    </div>
                    <div className="truncate text-[11px] text-muted" title={`${k.label}${r.project ? ` · ${r.project}` : ""}`}>
                      {k.label}
                      {r.project ? ` · ${r.project}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={cn("text-sm font-medium", h.tone)}>{h.label}</div>
                    {r.date && <div className="text-[11px] tabular-nums text-muted">{fmtDate(r.date)}</div>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
