import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitation, organization, user } from "@/lib/auth-schema";

export type InvitationDetails = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  organizationName: string;
  organizationSlug: string | null;
  inviterLabel: string;
};

/**
 * Reads the invitation row directly rather than through
 * `auth.api.getInvitation`, which scopes its lookup to the signed-in user's
 * email and errors on any mismatch. That's the right default for an API, but it
 * makes the one case most likely to confuse an invitee — clicking the link
 * while signed into a different account — indistinguishable from an expired or
 * cancelled invite. Reading the row lets the page say exactly which address the
 * invitation was sent to.
 *
 * Safe to read unauthenticated-ish: the id is an unguessable token, and nothing
 * here mutates anything. Accepting still goes through better-auth, which
 * re-checks that the session's email owns the invitation.
 */
export async function loadInvitation(id: string): Promise<InvitationDetails | null> {
  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      inviterName: user.name,
      inviterEmail: user.email,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .innerJoin(user, eq(invitation.inviterId, user.id))
    .where(eq(invitation.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    inviterLabel: row.inviterName || row.inviterEmail,
  };
}

export type InvitationState =
  | "pending"
  | "not-found"
  | "wrong-account"
  | "expired"
  | "accepted"
  | "closed";

/** Every terminal state the accept page can be in, decided in one place so the
 *  page just renders and the rules stay testable. */
export function resolveInvitationState(
  details: InvitationDetails | null,
  viewerEmail: string | null | undefined,
  now: Date,
): InvitationState {
  if (!details) return "not-found";
  if (details.status === "accepted") return "accepted";
  if (details.status !== "pending") return "closed";
  if (details.expiresAt.getTime() < now.getTime()) return "expired";
  // Compared case-insensitively: invites are stored lowercased, but an OAuth
  // provider can hand back a differently-cased address for the same mailbox.
  if (!viewerEmail || viewerEmail.toLowerCase() !== details.email.toLowerCase()) return "wrong-account";
  return "pending";
}
