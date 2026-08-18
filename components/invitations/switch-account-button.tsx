"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/**
 * Signs the current user out and returns to the same invitation, so the
 * wrong-account case is a one-click fix rather than "go find the sign-out
 * button yourself". The invited address rides along so the sign-in page can
 * name it.
 */
export function SwitchAccountButton({ callbackURL, invitedEmail }: { callbackURL: string; invitedEmail: string }) {
  const [pending, setPending] = useState(false);

  async function switchAccount() {
    setPending(true);
    const params = new URLSearchParams({ callbackURL, invited: invitedEmail });
    await authClient.signOut();
    // Full navigation, not router.push — the session cookie just changed and
    // every server component on the way needs to re-read it.
    window.location.href = `/sign-in?${params.toString()}`;
  }

  return (
    <Button size="lg" disabled={pending} onClick={switchAccount} className="w-full justify-center gap-2">
      {pending && <Loader2 className="size-4 animate-spin" />}
      Sign in as {invitedEmail}
    </Button>
  );
}
