"use client";

import { StatCards } from "@/components/dashboard/StatCards";
import { UptimeOverview } from "@/components/dashboard/UptimeOverview";
import { StatusBoard } from "@/components/dashboard/StatusBoard";
import { RecentIncidents } from "@/components/dashboard/RecentIncidents";
import { SslExpiry } from "@/components/dashboard/SslExpiry";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Overview</h1>
      <StatCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UptimeOverview />
        </div>
        <SslExpiry />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusBoard />
        <RecentIncidents />
      </div>
    </div>
  );
}
