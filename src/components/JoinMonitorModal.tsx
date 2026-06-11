"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal, StatusDot } from "@/components/ui";
import { useDiscoverMonitors } from "@/lib/hooks";
import { useJoinMonitor } from "@/lib/mutations";

/** Search all monitors org-wide and join one you're not a member of yet. */
export function JoinMonitorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState(""); // debounced query
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useDiscoverMonitors(dq, open);
  const join = useJoinMonitor();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doJoin(id: string) {
    setError(null);
    setJoiningId(id);
    try {
      await join.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join monitor");
    } finally {
      setJoiningId(null);
    }
  }

  const results = data?.data ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Join a monitor">
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Search every monitor in the workspace. Join one to add it to your dashboard and receive its alerts.
        </p>
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or URL…" />
        {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
        <div className="max-h-[55vh] space-y-2 overflow-auto pr-1">
          {isLoading && <p className="px-1 text-sm text-muted">Searching…</p>}
          {!isLoading && results.length === 0 && (
            <p className="px-1 text-sm text-muted">{dq ? "No monitors match your search." : "No monitors yet."}</p>
          )}
          {results.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5"
            >
              <StatusDot status={m.status} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-fg">{m.name}</div>
                <div className="truncate text-xs text-muted">{m.url}</div>
              </div>
              <span className="whitespace-nowrap text-xs text-muted">
                {m.memberCount} member{m.memberCount === 1 ? "" : "s"}
              </span>
              {m.alreadyMember ? (
                <span className="whitespace-nowrap text-xs font-medium text-up">✓ Joined</span>
              ) : (
                <Button type="button" variant="ghost" onClick={() => void doJoin(m.id)} disabled={joiningId === m.id}>
                  {joiningId === m.id ? "Joining…" : "Join"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
