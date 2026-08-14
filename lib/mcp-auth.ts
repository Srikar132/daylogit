import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, session as sessionTable } from "@/lib/db";
import { auth } from "@/lib/better-auth";
import { getMemberRole } from "@/lib/workspace";
import type { OrgRole } from "@/lib/permissions";

export type OAuthIdentity = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

/**
 * OAuth bearer identity for MCP/REST requests — replaces the old manual
 * API-key lookup. better-auth's OAuth tokens are per-user, with no notion
 * of "which workspace," so this resolves org the same way the browser
 * implicitly does: whichever workspace the user most recently had active
 * in a browser session. (Step 2, tracked separately, bakes the workspace
 * chosen at connect time immutably into the token instead — see the OAuth
 * connect flow plan for why that needs its own pass.)
 */
export async function resolveOAuthIdentity(req: Request): Promise<OAuthIdentity | null> {
  const mcpSession = await auth.api.getMcpSession({ headers: req.headers });
  if (!mcpSession) return null;

  const [row] = await db
    .select({ organizationId: sessionTable.activeOrganizationId })
    .from(sessionTable)
    .where(and(eq(sessionTable.userId, mcpSession.userId), isNotNull(sessionTable.activeOrganizationId)))
    .orderBy(desc(sessionTable.updatedAt))
    .limit(1);
  const organizationId = row?.organizationId;
  if (!organizationId) return null;

  const role = await getMemberRole(mcpSession.userId, organizationId);
  if (!role) return null;

  return { userId: mcpSession.userId, organizationId, role };
}

/** verifyToken callback for mcp-handler's withMcpAuth — same shape the old
 *  API-key verifier produced, so downstream tool code needed no changes. */
export async function verifyOAuthBearer(req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  const identity = await resolveOAuthIdentity(req);
  if (!identity) return undefined;

  return {
    token: bearerToken ?? "",
    clientId: identity.userId,
    scopes: ["worklog:read", "worklog:write"],
    extra: identity,
  };
}
