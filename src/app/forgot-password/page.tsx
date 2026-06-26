"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button, Field, Input } from "@/components/ui";
import { isSchbangEmail, EMAIL_DOMAIN_ERROR } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSchbangEmail(email)) {
      setError(EMAIL_DOMAIN_ERROR);
      return;
    }
    setError(null);
    await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }).catch(() => {});
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-surface border border-border rounded-xl p-6 space-y-4">
        <div>
          <div className="text-lg font-semibold">Forgot your password?</div>
          <p className="mt-1 text-sm text-muted">
            Enter your email and we&apos;ll send you a link to choose a new one.
          </p>
        </div>
        {sent ? (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
            If that email exists, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <>
            <Field label="Email" error={error ?? undefined}>
              <Input
                type="email"
                placeholder="you@schbang.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoFocus
              />
            </Field>
            <Button type="submit" className="w-full">Send reset link</Button>
          </>
        )}
        <a href="/login" className="block text-center text-xs text-muted hover:text-fg">
          Back to login
        </a>
      </form>
    </div>
  );
}
