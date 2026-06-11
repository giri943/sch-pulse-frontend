"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch, getAccessToken, setAccessToken } from "@/lib/api-client";
import { SchbangLogo } from "@/components/SchbangLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/icons";
import { useMe } from "@/lib/permissions";
import { cn } from "@/lib/cn";

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const { data: me } = useMe();
  const [monOpen, setMonOpen] = useState(true);

  const isMonitors = pathname.startsWith("/monitors");
  const link = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
      active ? "bg-brand/15 text-fg font-medium" : "text-muted hover:text-fg hover:bg-surface-2",
    );

  const sub = (active: boolean) =>
    cn(
      "flex items-center gap-2 pl-10 pr-3 py-1.5 rounded-lg text-sm transition-colors",
      active ? "text-fg font-medium" : "text-muted hover:text-fg hover:bg-surface-2",
    );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      <Link href="/" onClick={onNavigate} className={link(pathname === "/")}>
        <Icon name="dashboard" /> Dashboard
      </Link>

      <div>
        <button
          onClick={() => setMonOpen((v) => !v)}
          className={cn(link(isMonitors && !type), "w-full justify-between")}
        >
          <span className="flex items-center gap-2.5">
            <Icon name="activity" /> Monitoring
          </span>
          <Icon name="chevron" width={14} height={14} className={cn("transition-transform", monOpen ? "" : "-rotate-90")} />
        </button>
        {monOpen && (
          <div className="mt-1 space-y-0.5">
            <Link href="/monitors" onClick={onNavigate} className={sub(isMonitors && !type)}>
              All monitors
            </Link>
            <Link href="/monitors?type=website" onClick={onNavigate} className={sub(type === "website")}>
              <Icon name="globe" width={14} height={14} /> Websites
            </Link>
            <Link href="/monitors?type=api" onClick={onNavigate} className={sub(type === "api")}>
              <Icon name="braces" width={14} height={14} /> APIs
            </Link>
            <Link href="/monitors?type=ssl" onClick={onNavigate} className={sub(type === "ssl")}>
              <Icon name="shield" width={14} height={14} /> SSL
            </Link>
          </div>
        )}
      </div>

      <Link href="/incidents" onClick={onNavigate} className={link(pathname.startsWith("/incidents"))}>
        <Icon name="alert" /> Incidents
      </Link>
      <Link href="/settings" onClick={onNavigate} className={link(pathname.startsWith("/settings"))}>
        <Icon name="gear" /> Settings
      </Link>

      {me && (
        <div className="pt-2 text-[11px] text-muted px-3">
          {me.role.name} · {me.permissions.includes("*") ? "full access" : `${me.permissions.length} perms`}
        </div>
      )}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) router.replace("/login");
    else setReady(true);
  }, [router]);

  // Don't render the dashboard until auth is confirmed — avoids the flash-then-redirect.
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg">
        <SchbangLogo fontSize={24} />
      </div>
    );
  }

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setAccessToken(null);
    router.replace("/login");
  }

  const footer = (
    <div className="border-t border-border pt-3 mt-3">
      <div className="flex items-center gap-2 px-1">
        <div className="h-8 w-8 grid place-items-center rounded-full bg-brand/20 text-brand text-xs font-semibold shrink-0">
          {(me?.name ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm truncate">{me?.name ?? "…"}</div>
          <div className="text-[11px] text-muted truncate">{me?.email}</div>
        </div>
        <ThemeToggle />
      </div>
      <button onClick={logout} className="mt-2 w-full text-left px-3 py-2 text-sm text-muted hover:text-fg rounded-lg hover:bg-surface-2">
        ↪ Sign out
      </button>
    </div>
  );

  const sidebarInner = (onNavigate?: () => void) => (
    <>
      <div className="px-2 py-3">
        <SchbangLogo fontSize={20} />
      </div>
      <Suspense fallback={<div className="flex-1" />}>
        <NavContent onNavigate={onNavigate} />
      </Suspense>
      {footer}
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-surface p-4 flex-col sticky top-0 h-screen">
        {sidebarInner()}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-surface border-r border-border p-4 flex flex-col animate-fade-in">
            {sidebarInner(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between border-b border-border bg-surface px-4 h-14 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-muted hover:text-fg p-2 -ml-2" aria-label="Menu">
            ☰
          </button>
          <SchbangLogo fontSize={18} />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1800px] 3xl:max-w-[2100px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
