"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspaceAction, type WorkspaceActionState } from "@/lib/actions/workspace";

export function CreateWorkspaceForm() {
  const [state, formAction, isPending] = useActionState<WorkspaceActionState, FormData>(
    createWorkspaceAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Workspace name</Label>
        <Input id="name" name="name" placeholder="e.g. Acme Team" autoFocus required />
      </div>
      <Button type="submit" size="lg" disabled={isPending} className="justify-center">
        {isPending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
