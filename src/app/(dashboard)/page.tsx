"use client";

import { SystemStatusHero } from "@/components/dashboard/SystemStatusHero";
import { UptimeOverview } from "@/components/dashboard/UptimeOverview";
import { StatusGrid } from "@/components/dashboard/StatusGrid";
import { RecentIncidents } from "@/components/dashboard/RecentIncidents";
import { Renewals } from "@/components/dashboard/Renewals";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <SystemStatusHero />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UptimeOverview />
        </div>
        <Renewals />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusGrid />
        <RecentIncidents />
      </div>
    </div>
  );
}
