import { auth } from "@/lib/better-auth";
import type { OrgRole } from "@/lib/permissions";

export type RequestIdentity = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

/** Session + active-organization for a same-origin browser request. Returns null if either is missing. */
export async function getRequestIdentity(request: Request): Promise<RequestIdentity | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) return null;

  const member = await auth.api.getActiveMember({ headers: request.headers });
  if (!member) return null;

  return {
    userId: session.user.id,
    organizationId,
    role: member.role as OrgRole,
  };
}
