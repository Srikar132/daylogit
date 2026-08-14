import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/better-auth";
import { db, member as memberTable } from "@/lib/db";
import type { OrgRole } from "@/lib/permissions";

export type ViewerContext = {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  role: OrgRole;
};

/** Session + active-organization + role for the current request. Redirects if either is missing. */
export async function requireViewerContext(): Promise<ViewerContext> {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/sign-in");
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    redirect("/workspaces");
  }

  const member = await auth.api.getActiveMember({ headers: reqHeaders });
  if (!member) {
    redirect("/workspaces");
  }

  return {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    organizationId,
    role: member.role as OrgRole,
  };
}

/** Role lookup for server-to-server callers (MCP/API-key auth) that have no browser session. */
export async function getMemberRole(
  userId: string,
  organizationId: string,
): Promise<OrgRole | undefined> {
  const [row] = await db
    .select({ role: memberTable.role })
    .from(memberTable)
    .where(and(eq(memberTable.userId, userId), eq(memberTable.organizationId, organizationId)))
    .limit(1);

  return row?.role as OrgRole | undefined;
}
