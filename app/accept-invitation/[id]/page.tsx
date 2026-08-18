import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, MailQuestion } from "lucide-react";
import { auth } from "@/lib/better-auth";
import { accessLevelLabel } from "@/lib/emails/invitation";
import { loadInvitation, resolveInvitationState } from "@/lib/invitations";
import { InvitationDecision } from "@/components/invitations/invitation-decision";
import { SwitchAccountButton } from "@/components/invitations/switch-account-button";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 shadow-lg">
            <Image src="/logo.png" alt="Helm" width={56} height={56} className="h-full w-full object-contain" priority />
          </div>
        </div>
        <div className="flex flex-col text-center">{children}</div>
      </div>
    </main>
  );
}

function Outcome({
  icon,
  title,
  detail,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <Shell>
      <div className="mb-3 flex justify-center">{icon}</div>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      {children ?? (
        <Link
          href="/workspaces"
          className="mt-6 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          Go to your workspaces
        </Link>
      )}
    </Shell>
  );
}

export default async function AcceptInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invitePath = `/accept-invitation/${id}`;
  const reqHeaders = await headers();

  const [session, invitation] = await Promise.all([
    auth.api.getSession({ headers: reqHeaders }),
    loadInvitation(id),
  ]);

  // Straight from the inbox there's usually no session. Sign-in carries the
  // invite path back here rather than dropping the user on /workspaces, and
  // `invited` lets that page name the address the invite was sent to — Google
  // and GitHub both create the account on first sign-in, so "has an account"
  // and "doesn't" are the same flow from here.
  if (!session) {
    const params = new URLSearchParams({ callbackURL: invitePath });
    if (invitation) params.set("invited", invitation.email);
    redirect(`/sign-in?${params.toString()}`);
  }

  const state = resolveInvitationState(invitation, session.user.email, new Date());

  if (state === "not-found") {
    return (
      <Outcome
        icon={<AlertCircle className="size-6 text-destructive" />}
        title="This invitation doesn't exist"
        detail="The link may be incomplete, or the invitation was deleted. Ask whoever invited you to send a new one."
      />
    );
  }

  if (state === "wrong-account") {
    return (
      <Outcome
        icon={<MailQuestion className="size-6 text-amber-400" />}
        title="Signed in as the wrong account"
        detail={`This invitation was sent to ${invitation!.email}, but you're signed in as ${session.user.email}. Switch accounts to accept it.`}
      >
        <div className="mt-6 flex flex-col gap-2.5">
          <SwitchAccountButton callbackURL={invitePath} invitedEmail={invitation!.email} />
          <Link
            href="/workspaces"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            Stay signed in as {session.user.email}
          </Link>
        </div>
      </Outcome>
    );
  }

  if (state === "accepted") {
    return (
      <Outcome
        icon={<CheckCircle2 className="size-6 text-emerald-400" />}
        title="You've already joined"
        detail={`${invitation!.organizationName} is already in your workspaces.`}
      >
        <Link
          href={invitation!.organizationSlug ? `/workspace/${invitation!.organizationSlug}` : "/workspaces"}
          className="mt-6 rounded-lg bg-[#1b6ef3] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Open {invitation!.organizationName}
        </Link>
      </Outcome>
    );
  }

  if (state === "expired") {
    return (
      <Outcome
        icon={<AlertCircle className="size-6 text-destructive" />}
        title="This invitation expired"
        detail={`Invitations to ${invitation!.organizationName} are only valid for a limited time. Ask ${invitation!.inviterLabel} to send a new one.`}
      />
    );
  }

  if (state === "closed") {
    return (
      <Outcome
        icon={<AlertCircle className="size-6 text-destructive" />}
        title="This invitation is no longer open"
        detail="It was cancelled or already declined. Ask whoever invited you to send a new one."
      />
    );
  }

  return (
    <Shell>
      <h1 className="text-lg font-semibold text-foreground">Join {invitation!.organizationName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {invitation!.inviterLabel} invited you as{" "}
        <span className="font-medium text-foreground">{accessLevelLabel(invitation!.role)}</span>. Accepting adds this
        workspace to your list and opens it.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Signed in as {session.user.email}</p>
      <InvitationDecision invitationId={id} />
    </Shell>
  );
}
