"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/providers/theme-provider";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GsiId {
  initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In")));
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(s);
  });
}

/** Renders the Google "Continue with" button; theme follows the app theme. */
export function GoogleSignInButton({
  onToken,
  onError,
}: {
  onToken: (idToken: string) => void;
  onError?: (msg: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => onToken(r.credential),
        });
        // Clear any previously-rendered button before re-rendering (e.g. on theme change).
        ref.current.innerHTML = "";
        window.google.accounts.id.renderButton(ref.current, {
          // GIS only ships light/dark variants — match the app theme so it doesn't show a white box on dark.
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width: 280,
        });
      })
      .catch((e) => onError?.(e instanceof Error ? e.message : "Google Sign-In failed"));
    return () => {
      cancelled = true;
    };
  }, [onToken, onError, theme]);

  if (!CLIENT_ID) {
    return (
      <p className="text-xs text-muted text-center">
        Google sign-in not configured (set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>).
      </p>
    );
  }
  // A subtle rounded frame that matches the surface, so the GIS iframe never looks like a stray white box.
  return <div ref={ref} className="flex justify-center min-h-[44px] [color-scheme:auto]" />;
}
