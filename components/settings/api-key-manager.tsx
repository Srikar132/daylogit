"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions/api-key";
import type { ApiKeyRow } from "@/lib/api-keys";

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name.trim() || "Default key");
      const { rawKey, error: createError } = await createApiKeyAction(fd);
      if (createError) {
        setError(createError);
        return;
      }
      setRevealedKey(rawKey ?? null);
      setName("");
    });
  }

  function handleRevoke(keyId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("keyId", keyId);
      const { error: revokeError } = await revokeApiKeyAction(fd);
      if (revokeError) {
        setError(revokeError);
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    });
  }

  async function copyKey() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g. Claude Desktop)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={isPending} className="shrink-0 gap-1.5">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Generate key
          </Button>
        </div>

        {revealedKey && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              Copy this now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-background px-2.5 py-1.5 text-xs">
                {revealedKey}
              </code>
              <Button variant="outline" size="icon-sm" onClick={copyKey} title="Copy">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{key.name}</span>
                <span className="text-xs text-muted-foreground">
                  {key.lastUsedAt
                    ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : "Never used"}
                </span>
              </div>
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={() => handleRevoke(key.id)}
                disabled={isPending}
                title="Revoke"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
