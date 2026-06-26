"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * Password field with a reveal toggle. The icon reflects the CURRENT state —
 * a slashed eye while masked, an open eye while visible — so it reads as
 * "your password is hidden / shown" rather than "click to do X".
 */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", props.className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-fg"
      >
        <Icon name={visible ? "eye" : "eyeOff"} width={17} height={17} />
      </button>
    </div>
  );
}
