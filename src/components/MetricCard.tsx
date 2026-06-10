import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui";

type Tone = "neutral" | "up" | "down" | "degraded" | "info" | "brand";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-fg",
  up: "text-up",
  down: "text-down",
  degraded: "text-degraded",
  info: "text-info",
  brand: "text-brand",
};
const TONE_BG: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  up: "bg-up/15 text-up",
  down: "bg-down/15 text-down",
  degraded: "bg-degraded/15 text-degraded",
  info: "bg-info/15 text-info",
  brand: "bg-brand/15 text-brand",
};

export function MetricCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  loading = false,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {icon && <span className={cn("h-7 w-7 grid place-items-center rounded-lg text-sm", TONE_BG[tone])}>{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16 mt-2" />
      ) : (
        <div className={cn("mt-2 text-2xl font-semibold tracking-tight", TONE_TEXT[tone])}>{value}</div>
      )}
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}
