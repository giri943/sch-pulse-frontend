"use client";

import { PageHeader } from "@/components/ui";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { UptimeOverview } from "@/components/dashboard/UptimeOverview";
import { StatusGrid } from "@/components/dashboard/StatusGrid";
import { RecentIncidents } from "@/components/dashboard/RecentIncidents";
import { SslExpiry } from "@/components/dashboard/SslExpiry";
import { useMe } from "@/lib/permissions";

export default function OverviewPage() {
  const { data: me } = useMe();
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        title="Overview"
        subtitle={me ? `Welcome back, ${me.name.split(" ")[0]} — here's what's happening.` : "Health across your monitors."}
      />
      <KpiGrid />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UptimeOverview />
        </div>
        <SslExpiry />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusGrid />
        <RecentIncidents />
      </div>
    </div>
  );
}
