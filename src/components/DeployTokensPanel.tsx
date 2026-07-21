"use client";

import { useState } from "react";
import { useDeployTokens } from "@/lib/hooks";
import { useCreateDeployToken, useRevokeDeployToken } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { Card, CardTitle, Button, Input, Field, Skeleton } from "@/components/ui";
import { formatDate } from "@/lib/dates";

/**
 * Per-project deploy tokens. CI/CD sends one to silence alerts during a deploy:
 *   curl -X POST $PULSE/api/v1/maintenance/deploy -H "X-Deploy-Token: <token>"
 * The plaintext token is shown once at creation. Owners only.
 */
export function DeployTokensPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { data: tokens, isLoading } = useDeployTokens(projectId, canManage);
  const create = useCreateDeployToken(projectId);
  const revoke = useRevokeDeployToken(projectId);
  const toast = useToast();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null); // just-created plaintext token

  if (!canManage) return null;

  function mint() {
    create.mutate(
      { name: name.trim() || undefined },
      {
        onSuccess: (res) => {
          setFresh(res.token);
          setName("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't create token"),
      },
    );
  }

  return (
    <Card>
      <CardTitle>Deploy tokens</CardTitle>
      <p className="-mt-1 mb-4 text-sm text-muted">
        Let your CI/CD pipeline auto-silence this project during a deploy. Call{" "}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">POST /api/v1/maintenance/deploy</code> with the{" "}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">X-Deploy-Token</code> header before deploying, and{" "}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">/maintenance/deploy/end</code> after.
      </p>

      {fresh && (
        <div className="mb-4 rounded-lg border border-brand/40 bg-brand/[0.06] p-3">
          <div className="text-sm font-medium">Copy your token now — it won&apos;t be shown again.</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-bg px-2 py-1.5 text-[12px]">{fresh}</code>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                void navigator.clipboard?.writeText(fresh);
                toast.success("Copied");
              }}
            >
              Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFresh(null)}>Done</Button>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-end gap-2">
        <div className="flex-1">
          <Field label="New token label (optional)">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="GitHub Actions" />
          </Field>
        </div>
        <Button onClick={mint} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create token"}</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16" />
      ) : !tokens?.length ? (
        <p className="text-sm text-muted">No deploy tokens yet.</p>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.name || "Untitled token"}</div>
                <div className="text-[11px] text-muted">
                  <code>{t.prefix}</code> · created {formatDate(t.createdAt)} · {t.lastUsedAt ? `last used ${formatDate(t.lastUsedAt)}` : "never used"}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Revoke this token? Any pipeline using it will stop working.")) revoke.mutate(t.id, { onSuccess: () => toast.success("Token revoked") });
                }}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
