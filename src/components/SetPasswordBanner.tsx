"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSetPassword } from "@/lib/mutations";
import { apiFetch, setAccessToken } from "@/lib/api-client";
import { Button, Field, Input } from "@/components/ui";
import { SchbangLogo } from "@/components/SchbangLogo";

/**
 * Full-screen blocker shown to Google-signed-in users who haven't set a password.
 * They must set one before they can use the dashboard (or sign out).
 */
export function SetPasswordGate() {
  const router = useRouter();
  const setPassword = useSetPassword();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      await setPassword.mutateAsync(pw); // on success /me refetches → gate unmounts
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    }
  }

  async function signOut() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setAccessToken(null);
    router.replace("/login");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-pop">
        <div className="mb-5 flex flex-col items-center text-center">
          <SchbangLogo fontSize={26} />
          <h2 className="mt-3 text-base font-semibold">Set a password to continue</h2>
          <p className="mt-1 text-sm text-muted">
            You signed in with Google. Set a password so you can also sign in with your email — this is
            required before using the dashboard.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="rounded-lg bg-down/15 px-3 py-2 text-sm text-down">{error}</div>}
          <Field
            label="New password"
            hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
          >
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={setPassword.isPending} className="w-full">
            {setPassword.isPending ? "Saving…" : "Set password & continue"}
          </Button>
        </form>
        <button onClick={signOut} className="mt-4 w-full text-center text-xs text-muted hover:text-fg">
          Sign out instead
        </button>
      </div>
    </div>
  );
}
