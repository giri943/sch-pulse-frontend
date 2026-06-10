"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCreateChannel, useDeleteChannel, useTestChannel, type ChannelBody } from "@/lib/mutations";
import { useMe, can, PERM } from "@/lib/permissions";
import { useToast } from "@/components/Toast";
import type { Channel } from "@/lib/types";
import { Card, Button, Field, Input, Modal, EmptyState } from "@/components/ui";

export function ChannelsPanel() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const del = useDeleteChannel();
  const test = useTestChannel();
  const toast = useToast();
  const canManage = can(me, PERM.CHANNEL_MANAGE);
  const { data: channels, isLoading } = useQuery({ queryKey: ["channels"], queryFn: () => apiFetch<Channel[]>("/channels") });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Notification channels</h3>
          <p className="text-xs text-muted">Google Chat spaces that receive down/recovery/expiry alerts. (WhatsApp planned.)</p>
        </div>
        {canManage && <Button onClick={() => setOpen(true)}>+ New Channel</Button>}
      </div>

      {isLoading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : !channels?.length ? (
        <EmptyState icon="💬" title="No channels yet" description="Create a Google Chat incoming webhook in your space, then add it here to alert that group." />
      ) : (
        <ul className="divide-y divide-border">
          {channels.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="text-sm">💬 {c.name}</div>
                <div className="text-[11px] text-muted truncate max-w-md">{c.webhookUrl}</div>
              </div>
              {canManage && (
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="subtle" onClick={() => test.mutate(c.id, { onSuccess: (r) => toast.success(r.message), onError: () => toast.error("Test failed") })}>
                    Test
                  </Button>
                  <button onClick={() => { if (confirm(`Delete channel "${c.name}"?`)) del.mutate(c.id, { onSuccess: () => toast.success("Channel deleted") }); }} className="text-muted hover:text-down text-xs px-2">
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <NewChannelModal open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function NewChannelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateChannel();
  const toast = useToast();
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const body: ChannelBody = { name, type: "google_chat", webhookUrl };
      await create.mutateAsync(body);
      toast.success("Channel added");
      onClose();
      setName("");
      setWebhookUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Google Chat channel">
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Britannia – Ops space" />
        </Field>
        <Field label="Google Chat webhook URL" hint="Space → Manage webhooks → copy the incoming webhook URL.">
          <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} required placeholder="https://chat.googleapis.com/v1/spaces/…" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Adding…" : "Add channel"}</Button>
        </div>
      </form>
    </Modal>
  );
}
