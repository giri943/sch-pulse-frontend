"use client";

import { useEffect, useState } from "react";
import { useDiscoverProjects, useMyJoinRequests } from "@/lib/hooks";
import { useRequestJoin, useCancelJoinRequest } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Button, Input, Modal } from "@/components/ui";

/** Find projects you're not in and request access; also manage your pending requests. */
export function BrowseProjectsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: projects, isFetching } = useDiscoverProjects(dq, open);
  const { data: mine } = useMyJoinRequests();
  const request = useRequestJoin();
  const cancel = useCancelJoinRequest();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function doRequest(id: string) {
    setPendingId(id);
    try {
      await request.mutateAsync({ id });
      toast.success("Access requested — the project owner has been notified");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Find a project to join">
      <div className="space-y-4">
        {(mine?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="mb-2 text-xs font-medium text-muted">Your pending requests</div>
            <ul className="space-y-1.5">
              {mine!.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.project?.name ?? "—"}</span>
                  <button onClick={() => cancel.mutate(r.id, { onSuccess: () => toast.success("Request cancelled") })} className="text-xs text-muted hover:text-down">
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" />

        <div className="max-h-[50vh] space-y-2 overflow-auto pr-1">
          {isFetching && !projects?.length && <p className="px-1 text-sm text-muted">Searching…</p>}
          {!isFetching && !projects?.length && (
            <p className="px-1 text-sm text-muted">{dq ? "No projects found." : "No projects available to join."}</p>
          )}
          {projects?.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-fg">📁 {p.name}</div>
                {p.description && <div className="truncate text-xs text-muted">{p.description}</div>}
              </div>
              {p.requested ? (
                <span className="whitespace-nowrap text-xs font-medium text-up">✓ Requested</span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => void doRequest(p.id)} disabled={pendingId === p.id}>
                  {pendingId === p.id ? "Requesting…" : "Request access"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
