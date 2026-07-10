"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuthConfig } from "@/lib/hooks";
import { Button, Field } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: authCfg } = useAuthConfig();
  const enabled = authCfg?.passwordLoginEnabled; // undefined while loading
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Password login off (Google-only) → this page doesn't apply; return to login.
  useEffect(() => {
    if (enabled === false) router.replace("/login");
  }, [enabled, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }

  if (enabled !== true) {
    return <div className="text-sm text-muted">Loading…</div>;
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm bg-surface border border-border rounded-xl p-6 space-y-4">
      <div className="text-lg font-semibold">Choose a new password</div>
      {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
      <Field
        label="New password"
        hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
      >
        <PasswordInput placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
      </Field>
      <Button type="submit" className="w-full">Update password</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
