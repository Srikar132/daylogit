"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/better-auth";
import { requireViewerContext } from "@/lib/workspace";
import { canDeleteWorkspace, canManageWorkspace } from "@/lib/permissions";

export type OrgActionState = { error?: string };

const renameSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name.").max(100, "Keep it under 100 characters."),
});

export async function renameWorkspaceAction(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const viewer = await requireViewerContext();
  if (!canManageWorkspace(viewer.role)) {
    return { error: "Only workspace owners/admins can rename the workspace." };
  }

  const parsed = renameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  try {
    const reqHeaders = await headers();
    await auth.api.updateOrganization({
      headers: reqHeaders,
      body: { organizationId: viewer.organizationId, data: { name: parsed.data.name } },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }

  return {};
}

const deleteSchema = z.object({
  confirmName: z.string().trim().min(1, "Type the workspace name to confirm."),
});

export async function deleteWorkspaceAction(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const viewer = await requireViewerContext();
  if (!canDeleteWorkspace(viewer.role)) {
    return { error: "Only the workspace owner can delete it." };
  }

  const parsed = deleteSchema.safeParse({ confirmName: formData.get("confirmName") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid confirmation." };
  }

  const reqHeaders = await headers();

  // The client already disables the button until the typed text matches —
  // this re-checks against the real name server-side rather than trusting
  // whatever the request happens to send.
  const org = await auth.api.getFullOrganization({
    headers: reqHeaders,
    query: { organizationId: viewer.organizationId },
  });
  if (!org || parsed.data.confirmName !== org.name) {
    return { error: "That doesn't match the workspace name." };
  }

  try {
    await auth.api.deleteOrganization({
      headers: reqHeaders,
      body: { organizationId: viewer.organizationId },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }

  return {};
}
