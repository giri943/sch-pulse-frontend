"use client";

import { useTheme } from "@/providers/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`h-9 w-9 grid place-items-center rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
