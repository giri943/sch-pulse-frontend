"use client";

import { useEffect, useRef, useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { Select } from "@/components/ui";

const UNITS = [
  { key: "minutes", label: "minutes", factor: 1 },
  { key: "hours", label: "hours", factor: 60 },
  { key: "days", label: "days", factor: 60 * 24 },
] as const;
type UnitKey = (typeof UNITS)[number]["key"];

const factorOf = (u: UnitKey) => UNITS.find((x) => x.key === u)!.factor;

/** Largest unit that divides the value exactly — so 1440 min shows as "1 day". */
function bestUnit(minutes: number): UnitKey {
  if (minutes > 0 && minutes % (60 * 24) === 0) return "days";
  if (minutes > 0 && minutes % 60 === 0) return "hours";
  return "minutes";
}

/**
 * Edit a duration stored in minutes as "<amount> <unit>", where unit is
 * minutes / hours / days. Lets small values (e.g. every 2 minutes) be set for
 * testing and large ones (24 hours) for production, all from the dashboard.
 */
export function DurationInput({
  minutes,
  onChange,
  min = 1,
  disabled,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  min?: number; // minimum, in minutes
  disabled?: boolean;
}) {
  const [unit, setUnit] = useState<UnitKey>(() => bestUnit(minutes));
  const lastEmitted = useRef<number | null>(null);

  // Re-pick the unit only on external changes (e.g. data load), not our own edits.
  useEffect(() => {
    if (minutes !== lastEmitted.current) setUnit(bestUnit(minutes));
  }, [minutes]);

  const factor = factorOf(unit);
  const amount = Math.max(1, Math.round(minutes / factor));

  const emit = (amt: number, f: number) => {
    const m = Math.max(min, amt * f);
    lastEmitted.current = m;
    onChange(m);
  };

  return (
    // Each control is wrapped so its inner `w-full` fills the wrapper — avoids the
    // Input/Select `w-full` fighting flex sizing (which collapsed the number box).
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <NumberInput
          min={1}
          fallback={1}
          value={amount}
          onChange={(a) => emit(a, factor)}
          disabled={disabled}
        />
      </div>
      <div className="w-32 shrink-0">
        <Select
          value={unit}
          disabled={disabled}
          onChange={(e) => {
            const nu = e.target.value as UnitKey;
            setUnit(nu);
            emit(amount, factorOf(nu));
          }}
        >
          {UNITS.map((u) => (
            <option key={u.key} value={u.key}>
              {u.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
