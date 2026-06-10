"use client";

import { useState } from "react";
import { useCreateMonitor, useUpdateMonitor, type MonitorBody } from "@/lib/mutations";
import type { Monitor, UserLite } from "@/lib/types";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { UserPicker } from "@/components/UserPicker";

/** Normalize a monitor's members (ids or populated objects) to UserLite[]. */
function toUserLites(members: Monitor["members"]): UserLite[] {
  if (!members) return [];
  return members
    .filter((m): m is UserLite => typeof m === "object" && m !== null)
    .map((m) => ({ id: m.id, name: m.name, email: m.email, avatarUrl: m.avatarUrl }));
}

/** Create/edit a monitor. `monitor=null` → create. Pass a fresh `key` to reset state. */
export function MonitorFormModal({
  open,
  onClose,
  monitor,
}: {
  open: boolean;
  onClose: () => void;
  monitor: Monitor | null;
}) {
  const create = useCreateMonitor();
  const update = useUpdateMonitor();

  const [name, setName] = useState(monitor?.name ?? "");
  const [type, setType] = useState<Monitor["type"]>(monitor?.type ?? "website");
  const [url, setUrl] = useState(monitor?.url ?? "");
  const [method, setMethod] = useState(monitor?.method ?? "GET");
  const [intervalSec, setIntervalSec] = useState(monitor?.intervalSec ?? 60);
  const [expectedStatusCode, setExpectedStatusCode] = useState(monitor?.expectedStatusCode ?? 200);
  const [members, setMembers] = useState<UserLite[]>(toUserLites(monitor?.members));
  const [extraEmails, setExtraEmails] = useState((monitor?.extraAlertEmails ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body: MonitorBody = {
      name,
      type,
      url,
      method,
      intervalSec,
      expectedStatusCode,
      members: members.map((m) => m.id),
      extraAlertEmails: extraEmails.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (monitor) await update.mutateAsync({ id: monitor._id, body });
      else await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save monitor");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={monitor ? "Edit Monitor" : "New Monitor"}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="bg-down/15 text-down text-sm rounded-lg px-3 py-2">{error}</div>}
        <Field label="Monitor name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Britannia Website" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as Monitor["type"])}>
              <option value="website">Website</option>
              <option value="api">API</option>
              <option value="ssl">SSL</option>
            </Select>
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)} disabled={type === "ssl"}>
              {["GET", "POST", "HEAD", "PUT"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="URL">
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://britannia.co.in" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Interval">
            <Select value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value))}>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
              <option value={1800}>30 minutes</option>
            </Select>
          </Field>
          <Field label="Expected status">
            <Input
              type="number"
              value={expectedStatusCode}
              onChange={(e) => setExpectedStatusCode(Number(e.target.value))}
              disabled={type === "ssl"}
            />
          </Field>
        </div>
        <Field label="Tag users (visibility + alerts)">
          <UserPicker value={members} onChange={setMembers} />
        </Field>
        <Field label="Extra alert emails (non-users, comma-separated)">
          <Input value={extraEmails} onChange={(e) => setExtraEmails(e.target.value)} placeholder="client@brand.com" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : monitor ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
