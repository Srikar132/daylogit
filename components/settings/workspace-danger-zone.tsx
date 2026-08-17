"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteWorkspaceAction } from "@/lib/actions/organization";
import { unwrapAction } from "@/lib/query-utils";

interface WorkspaceDangerZoneProps {
  /** The name the user must retype. Comes from the server-rendered page, so it
   *  is the real current name — an earlier version compared against a cached
   *  copy and rejected the very name it was displaying. */
  organizationName: string;
  onError: (message: string) => void;
}

/** Deleting a workspace, gated behind retyping its name. Separate from the
 *  member/invite lists because it shares no state with them and is the one
 *  irreversible action on the page. */
export function WorkspaceDangerZone({ organizationName, onError }: WorkspaceDangerZoneProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      // Trimmed to match the check below, so a stray pasted space can't enable
      // the button and then be rejected by the server.
      fd.set("confirmName", confirmText.trim());
      return unwrapAction(deleteWorkspaceAction({}, fd));
    },
    // Full navigation, not router.push — the org this page is scoped to no
    // longer exists, so nothing here should try to re-render.
    onSuccess: () => {
      window.location.href = "/workspaces";
    },
    onError: (err) => onError(err.message),
  });

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-destructive">Danger zone</h3>
      </div>

      {!confirmOpen ? (
        <Button
          type="button"
          variant="destructive"
          size="default"
          onClick={() => setConfirmOpen(true)}
          className="w-fit gap-1.5 px-3 text-[12.5px] font-medium"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete workspace
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-muted-foreground">
            This deletes <span className="font-medium text-foreground">{organizationName}</span> and everything in it.
            Type the name to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={organizationName}
            className="h-9 rounded-lg border border-destructive/30 bg-white/[0.04] px-3 text-[13px] text-foreground outline-none focus:border-destructive/60"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="default"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || confirmText.trim() !== organizationName.trim()}
              className="gap-1.5 px-3 text-[12.5px] font-semibold"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete forever
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmText("");
              }}
              className="px-3 text-[12.5px] text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
