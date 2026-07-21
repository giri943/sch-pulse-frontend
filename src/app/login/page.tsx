"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, setAccessToken } from "@/lib/api-client";
import { useAuthConfig } from "@/lib/hooks";
import { isAllowedEmail, emailDomainError } from "@/lib/validation";
import { SchbangLogo } from "@/components/SchbangLogo";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginIntro } from "@/components/LoginIntro";
import { Button, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: authCfg } = useAuthConfig();
  const passwordEnabled = authCfg?.passwordLoginEnabled ?? false; // break-glass only

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Enforce the org domain in prod (nice UX); dev allows any email for testing.
    if (authCfg?.emailDomainEnforced && !isAllowedEmail(email, authCfg.allowedDomain)) {
      setError(emailDomainError(authCfg.allowedDomain));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setAccessToken(res.accessToken);
      queryClient.clear();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const onGoogle = useCallback(
    async (idToken: string) => {
      setError(null);
      try {
        const res = await apiFetch<{ accessToken: string }>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) });
        setAccessToken(res.accessToken);
        queryClient.clear();
        router.replace("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      }
    },
    [router, queryClient],
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <LoginIntro />
      {/* ambient gradient */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[42rem] rounded-full bg-brand/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-up/10 blur-[100px]" />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <SchbangLogo fontSize={38} />
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Welcome to Pulse</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to your monitoring dashboard.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/80 p-7 shadow-pop backdrop-blur">
          {error && <div className="mb-4 rounded-lg bg-down/15 px-3 py-2 text-sm text-down">{error}</div>}

          <div className="flex justify-center">
            <GoogleSignInButton onToken={onGoogle} onError={setError} />
          </div>

          {/* Password login is break-glass only — shown when the backend enables it. */}
          {passwordEnabled ? (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={onSubmit} className="space-y-3">
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@schbang.com" />
                </Field>
                <Field label="Password">
                  <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                </Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <a href="/forgot-password" className="block text-center text-xs text-muted hover:text-fg">Forgot password?</a>
              </form>
            </>
          ) : (
            <p className="mt-5 text-center text-xs text-muted">
              Use your <span className="font-medium text-fg">@schbang.com</span> Google account.
              <br />
              Access is limited to Schbang team members.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted">Schbang Pulse · internal monitoring</p>
      </div>
    </div>
  );
}
