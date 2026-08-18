"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The invitation link, copyable straight from the pending list.
 *
 * Worth having regardless of mail delivery: it works when SMTP isn't
 * configured, when the email lands in spam, and when someone would simply
 * rather paste the link into a chat. The URL is built client-side from the
 * current origin so it matches whatever host the user is actually on
 * (localhost, a preview deployment, production) instead of a baked-in one.
 */
export function CopyInviteLinkButton({ invitationId }: { invitationId: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const url = `${window.location.origin}/accept-invitation/${invitationId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be denied (insecure context, permissions) — a
      // prompt still lets the user copy by hand rather than silently failing.
      window.prompt("Copy this invitation link:", url);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      title={copied ? "Link copied" : "Copy invite link"}
      className="rounded-full"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
