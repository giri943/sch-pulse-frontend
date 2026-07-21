import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

/* ── Surfaces ─────────────────────────────────────────────── */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-surface border border-border rounded-xl p-5 shadow-card", className)}>{children}</div>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-medium text-muted">{children}</h3>
      {right}
    </div>
  );
}

/* ── PageHeader ───────────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Buttons ──────────────────────────────────────────────── */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md";
}) {
  const variants: Record<string, string> = {
    primary: "bg-brand hover:bg-brand/90 text-white shadow-card",
    ghost: "bg-transparent border border-border text-muted hover:text-fg hover:bg-surface-2",
    subtle: "bg-surface-2 text-fg hover:bg-border/60",
    danger: "bg-down/15 text-down hover:bg-down/25",
  };
  const sizes: Record<string, string> = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-2 text-sm" };
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Form controls ────────────────────────────────────────── */
const fieldBase =
  "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-muted/60";

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">
        {label}
        {required && <span className="text-down" aria-hidden> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <span className="text-[11px] text-down mt-1 block">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-muted/80 mt-1 block">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldBase, "appearance-none pr-8", props.className)} />;
}

/* ── Modal ────────────────────────────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={cn(
          "w-full bg-surface border border-border rounded-2xl p-6 shadow-pop animate-fade-in",
          wide ? "max-w-2xl" : "max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-fg text-xl leading-none px-1">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Status primitives ────────────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
  operational: "bg-up/15 text-up",
  degraded: "bg-degraded/15 text-degraded",
  down: "bg-down/15 text-down",
  paused: "bg-muted/15 text-muted",
  maintenance: "bg-info/15 text-info",
  unknown: "bg-muted/15 text-muted",
  active: "bg-up/15 text-up",
  disabled: "bg-muted/15 text-muted",
  archived: "bg-muted/15 text-muted",
  open: "bg-down/15 text-down",
  resolved: "bg-up/15 text-up",
};
const DOT_COLOR: Record<string, string> = {
  operational: "bg-up",
  degraded: "bg-degraded",
  down: "bg-down",
  paused: "bg-muted",
  maintenance: "bg-info",
  unknown: "bg-muted",
  open: "bg-down",
  resolved: "bg-up",
};
const LABEL: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  paused: "Paused",
  maintenance: "Maintenance",
  unknown: "Pending",
};

export function StatusDot({ status, pulse = false }: { status: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {pulse && status === "down" && (
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", DOT_COLOR[status])} />
      )}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", DOT_COLOR[status] ?? DOT_COLOR.unknown)} />
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? STATUS_STYLES.unknown,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLOR[status] ?? DOT_COLOR.unknown)} />
      {LABEL[status] ?? status}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "up" | "down" | "degraded" }) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-muted",
    brand: "bg-brand/15 text-brand",
    up: "bg-up/15 text-up",
    down: "bg-down/15 text-down",
    degraded: "bg-degraded/15 text-degraded",
  };
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

/* ── Tabs ─────────────────────────────────────────────────── */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto overflow-y-hidden">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "px-3.5 py-2 text-sm -mb-px border-b-2 whitespace-nowrap transition-colors",
            active === t.key ? "border-brand text-fg" : "border-transparent text-muted hover:text-fg",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── Skeleton & EmptyState ────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function EmptyState({
  icon = "✨",
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-12 w-12 grid place-items-center rounded-2xl bg-surface-2 text-2xl mb-4">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
