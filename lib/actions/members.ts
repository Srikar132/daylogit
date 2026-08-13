"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/better-auth";
import { requireViewerContext } from "@/lib/workspace";
import { canDeleteWorkspace, canManageWorkspace, mapAccessLevelToOrgRole, ACCESS_LEVELS } from "@/lib/permissions";

export type MemberActionState = { error?: string };

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  accessLevel: z.enum(ACCESS_LEVELS.map((l) => l.value) as [string, ...string[]]),
});

export async function inviteMemberAction(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const viewer = await requireViewerContext();
  if (!canManageWorkspace(viewer.role)) {
    return { error: "Only workspace owners/admins can invite members." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    accessLevel: formData.get("accessLevel") ?? "view",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite." };
  }

  let role: ReturnType<typeof mapAccessLevelToOrgRole>;
  try {
    role = mapAccessLevelToOrgRole(parsed.data.accessLevel);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid access level." };
  }

  try {
    const reqHeaders = await headers();
    await auth.api.createInvitation({
      headers: reqHeaders,
      body: {
        email: parsed.data.email,
        role,
        organizationId: viewer.organizationId,
      },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }

  return {};
}

/** Everything the pinned canvas widget needs to render directly in the card
 *  — member list, invite form, rename, danger zone — no separate settings
 *  page/route. One call: getFullOrganization already joins org + members +
 *  invitations, so this replaces what used to be two separate API calls. */
export async function getWorkspaceMembersData() {
  const viewer = await requireViewerContext();
  const reqHeaders = await headers();
  const canManage = canManageWorkspace(viewer.role);

  const org = await auth.api.getFullOrganization({
    headers: reqHeaders,
    query: { organizationId: viewer.organizationId },
  });
  if (!org) {
    // requireViewerContext already guarantees session + active membership,
    // so this is unreachable in practice — narrows the type either way.
    throw new Error("Organization not found.");
  }

  return {
    organizationName: org.name,
    organizationSlug: org.slug,
    members: org.members,
    // Only managers can act on invites, so only they need to see them —
    // no reason to hand a plain member the list of pending invite emails.
    invitations: canManage ? org.invitations.filter((i) => i.status === "pending") : [],
    canManage,
    canDelete: canDeleteWorkspace(viewer.role),
    viewerUserId: viewer.userId,
  };
}

export async function listPendingInvitationsAction() {
  const viewer = await requireViewerContext();
  if (!canManageWorkspace(viewer.role)) {
    return { invitations: [] };
  }

  const reqHeaders = await headers();
  const invitations = await auth.api.listInvitations({
    headers: reqHeaders,
    query: { organizationId: viewer.organizationId },
  });

  return { invitations: invitations.filter((i) => i.status === "pending") };
}

const cancelInvitationSchema = z.object({
  invitationId: z.string().trim().min(1, "Invitation id is required."),
});

export async function cancelInvitationAction(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const viewer = await requireViewerContext();
  if (!canManageWorkspace(viewer.role)) {
    return { error: "Only workspace owners/admins can cancel invitations." };
  }

  const parsed = cancelInvitationSchema.safeParse({ invitationId: formData.get("invitationId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invitation." };
  }

  try {
    const reqHeaders = await headers();
    await auth.api.cancelInvitation({
      headers: reqHeaders,
      body: { invitationId: parsed.data.invitationId },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }

  return {};
}

const removeSchema = z.object({
  memberIdOrEmail: z.string().trim().min(1, "Member id is required."),
});

export async function removeMemberAction(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const viewer = await requireViewerContext();
  if (!canManageWorkspace(viewer.role)) {
    return { error: "Only workspace owners/admins can remove members." };
  }

  const parsed = removeSchema.safeParse({ memberIdOrEmail: formData.get("memberIdOrEmail") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid member." };
  }

  try {
    const reqHeaders = await headers();
    await auth.api.removeMember({
      headers: reqHeaders,
      body: {
        memberIdOrEmail: parsed.data.memberIdOrEmail,
        organizationId: viewer.organizationId,
      },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }

  return {};
}
