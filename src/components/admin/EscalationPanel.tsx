"use client";

import { useEffect, useState } from "react";
import { useEscalationPolicy } from "@/lib/hooks";
import { useUpdateEscalationPolicy } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Button, Card, CardTitle, Field, Input, Skeleton } from "@/components/ui";

/**
 * Super-admin escalation policy: if an incident stays open past the threshold,
 * the configured leadership emails get looped in (on top of the normal alertees).
 */
export function EscalationPanel() {
  const { data, isLoading } = useEscalationPolicy();
  const update = useUpdateEscalationPolicy();
  const toast = useToast();

  const [enabled, setEnabled] = useState(false);
  const [afterMinutes, setAfterMinutes] = useState(60);
  const [emails, setEmails] = useState("");

  // Hydrate local state once the policy loads.
  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setAfterMinutes(data.afterMinutes);
    setEmails(data.emails.join(", "));
  }, [data]);

  function save() {
    const list = emails.split(",").map((s) => s.trim()).filter(Boolean);
    update.mutate(
      { enabled, afterMinutes, emails: list },
      {
        onSuccess: () => toast.success("Escalation policy saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save — check the email addresses"),
      },
    );
  }

  if (isLoading) return <Card><Skeleton className="h-40" /></Card>;

  return (
    <Card>
      <CardTitle>Escalation policy</CardTitle>
      <p className="-mt-1 mb-4 text-sm text-muted">
        If an incident stays unresolved past the threshold, these leadership contacts are alerted
        automatically (in addition to the monitor's usual recipients).
      </p>

      <div className="space-y-4">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--brand))]"
          />
          Enable escalation
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Escalate after (minutes)" hint="How long an incident can stay open before leadership is looped in.">
            <Input
              type="number"
              min={1}
              max={1440}
              value={afterMinutes}
              onChange={(e) => setAfterMinutes(Math.min(1440, Math.max(1, Number(e.target.value) || 1)))}
              disabled={!enabled}
            />
          </Field>
        </div>

        <Field label="Leadership emails" hint="Comma-separated. These are notified when an incident is escalated.">
          <Input
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="cto@schbang.com, ops-lead@schbang.com"
            disabled={!enabled}
          />
        </Field>

        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save policy"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
