"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/better-auth";

export type InvitationActionState = { error?: string };

/**
 * Accepting joins the org AND makes it the active one, so the user lands
 * straight in the workspace they were invited to rather than whichever org
 * their session pointed at before.
 */
export async function acceptInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const invitationId = String(formData.get("invitationId") ?? "").trim();
  if (!invitationId) return { error: "Missing invitation." };

  const reqHeaders = await headers();
  let slug: string | null = null;

  try {
    const result = await auth.api.acceptInvitation({
      headers: reqHeaders,
      body: { invitationId },
    });

    const organizationId = result?.invitation?.organizationId;
    if (organizationId) {
      const org = await auth.api.setActiveOrganization({
        headers: reqHeaders,
        body: { organizationId },
      });
      slug = org?.slug ?? null;
    }
  } catch (err) {
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }

  // Outside the try: redirect() signals by throwing, and catching it here
  // would turn a successful accept into an "error".
  redirect(slug ? `/workspace/${slug}` : "/workspaces");
}

export async function rejectInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const invitationId = String(formData.get("invitationId") ?? "").trim();
  if (!invitationId) return { error: "Missing invitation." };

  try {
    await auth.api.rejectInvitation({
      headers: await headers(),
      body: { invitationId },
    });
  } catch (err) {
    if (err instanceof APIError) return { error: err.message };
    throw err;
  }

  redirect("/workspaces");
}
