"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/better-auth";
import { requireViewerContext } from "@/lib/workspace";
import { canManageWorkspace, mapAccessLevelToOrgRole, ACCESS_LEVELS } from "@/lib/permissions";

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

export async function listMembersAction() {
  const viewer = await requireViewerContext();
  const reqHeaders = await headers();

  const members = await auth.api.listMembers({
    headers: reqHeaders,
    query: { organizationId: viewer.organizationId },
  });

  return { viewer, members: members.members };
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
