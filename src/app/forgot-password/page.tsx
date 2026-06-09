"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }).catch(() => {});
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="text-lg font-semibold">Reset your password</div>
        {sent ? (
          <p className="text-sm text-muted">If that email exists, a reset link has been sent.</p>
        ) : (
          <>
            <input
              type="email"
              placeholder="you@schbang.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium">
              Send reset link
            </button>
          </>
        )}
        <a href="/login" className="block text-center text-xs text-muted hover:text-fg">
          Back to login
        </a>
      </form>
    </div>
  );
}
