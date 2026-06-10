"use client";

import { useMe } from "@/lib/permissions";
import { Card, CardTitle } from "@/components/ui";

export default function SettingsPage() {
  const { data } = useMe();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card>
        <CardTitle>Your account</CardTitle>
        {data ? (
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted">Name:</span> {data.name}
            </div>
            <div>
              <span className="text-muted">Email:</span> {data.email}
            </div>
            <div>
              <span className="text-muted">Role:</span> {data.role.name}
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">Loading…</p>
        )}
      </Card>
      <Card>
        <CardTitle>Access</CardTitle>
        <p className="text-muted text-sm">
          Your role grants {data?.permissions.length ?? 0} permission(s). Role management
          (custom roles &amp; permissions) is on the roadmap (Phase 2). Super admins manage
          users from the <b>Users</b> section.
        </p>
      </Card>
    </div>
  );
}
