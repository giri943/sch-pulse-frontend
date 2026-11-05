"use client";

import { useState } from "react";
import { useUptimeCalendar } from "@/lib/hooks";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/dates";
import type { UptimeCalendarDay } from "@/lib/types";

/** Days are bucketed in IST on the server, so "today"/"this month" must be IST too. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDayKey = (ms = Date.now()) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Uptime → cell colour. Steps are tight at the top on purpose: 99% in a day is
 * ~14 minutes down, which should already read as "not perfect".
 */
const SCALE = [
  { min: 100, bg: "rgb(var(--up))", label: "100%" },
  { min: 99.9, bg: "rgb(var(--up) / 0.5)", label: "≥99.9%" },
  { min: 99, bg: "rgb(var(--degraded))", label: "≥99%" },
  { min: 95, bg: "rgb(var(--down) / 0.55)", label: "≥95%" },
  { min: -1, bg: "rgb(var(--down))", label: "<95%" },
] as const;

function cellColor(d: UptimeCalendarDay): string | null {
  if (!d.count || d.uptime == null) return null;
  // Exactly 100 only when every check passed — never round 99.996 up to "perfect".
  const pct = d.ups === d.count ? 100 : Math.min(d.uptime, 99.99);
  return SCALE.find((s) => pct >= s.min)!.bg;
}

/**
 * GitHub-style calendar heatmap of daily uptime for one month. Scope it with
 * `projectId` or `monitorId`; omit both for everything the user can see.
 */
export function UptimeCalendar({
  projectId,
  monitorId,
  className,
}: {
  projectId?: string;
  monitorId?: string;
  className?: string;
}) {
  const today = istDayKey();
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [active, setActive] = useState<number | null>(null);
  const { data, isLoading, isError } = useUptimeCalendar(month, { projectId, monitorId });

  const days = data?.month === month ? data.days : [];
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
  const isCurrent = month === thisMonth;
  const tone =
    data?.uptime == null ? "text-muted" : data.uptime >= 99.9 ? "text-up" : data.uptime >= 99 ? "text-degraded" : "text-down";

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <NavButton label="Previous month" onClick={() => setMonth((v) => shiftMonth(v, -1))}>
            ‹
          </NavButton>
          <span className="min-w-[8.5rem] text-center text-sm font-medium text-fg">{monthLabel(month)}</span>
          <NavButton label="Next month" disabled={isCurrent} onClick={() => setMonth((v) => shiftMonth(v, 1))}>
            ›
          </NavButton>
          {!isCurrent && (
            <button onClick={() => setMonth(thisMonth)} className="ml-1 text-xs text-muted hover:text-fg">
              This month
            </button>
          )}
        </div>
        {data && data.month === month && (
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              <span className={cn("text-sm font-semibold tabular-nums", tone)}>{data.uptime == null ? "—" : `${data.uptime}%`}</span>{" "}
              uptime
            </span>
            <span>
              <span className={cn("font-medium", data.incidents ? "text-down" : "text-fg")}>{data.incidents}</span> incident
              {data.incidents === 1 ? "" : "s"}
            </span>
            {data.downtimeSec > 0 && (
              <span>
                <span className="font-medium text-fg">{formatDuration(data.downtimeSec)}</span> down
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading && !days.length ? (
        <Skeleton className="h-64" />
      ) : isError ? (
        <div className="grid h-64 place-items-center text-sm text-muted">Couldn&apos;t load uptime for this month.</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Daily uptime, ${monthLabel(month)}`}>
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-0.5 text-center text-[10px] uppercase tracking-wide text-muted">
                {w}
              </div>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <div key={`pad-${i}`} aria-hidden />
            ))}
            {days.map((d, i) => {
              const future = d.date > today;
              const bg = future ? null : cellColor(d);
              const col = (lead + i) % 7;
              const strong = bg != null && !bg.includes("/");
              return (
                <div
                  key={d.date}
                  role="gridcell"
                  tabIndex={future ? -1 : 0}
                  aria-label={`${dayLabel(d.date)}: ${d.uptime == null ? "no data" : `${d.uptime}% uptime`}, ${d.incidents} incidents`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((a) => (a === i ? null : a))}
                  className={cn(
                    "relative flex h-11 flex-col justify-between rounded-md p-1.5 outline-none transition-transform",
                    "focus-visible:ring-2 focus-visible:ring-brand",
                    future ? "border border-dashed border-border/60" : bg ? "hover:scale-[1.04]" : "bg-border/40 hover:scale-[1.04]",
                    d.date === today && "ring-2 ring-brand/70",
                  )}
                  style={bg ? { background: bg } : undefined}
                >
                  <span className={cn("text-[10px] leading-none", strong ? "text-white/90" : future ? "text-muted/50" : "text-muted")}>
                    {Number(d.date.slice(8))}
                  </span>
                  {!future && d.uptime != null && (
                    <span
                      className={cn(
                        "hidden self-end text-[10px] font-medium leading-none tabular-nums sm:block",
                        strong ? "text-white" : "text-fg",
                      )}
                    >
                      {d.ups === d.count ? "100" : d.uptime.toFixed(d.uptime >= 99 ? 2 : 1)}
                    </span>
                  )}
                  {d.incidents > 0 && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-down ring-1 ring-surface" aria-hidden />
                  )}
                  {active === i && !future && <DayTip day={d} col={col} />}
                </div>
              );
            })}
          </div>
          <Legend />
        </>
      )}
    </div>
  );
}

function NavButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border border-border text-base leading-none text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DayTip({ day, col }: { day: UptimeCalendarDay; col: number }) {
  // Keep edge columns' tooltips inside the card.
  const align = col <= 1 ? "left-0" : col >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div className={cn("pointer-events-none absolute bottom-full z-20 mb-2 w-56", align)}>
      <div className="rounded-xl border border-border bg-surface p-3 text-xs shadow-pop">
        <div className="font-medium text-fg">{dayLabel(day.date)}</div>
        <div className="mt-0.5 text-muted">
          {day.uptime == null ? "No checks recorded" : `${day.ups === day.count ? "100" : day.uptime}% uptime · ${day.count.toLocaleString()} checks`}
        </div>
        {day.incidents > 0 && (
          <div className="mt-2 space-y-1 border-t border-border pt-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
              <span className="text-down">
                {day.incidents} incident{day.incidents > 1 ? "s" : ""}
              </span>
              {day.downtimeSec > 0 && <span className="text-muted normal-case">{formatDuration(day.downtimeSec)} down</span>}
            </div>
            {day.monitors.slice(0, 4).map((n) => (
              <div key={n} className="truncate">
                {n}
              </div>
            ))}
            {day.monitors.length > 4 && <div className="text-muted">+{day.monitors.length - 4} more</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-muted">
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-border/40" />
        No data
      </span>
      {[...SCALE].reverse().map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.bg }} />
          {s.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-down" />
        Incident
      </span>
    </div>
  );
}
