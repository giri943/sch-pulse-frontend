"use client";

import { useState } from "react";
import type { Monitor } from "@/lib/types";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { WAF_LABEL, isWafInterference, wafFixSteps } from "@/lib/waf";

/** Compact badge shown on cards when a firewall is gating our checks. */
export function WafBadge({ monitor: m }: { monitor: Monitor }) {
  if (!isWafInterference(m.lastClassification) || !m.waf) return null;
  return (
    <Badge tone="degraded">
      <Icon name="shield" width={11} height={11} className="mr-1" />
      Protected
    </Badge>
  );
}

/**
 * Full explanatory panel for the monitor detail page: the site is up, a WAF is
 * interfering with our checks, and here's how to let us through.
 */
export function WafNotice({ monitor: m }: { monitor: Monitor }) {
  const [open, setOpen] = useState(false);
  if (!isWafInterference(m.lastClassification) || !m.waf) return null;

  const label = WAF_LABEL[m.waf];
  const challenged = m.lastClassification === "up_challenged";

  return (
    <div className="rounded-xl border border-degraded/40 bg-degraded/10 p-4">
      <div className="flex items-start gap-3">
        <Icon name="shield" width={18} height={18} className="mt-0.5 shrink-0 text-degraded" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-fg">
            {label} {challenged ? "is challenging" : "is blocking"} our checks — the site itself is up
          </div>
          <p className="mt-1 text-sm text-muted">
            We {challenged ? "had to solve a firewall challenge to reach" : "were turned away by the firewall in front of"}{" "}
            this site. We&apos;re treating it as <span className="font-medium text-up">operational</span> (a firewall can only
            block you if the origin is alive), so this won&apos;t raise a false &quot;down&quot; alert. For the most reliable
            monitoring, allow our checks through:
          </p>
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            {open ? "Hide" : "How to allow our checks"}
            <Icon name="chevron" width={13} height={13} className={cn("transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted">
              {wafFixSteps(m.waf).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
              <li>
                Send a recognizable header from your side and allow it in the firewall:{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">X-Monitor-Token: &lt;your-secret&gt;</code> — then
                add that header to this monitor under Edit → custom headers.
              </li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
