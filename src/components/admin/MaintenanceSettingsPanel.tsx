"use client";

import { useEffect, useState } from "react";
import { useMaintenancePolicy } from "@/lib/hooks";
import { useUpdateMaintenancePolicy } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Button, Card, CardTitle, Field, Skeleton } from "@/components/ui";
import { DurationInput } from "@/components/DurationInput";

/** Super-admin: the default duration pre-filled when scheduling maintenance. */
export function MaintenanceSettingsPanel() {
  const { data, isLoading } = useMaintenancePolicy();
  const update = useUpdateMaintenancePolicy();
  const toast = useToast();
  const [mins, setMins] = useState(60);

  useEffect(() => {
    if (data) setMins(data.defaultDurationMinutes);
  }, [data]);

  if (isLoading) return <Card><Skeleton className="h-32" /></Card>;

  return (
    <Card>
      <CardTitle>Maintenance defaults</CardTitle>
      <p className="-mt-1 mb-4 text-sm text-muted">The default window length pre-filled when someone schedules maintenance.</p>
      <div className="max-w-xs space-y-4">
        <Field label="Default duration">
          <DurationInput minutes={mins} onChange={setMins} min={5} />
        </Field>
        <div className="flex justify-end">
          <Button
            onClick={() =>
              update.mutate(
                { defaultDurationMinutes: mins },
                { onSuccess: () => toast.success("Saved"), onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save") },
              )
            }
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
