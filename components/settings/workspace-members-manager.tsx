"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, Loader2, Mail, Pencil, Trash2, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyInviteLinkButton } from "@/components/invitations/copy-invite-link-button";
import { InviteEmailField } from "@/components/settings/invite-email-field";
import {
  cancelInvitationAction,
  getWorkspaceMembersData,
  inviteMemberAction,
  listPendingInvitationsAction,
  removeMemberAction,
} from "@/lib/actions/members";
import { deleteWorkspaceAction, renameWorkspaceAction } from "@/lib/actions/organization";
import { ACCESS_LEVELS } from "@/lib/permissions";
import { unwrapAction } from "@/lib/query-utils";
import { workspaceMembersKey } from "@/lib/query-keys";

type WorkspaceMembersData = Awaited<ReturnType<typeof getWorkspaceMembersData>>;
type Member = WorkspaceMembersData["members"][number];
type Invitation = WorkspaceMembersData["invitations"][number];

// Deliberately loose: real address validity is the server's call (and the
// mail server's), this only decides whether the Invite button is worth enabling.
function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function initialOf(name: string, email: string): string {
  return (name.trim()[0] ?? email[0] ?? "?").toUpperCase();
}

interface WorkspaceMembersManagerProps {
  /** Identifies which workspace's cache to invalidate — see workspaceMembersKey. */
  slug: string;
  organizationName: string;
  initialMembers: Member[];
  initialInvitations: Invitation[];
  canManage: boolean;
  canDelete: boolean;
  viewerUserId: string;
}

export function WorkspaceMembersManager({
  slug,
  organizationName,
  initialMembers,
  initialInvitations,
  canManage,
  canDelete,
  viewerUserId,
}: WorkspaceMembersManagerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(organizationName);
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [email, setEmail] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Keyed by workspace (lib/query-keys.ts) so one workspace's cached members
  // can never be served for another.
  function invalidateMembers() {
    void queryClient.invalidateQueries({ queryKey: workspaceMembersKey(slug) });
  }

  const renameMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      return unwrapAction(renameWorkspaceAction({}, fd));
    },
    onSuccess: () => {
      // Without this the cached members entry — which is where the canvas widget
      // reads organizationName from, including the name the delete dialog asks
      // you to retype — kept the pre-rename value.
      invalidateMembers();
      // The workspace switcher elsewhere on screen reads better-auth's own
      // client-side org cache, which this server action doesn't touch —
      // a soft refresh re-runs server components so this widget (and
      // anything else server-rendered) picks up the new name immediately.
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.set("email", email.trim());
      fd.set("accessLevel", "view");
      return unwrapAction(inviteMemberAction({}, fd));
    },
    onSuccess: async () => {
      setEmail("");
      const { invitations: fresh } = await listPendingInvitationsAction();
      setInvitations(fresh);
      invalidateMembers();
    },
    onError: (err) => setError(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberIdOrEmail: string) => {
      const fd = new FormData();
      fd.set("memberIdOrEmail", memberIdOrEmail);
      return unwrapAction(removeMemberAction({}, fd));
    },
    onSuccess: (_res, memberIdOrEmail) => {
      setMembers((prev) => prev.filter((m) => m.id !== memberIdOrEmail));
      invalidateMembers();
    },
    onError: (err) => setError(err.message),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (invitationId: string) => {
      const fd = new FormData();
      fd.set("invitationId", invitationId);
      return unwrapAction(cancelInvitationAction({}, fd));
    },
    onSuccess: (_res, invitationId) => {
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      invalidateMembers();
    },
    onError: (err) => setError(err.message),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      // Trimmed to match the client-side check, so a stray copy-paste space
      // can't enable the button and then be rejected by the server.
      fd.set("confirmName", deleteConfirmText.trim());
      return unwrapAction(deleteWorkspaceAction({}, fd));
    },
    // Full navigation, not router.push — the org this page is scoped to no
    // longer exists, so nothing here should try to re-render.
    onSuccess: () => {
      window.location.href = "/workspaces";
    },
    onError: (err) => setError(err.message),
  });

  // Each control watches its OWN mutation. A single OR'd flag meant sending an
  // invite put every button in the widget — Save, Remove, Cancel, Delete — into
  // a spinner, which reads as "the whole panel is broken" rather than "your
  // invite is sending".

  const canInvite = isValidEmail(email) && !inviteMutation.isPending;

  function handleRename() {
    setError(null);
    renameMutation.mutate();
  }

  function handleInvite() {
    setError(null);
    inviteMutation.mutate();
  }

  function handleRemoveMember(memberIdOrEmail: string) {
    setError(null);
    removeMemberMutation.mutate(memberIdOrEmail);
  }

  function handleCancelInvite(invitationId: string) {
    setError(null);
    cancelInviteMutation.mutate(invitationId);
  }

  function handleDelete() {
    setError(null);
    deleteWorkspaceMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {canManage && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Workspace name</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-foreground outline-none focus:border-primary/50"
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleRename}
              disabled={renameMutation.isPending || !name.trim() || name.trim() === organizationName}
              className="shrink-0 gap-1.5 border-white/[0.08] bg-white/[0.04] px-3.5 text-[12.5px] font-medium text-foreground hover:bg-white/10"
            >
              {renameMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}

      {canManage && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Invite</h3>
          {/* A real form so Enter submits, and flex-wrap so the Invite button
              drops to its own line instead of being pushed past the card's
              overflow clip in a narrow canvas widget. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canInvite) handleInvite();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <InviteEmailField
              slug={slug}
              value={email}
              onChange={setEmail}
              onSubmit={() => {
                if (canInvite) handleInvite();
              }}
              disabled={inviteMutation.isPending}
            />
            <select
              disabled
              title="Only view-only invites are supported for now"
              className="h-9 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-[12.5px] text-muted-foreground"
            >
              {ACCESS_LEVELS.map((level) => (
                <option key={level.value} disabled={!level.enabled}>
                  {level.label}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={!canInvite}
              className="shrink-0 gap-1.5 px-3.5 text-[12.5px] font-semibold active:scale-[0.98]"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              Invite
            </Button>
          </form>
          {email.trim().length > 0 && !isValidEmail(email) && (
            <p className="text-[11.5px] text-muted-foreground">Enter a full email address to invite.</p>
          )}
        </div>
      )}

      {canManage && invitations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Pending invites</h3>
          {invitations.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <span className="truncate text-[13px] text-muted-foreground">{invite.email}</span>
              <div className="flex shrink-0 items-center gap-1">
                <CopyInviteLinkButton invitationId={invite.id} />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => handleCancelInvite(invite.id)}
                  disabled={cancelInviteMutation.isPending}
                  title="Cancel invite"
                  className="rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"}
        </h3>
        {members.map((member) => {
          const isSelf = member.userId === viewerUserId;
          const canRemove = canManage && !isSelf && member.role !== "owner";
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[12.5px] font-semibold text-primary">
                {initialOf(member.user.name, member.user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-foreground">
                  {member.user.name}
                  {isSelf && <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">(you)</span>}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">{member.user.email}</div>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.06] px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                {member.role}
              </span>
              {canRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removeMemberMutation.isPending}
                  title="Remove member"
                  className="rounded-full"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {canDelete && (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.04] p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Danger zone
          </div>

          {!deleteConfirmOpen ? (
            <Button
              type="button"
              variant="destructive"
              size="default"
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-fit gap-1.5 px-3 text-[12.5px] font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete workspace
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-muted-foreground">
                This deletes <span className="font-medium text-foreground">{organizationName}</span> and everything in
                it, for everyone. Type the workspace name to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={organizationName}
                className="h-9 rounded-lg border border-destructive/30 bg-white/[0.04] px-3 text-[13px] text-foreground outline-none focus:border-destructive/60"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="default"
                  onClick={handleDelete}
                  disabled={deleteWorkspaceMutation.isPending || deleteConfirmText.trim() !== organizationName.trim()}
                  className="gap-1.5 px-3 text-[12.5px] font-semibold"
                >
                  {deleteWorkspaceMutation.isPending ? (
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
                    setDeleteConfirmOpen(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-3 text-[12.5px] font-medium text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
