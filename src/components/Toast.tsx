"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
  success: (m: string) => void;
  error: (m: string) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {}, success: () => {}, error: () => {} });
let counter = 0;

const STYLES: Record<ToastKind, string> = {
  success: "border-up/40 text-up",
  error: "border-down/40 text-down",
  info: "border-info/40 text-info",
};
const ICON: Record<ToastKind, string> = { success: "✓", error: "✕", info: "ⓘ" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const value: ToastCtx = {
    toast,
    success: (m) => toast(m, "success"),
    error: (m) => toast(m, "error"),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in flex items-start gap-2 rounded-xl border bg-surface shadow-pop px-3.5 py-3 text-sm ${STYLES[t.kind]}`}
          >
            <span className="font-bold leading-5">{ICON[t.kind]}</span>
            <span className="text-fg flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
