"use client";

import { useEffect, useState } from "react";
import { useRcaReminderPolicy } from "@/lib/hooks";
import { useUpdateRcaReminderPolicy } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Button, Card, CardTitle, Field, Skeleton } from "@/components/ui";
import { DurationInput } from "@/components/DurationInput";

/**
 * Super-admin RCA-reminder policy: when a resolved incident still has no
 * root-cause analysis, owners/members are nudged on a cadence for a limited
 * window. Configurable here (defaults: every 24h, for up to 7 days).
 */
export function RcaReminderPanel() {
  const { data, isLoading } = useRcaReminderPolicy();
  const update = useUpdateRcaReminderPolicy();
  const toast = useToast();

  const [enabled, setEnabled] = useState(true);
  const [everyMinutes, setEveryMinutes] = useState(24 * 60);
  const [windowMinutes, setWindowMinutes] = useState(7 * 24 * 60);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setEveryMinutes(data.everyMinutes);
    setWindowMinutes(data.windowMinutes);
  }, [data]);

  function save() {
    update.mutate(
      { enabled, everyMinutes, windowMinutes },
      {
        onSuccess: () => toast.success("RCA-reminder policy saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
      },
    );
  }

  if (isLoading) return <Card><Skeleton className="h-40" /></Card>;

  return (
    <Card>
      <CardTitle>RCA reminders</CardTitle>
      <p className="-mt-1 mb-4 text-sm text-muted">
        When an incident is resolved but no root-cause analysis has been written, the monitor&apos;s
        owner and tagged members get a reminder — repeated on the cadence below until the RCA is filled
        or the window closes.
      </p>

      <div className="space-y-4">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--brand))]"
          />
          Enable RCA reminders
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Remind every" hint="How often to nudge for the same incident. Default 24 hours. Use minutes to test.">
            <DurationInput min={1} minutes={everyMinutes} onChange={setEveryMinutes} disabled={!enabled} />
          </Field>
          <Field label="Keep reminding for" hint="Stop once the incident resolved longer ago than this. Default 7 days.">
            <DurationInput min={1} minutes={windowMinutes} onChange={setWindowMinutes} disabled={!enabled} />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save policy"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
