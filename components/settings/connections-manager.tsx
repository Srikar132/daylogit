"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Plug, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revokeConnectionAction } from "@/lib/actions/connections";

type Connection = { clientId: string; name: string; icon: string | null; createdAt: Date };

export function ConnectionsManager({ initialConnections }: { initialConnections: Connection[] }) {
  const [connections, setConnections] = useState(initialConnections);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevoke(clientId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("clientId", clientId);
      const { error: revokeError } = await revokeConnectionAction({}, fd);
      if (revokeError) {
        setError(revokeError);
        return;
      }
      setConnections((prev) => prev.filter((c) => c.clientId !== clientId));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {connections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No apps connected yet.</p>
      ) : (
        connections.map((connection) => (
          <div
            key={connection.clientId}
            className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <Plug className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{connection.name}</span>
                <span className="text-xs text-muted-foreground">
                  Connected {new Date(connection.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={() => handleRevoke(connection.clientId)}
              disabled={isPending}
              title="Disconnect"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
