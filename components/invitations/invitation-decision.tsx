"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction, rejectInvitationAction, type InvitationActionState } from "@/lib/actions/invitations";

const INITIAL: InvitationActionState = {};

function SubmitButton({ children, variant }: { children: React.ReactNode; variant?: "outline" }) {
  // useFormStatus reads the enclosing form, so each button knows whether it is
  // the one currently submitting without threading state down by hand.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={variant} disabled={pending} className="w-full justify-center gap-2">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function InvitationDecision({ invitationId }: { invitationId: string }) {
  const [acceptState, accept] = useActionState(acceptInvitationAction, INITIAL);
  const [rejectState, reject] = useActionState(rejectInvitationAction, INITIAL);
  const error = acceptState.error ?? rejectState.error;

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form action={accept}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <SubmitButton>Accept invitation</SubmitButton>
      </form>

      <form action={reject}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <SubmitButton variant="outline">Decline</SubmitButton>
      </form>
    </div>
  );
}
