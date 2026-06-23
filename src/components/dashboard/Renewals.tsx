"use client";

import Link from "next/link";
import { useSslExpiring, useDomainExpiring } from "@/lib/hooks";
import { Card, CardTitle, Skeleton, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Kind = "domain" | "ssl";
interface Row {
  monitorId: string;
  name: string;
  url: string;
  project?: string | null;
  days: number | null;
  date: string | null;
  kind: Kind;
}

/** Human, never-negative label for a days-remaining value, with an urgency tone. */
function humanize(days: number | null): { label: string; tone: string } {
  if (days == null) return { label: "—", tone: "text-muted" };
  if (days < 0) return { label: "Expired", tone: "text-down" };
  if (days === 0) return { label: "Today", tone: "text-down" };
  if (days === 1) return { label: "Tomorrow", tone: "text-down" };
  if (days <= 7) return { label: `in ${days} days`, tone: "text-down" };
  if (days <= 30) return { label: `in ${days} days`, tone: "text-degraded" };
  return { label: `in ${days} days`, tone: "text-muted" }; // far out — calm; the date carries the detail
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function isCritical(r: Row): boolean {
  return r.days != null && r.days <= 7;
}

function RowItem({ r, showKind = false }: { r: Row; showKind?: boolean }) {
  const h = humanize(r.days);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <Link href={`/monitors/${r.monitorId}`} className="group flex min-w-0 items-center gap-2">
        {showKind && (
          <Icon name={r.kind === "domain" ? "globe" : "shield"} width={13} height={13} className="shrink-0 text-muted" />
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm group-hover:text-brand" title={r.name}>
            {r.name}
          </span>
          <span className="block truncate text-[11px] text-muted" title={`${r.project ? `${r.project} · ` : ""}${r.url}`}>
            {r.project && <span className="text-fg/65">{r.project}</span>}
            {r.project ? " · " : ""}
            {r.url}
          </span>
        </span>
      </Link>
      <span className="shrink-0 text-right">
        <span className={cn("block text-sm font-medium", h.tone)}>{h.label}</span>
        {r.date && <span className="block text-[11px] tabular-nums text-muted">{fmtDate(r.date)}</span>}
      </span>
    </li>
  );
}

function Group({ icon, label, items, empty }: { icon: "globe" | "shield"; label: string; items: Row[]; empty: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon name={icon} width={13} height={13} />
        {label}
      </div>
      {!items.length ? (
        <p className="py-1.5 text-xs text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <RowItem key={r.monitorId + r.kind} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Upcoming renewals — anything expired/imminent is pinned up top, then domains, then SSL. */
export function Renewals() {
  const domain = useDomainExpiring();
  const ssl = useSslExpiring();
  const loading = domain.isLoading || ssl.isLoading;

  const rows: Row[] = [
    ...(domain.data ?? []).map((d) => ({ monitorId: d.monitorId, name: d.name, url: d.url, project: d.project, days: d.daysRemaining, date: d.domainExpiresAt, kind: "domain" as const })),
    ...(ssl.data ?? []).map((s) => ({ monitorId: s.monitorId, name: s.name, url: s.url, project: s.project, days: s.daysRemaining, date: s.sslExpiresAt, kind: "ssl" as const })),
  ];

  const critical = rows.filter(isCritical).sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  const domains = rows.filter((r) => r.kind === "domain" && !isCritical(r));
  const ssls = rows.filter((r) => r.kind === "ssl" && !isCritical(r));

  return (
    <Card>
      <CardTitle>Renewals</CardTitle>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState icon="🗓️" title="Nothing to renew" description="No domains or certificates are nearing expiry." />
      ) : (
        <div className="space-y-4">
          {critical.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-down">
                <Icon name="alert" width={13} height={13} />
                Needs attention
              </div>
              <ul className="divide-y divide-border/60 rounded-lg bg-down/[0.05] px-2">
                {critical.map((r) => (
                  <RowItem key={r.monitorId + r.kind} r={r} showKind />
                ))}
              </ul>
            </div>
          )}
          <Group icon="globe" label="Domains" items={domains} empty="All domains registered well ahead." />
          <Group icon="shield" label="SSL certificates" items={ssls} empty="No certificates nearing expiry." />
        </div>
      )}
    </Card>
  );
}
