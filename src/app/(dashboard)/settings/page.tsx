"use client";

import { useState } from "react";
import { useMe, can, PERM } from "@/lib/permissions";
import { PageHeader, Card, CardTitle, Tabs, Badge } from "@/components/ui";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { RolesPanel } from "@/components/admin/RolesPanel";
import { ChannelsPanel } from "@/components/admin/ChannelsPanel";

export default function SettingsPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState("account");

  const tabs = [
    { key: "account", label: "Account" },
    ...(can(me, PERM.USER_READ) ? [{ key: "users", label: "Users" }] : []),
    ...(can(me, PERM.ROLE_READ) ? [{ key: "roles", label: "Roles" }] : []),
    ...(can(me, PERM.CHANNEL_MANAGE) ? [{ key: "channels", label: "Channels" }] : []),
  ];

  return (
    <div className="space-y-6 mx-auto w-full max-w-[1200px]">
      <PageHeader title="Settings" subtitle="Your account, team members, and access control." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "account" && <AccountPanel />}
      {tab === "users" && can(me, PERM.USER_READ) && <UsersPanel />}
      {tab === "roles" && can(me, PERM.ROLE_READ) && <RolesPanel />}
      {tab === "channels" && can(me, PERM.CHANNEL_MANAGE) && <ChannelsPanel />}
    </div>
  );
}

function AccountPanel() {
  const { data } = useMe();
  return (
    <Card>
      <CardTitle>Your account</CardTitle>
      {data ? (
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Row label="Name" value={data.name} />
          <Row label="Email" value={data.email} />
          <Row label="Role" value={<Badge tone="brand">{data.role.name}</Badge>} />
          <Row label="Permissions" value={`${data.permissions.length} granted`} />
        </div>
      ) : (
        <p className="text-muted text-sm">Loading…</p>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5 bg-bg">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
