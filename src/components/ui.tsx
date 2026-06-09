import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-border rounded-xl p-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-medium text-muted mb-3">{children}</h3>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles: Record<string, string> = {
    primary: "bg-brand hover:bg-brand/90 text-white",
    ghost: "bg-transparent border border-border text-muted hover:text-fg hover:bg-bg",
    danger: "bg-down/15 text-down hover:bg-down/25",
  };
  return (
    <button
      {...props}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const fieldBase =
  "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface border border-border rounded-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-fg text-lg leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  operational: "bg-up/15 text-up",
  degraded: "bg-degraded/15 text-degraded",
  down: "bg-down/15 text-down",
  paused: "bg-muted/15 text-muted",
  unknown: "bg-muted/15 text-muted",
  active: "bg-up/15 text-up",
  archived: "bg-muted/15 text-muted",
  open: "bg-down/15 text-down",
  resolved: "bg-up/15 text-up",
};
const DOT: Record<string, string> = {
  operational: "🟢",
  degraded: "🟡",
  down: "🔴",
  paused: "⚪",
  unknown: "⚪",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.unknown
      }`}
    >
      {DOT[status] ? <span>{DOT[status]}</span> : null}
      {status}
    </span>
  );
}
