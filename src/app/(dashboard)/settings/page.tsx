"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardTitle } from "@/components/ui";

interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => apiFetch<Me>("/auth/me") });

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
              <span className="text-muted">Role:</span> {data.role}
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">Loading…</p>
        )}
      </Card>
      <Card>
        <CardTitle>Admin</CardTitle>
        <p className="text-muted text-sm">
          User management and recommendation rules are admin-only (API: <code>/users</code>,{" "}
          <code>/recommendation-rules</code>). Dedicated screens are on the roadmap.
        </p>
      </Card>
    </div>
  );
}
