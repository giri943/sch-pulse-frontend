"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setAccessToken } from "@/lib/api-client";
import { SchbangLogo } from "@/components/SchbangLogo";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setAccessToken(res.accessToken);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle(idToken: string) {
    setError(null);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) });
      setAccessToken(res.accessToken);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* ambient gradient */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[42rem] rounded-full bg-brand/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-up/10 blur-[100px]" />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <SchbangLogo fontSize={36} />
          <p className="text-muted text-sm mt-3">Sign in to your monitoring dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="bg-surface/80 backdrop-blur border border-border rounded-2xl p-6 shadow-pop space-y-4">
          {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@schbang.com" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <a href="/forgot-password" className="block text-center text-xs text-muted hover:text-fg">Forgot password?</a>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton onToken={onGoogle} onError={setError} />
        </form>

        <p className="text-center text-[11px] text-muted mt-6">Schbang Pulse · internal monitoring</p>
      </div>
    </div>
  );
}
