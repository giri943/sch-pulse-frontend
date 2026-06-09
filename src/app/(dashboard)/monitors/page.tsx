"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useDeleteMonitor, useMonitorAction } from "@/lib/mutations";
import type { Monitor, Paginated } from "@/lib/types";
import { Button, Card, StatusBadge } from "@/components/ui";
import { MonitorFormModal } from "@/components/MonitorFormModal";

export default function MonitorsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Monitor | null>(null);
  const action = useMonitorAction();
  const del = useDeleteMonitor();
  const { data, isLoading } = useQuery({
    queryKey: ["monitors"],
    queryFn: () => apiFetch<Paginated<Monitor>>("/monitors?limit=100"),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Monitors</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          + New Monitor
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : !data?.data.length ? (
          <p className="text-muted text-sm">No monitors yet. Add one to start monitoring.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted text-left">
              <tr>
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>URL</th>
                <th>Latency</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((m) => (
                <tr key={m._id} className="border-t border-border">
                  <td className="py-2.5">
                    <Link href={`/monitors/${m._id}`} className="hover:text-brand">
                      {m.name}
                    </Link>
                  </td>
                  <td className="text-muted">{m.type}</td>
                  <td className="text-muted truncate max-w-[200px]">{m.url}</td>
                  <td className="text-muted">{m.lastResponseTimeMs != null ? `${m.lastResponseTimeMs}ms` : "—"}</td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" onClick={() => action.mutate({ id: m._id, action: "run" })}>
                        Run
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => action.mutate({ id: m._id, action: m.enabled ? "pause" : "resume" })}
                      >
                        {m.enabled ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing(m);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Delete monitor "${m.name}"?`)) del.mutate(m._id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <MonitorFormModal key={editing?._id ?? "new"} open={open} onClose={() => setOpen(false)} monitor={editing} />
    </div>
  );
}
