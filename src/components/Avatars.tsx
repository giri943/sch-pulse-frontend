import { cn } from "@/lib/cn";

type Person = { name?: string; email?: string };

const labelOf = (p: Person) => (p.name || p.email || "?").trim();

/** A single initials avatar (consistent with the app's monogram style). */
export function Avatar({ person, size = 22, className }: { person: Person; size?: number; className?: string }) {
  const label = labelOf(person);
  return (
    <span
      title={label}
      className={cn("grid flex-none place-items-center rounded-full bg-brand/15 font-semibold text-brand", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Overlapping avatars with a "+N" overflow; renders "—" when empty. */
export function AvatarStack({ people, max = 4, size = 22 }: { people: Person[]; max?: number; size?: number }) {
  if (!people.length) return <span className="text-muted">—</span>;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {shown.map((p, i) => (
          <Avatar key={i} person={p} size={size} className="ring-2 ring-surface" />
        ))}
      </div>
      {extra > 0 && <span className="ml-1.5 text-xs text-muted">+{extra}</span>}
    </div>
  );
}
