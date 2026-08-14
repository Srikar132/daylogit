"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Loader2, Mail, Pencil, Trash2, UserMinus, X } from "lucide-react";
import {
  cancelInvitationAction,
  getWorkspaceMembersData,
  inviteMemberAction,
  listPendingInvitationsAction,
  removeMemberAction,
} from "@/lib/actions/members";
import { deleteWorkspaceAction, renameWorkspaceAction } from "@/lib/actions/organization";
import { ACCESS_LEVELS } from "@/lib/permissions";

type WorkspaceMembersData = Awaited<ReturnType<typeof getWorkspaceMembersData>>;
type Member = WorkspaceMembersData["members"][number];
type Invitation = WorkspaceMembersData["invitations"][number];

function initialOf(name: string, email: string): string {
  return (name.trim()[0] ?? email[0] ?? "?").toUpperCase();
}

interface WorkspaceMembersManagerProps {
  organizationName: string;
  initialMembers: Member[];
  initialInvitations: Invitation[];
  canManage: boolean;
  canDelete: boolean;
  viewerUserId: string;
}

export function WorkspaceMembersManager({
  organizationName,
  initialMembers,
  initialInvitations,
  canManage,
  canDelete,
  viewerUserId,
}: WorkspaceMembersManagerProps) {
  const router = useRouter();
  const [name, setName] = useState(organizationName);
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [email, setEmail] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRename() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      const result = await renameWorkspaceAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      // The workspace switcher elsewhere on screen reads better-auth's own
      // client-side org cache, which this server action doesn't touch —
      // a soft refresh re-runs server components so this widget (and
      // anything else server-rendered) picks up the new name immediately.
      router.refresh();
    });
  }

  function handleInvite() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email.trim());
      fd.set("accessLevel", "view");
      const result = await inviteMemberAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEmail("");
      const { invitations: fresh } = await listPendingInvitationsAction();
      setInvitations(fresh);
    });
  }

  function handleRemoveMember(memberIdOrEmail: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("memberIdOrEmail", memberIdOrEmail);
      const result = await removeMemberAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberIdOrEmail));
    });
  }

  function handleCancelInvite(invitationId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("invitationId", invitationId);
      const result = await cancelInvitationAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("confirmName", deleteConfirmText);
      const result = await deleteWorkspaceAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Full navigation, not router.push — the org this page is scoped to
      // no longer exists, so nothing here should try to re-render.
      window.location.href = "/workspaces";
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#f28b82]/30 bg-[#f28b82]/10 px-3 py-2 text-[12.5px] text-[#f28b82]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {canManage && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-[#5f6368]">Workspace name</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-[#e8eaed] outline-none focus:border-[#8ab4f8]/50"
            />
            <button
              type="button"
              onClick={handleRename}
              disabled={isPending || !name.trim() || name.trim() === organizationName}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 text-[12.5px] font-medium text-[#e8eaed] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        </div>
      )}

      {canManage && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-[#5f6368]">Invite</h3>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-[#e8eaed] placeholder:text-[#5f6368] outline-none focus:border-[#8ab4f8]/50"
            />
            <select
              disabled
              className="h-9 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-[12.5px] text-[#9aa0a6]"
            >
              {ACCESS_LEVELS.map((level) => (
                <option key={level.value} disabled={!level.enabled}>
                  {level.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleInvite}
              disabled={isPending || !email.trim()}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#9dc4ff] to-[#8ab4f8] px-3.5 text-[12.5px] font-semibold text-[#141414] shadow-[0_2px_8px_rgba(138,180,248,0.35)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Invite
            </button>
          </div>
        </div>
      )}

      {canManage && invitations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-[#5f6368]">Pending invites</h3>
          {invitations.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <span className="truncate text-[13px] text-[#9aa0a6]">{invite.email}</span>
              <button
                type="button"
                onClick={() => handleCancelInvite(invite.id)}
                disabled={isPending}
                title="Cancel invite"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-[#f28b82]/10 hover:text-[#f28b82]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11.5px] font-medium uppercase tracking-wide text-[#5f6368]">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8ab4f8]/15 text-[12.5px] font-semibold text-[#8ab4f8]">
                {initialOf(member.user.name, member.user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[#e8eaed]">
                  {member.user.name}
                  {isSelf && <span className="ml-1.5 text-[11.5px] font-normal text-[#5f6368]">(you)</span>}
                </div>
                <div className="truncate text-[11.5px] text-[#5f6368]">{member.user.email}</div>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.06] px-2 py-0.5 text-[11px] capitalize text-[#9aa0a6]">
                {member.role}
              </span>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isPending}
                  title="Remove member"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-[#f28b82]/10 hover:text-[#f28b82]"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canDelete && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#f28b82]/25 bg-[#f28b82]/[0.04] p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#f28b82]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Danger zone
          </div>

          {!deleteConfirmOpen ? (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex h-8 w-fit items-center gap-1.5 rounded-lg border border-[#f28b82]/30 px-3 text-[12.5px] font-medium text-[#f28b82] hover:bg-[#f28b82]/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete workspace
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-[#9aa0a6]">
                This deletes <span className="font-medium text-[#e8eaed]">{organizationName}</span> and everything in
                it, for everyone. Type the workspace name to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={organizationName}
                className="h-9 rounded-lg border border-[#f28b82]/30 bg-white/[0.04] px-3 text-[13px] text-[#e8eaed] outline-none focus:border-[#f28b82]/60"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending || deleteConfirmText !== organizationName}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-[#f28b82] px-3 text-[12.5px] font-semibold text-[#141414] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete forever
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex h-8 items-center rounded-lg px-3 text-[12.5px] font-medium text-[#9aa0a6] hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
