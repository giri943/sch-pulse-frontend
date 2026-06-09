"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch, getAccessToken, setAccessToken } from "@/lib/api-client";
import { SchbangLogo } from "@/components/SchbangLogo";

const NAV = [
  { href: "/", label: "Overview", icon: "📊" },
  { href: "/monitors", label: "Monitors", icon: "📡" },
  { href: "/incidents", label: "Incidents", icon: "⚠️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) router.replace("/login");
  }, [router]);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setAccessToken(null);
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r border-border bg-surface p-4 flex flex-col">
        <div className="px-2 py-3">
          <SchbangLogo fontSize={20} />
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  active ? "bg-brand/15 text-fg" : "text-muted hover:text-fg hover:bg-bg"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="px-3 py-2 text-sm text-muted hover:text-fg text-left">
          ↪ Logout
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
