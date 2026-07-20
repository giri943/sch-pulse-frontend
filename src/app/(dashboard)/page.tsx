"use client";

import Link from "next/link";
import { SystemStatusHero } from "@/components/dashboard/SystemStatusHero";
import { UptimeOverview } from "@/components/dashboard/UptimeOverview";
import { StatusGrid } from "@/components/dashboard/StatusGrid";
import { RecentIncidents } from "@/components/dashboard/RecentIncidents";
import { Renewals } from "@/components/dashboard/Renewals";
import { useMe } from "@/lib/permissions";
import { useStatusBoard, useProjects } from "@/lib/hooks";
import { Card, EmptyState, Button, Skeleton } from "@/components/ui";

export default function OverviewPage() {
  const { data: me } = useMe();
  const { data: board, isLoading: boardLoading } = useStatusBoard();
  const { data: projects, isLoading: projLoading } = useProjects();

  const isSuper = !!me?.permissions.includes("*");
  const loading = boardLoading || projLoading;
  // Nothing this user can see — a Member not yet part of any project/monitor, or
  // a fresh system for an admin. Scoping is correct; show guidance, not a blank page.
  const empty = !loading && (board?.length ?? 0) === 0 && (projects?.length ?? 0) === 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <Card>
        <EmptyState
          icon="🗂️"
          title={isSuper ? "Nothing to monitor yet" : "You're not part of any project yet"}
          description={
            isSuper
              ? "Create a project and add your first monitor to start tracking uptime, SSL, and domains."
              : "Your dashboard shows the projects and monitors you're part of. Browse projects to request access, or ask a project owner to add you."
          }
          action={
            <Link href="/projects">
              <Button>{isSuper ? "Go to Projects" : "Browse projects"}</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SystemStatusHero />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UptimeOverview />
        </div>
        <Renewals />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <StatusGrid />
        </div>
        <RecentIncidents />
      </div>
    </div>
  );
}
