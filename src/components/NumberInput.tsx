"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui";

/**
 * A numeric text input that edits cleanly: it lets the field go empty while
 * typing, strips leading zeros (no more "030"), and only clamps to [min, max]
 * on blur (falling back to `fallback` when left empty). Commits the parsed
 * number to `onChange` on blur.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  fallback,
  disabled,
  className,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  fallback?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [text, setText] = useState(String(value));

  // Re-sync only when the external value genuinely changes (e.g. data load) so
  // in-progress typing is never clobbered.
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = () => {
    const fb = fallback ?? min;
    let n = text.trim() === "" ? fb : Number(text);
    if (!Number.isFinite(n)) n = fb;
    n = Math.max(min, max != null ? Math.min(max, n) : n);
    setText(String(n));
    if (n !== value) onChange(n);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={text}
      disabled={disabled}
      className={className}
      onChange={(e) => {
        // Digits only; drop leading zeros but keep a lone "0" / empty transiently.
        setText(e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, ""));
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
