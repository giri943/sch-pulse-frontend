"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl, getAccessToken } from "@/lib/api-client";

// Maps a server event type to the react-query keys to invalidate (prefix match).
const KEY_MAP: Record<string, string[][]> = {
  monitors: [["monitors"], ["monitor"]],
  incidents: [["incidents"], ["incident"]],
  projects: [["projects"]],
  maintenance: [["maintenance"]],
  users: [["users"]],
  me: [["me"]],
  dashboard: [["dashboard"]],
  notifications: [["notifications"]],
};

/**
 * Live updates via SSE (push-to-invalidate): holds one long-lived stream to
 * /events; when the server says a resource changed, the matching queries refetch
 * so the UI updates within ~100ms for everyone. Auto-reconnects with backoff.
 * Polling stays as a fallback if the stream can't be established (proxy buffering).
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    let stopped = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retry = 0;

    async function connect() {
      const token = getAccessToken();
      if (!token) {
        timer = setTimeout(connect, 3000);
        return;
      }
      controller = new AbortController();
      try {
        const res = await fetch(`${apiBaseUrl}/events`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`sse ${res.status}`);
        retry = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const { types } = JSON.parse(dataLine.slice(5).trim()) as { types: string[] };
              const seen = new Set<string>();
              for (const t of types) {
                for (const key of KEY_MAP[t] ?? []) {
                  const sig = JSON.stringify(key);
                  if (seen.has(sig)) continue;
                  seen.add(sig);
                  qc.invalidateQueries({ queryKey: key });
                }
              }
            } catch {
              /* ignore malformed frame */
            }
          }
        }
      } catch {
        /* fall through to reconnect */
      }
      if (!stopped) {
        retry = Math.min(retry + 1, 6);
        timer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry));
      }
    }

    connect();
    return () => {
      stopped = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [qc]);
}
