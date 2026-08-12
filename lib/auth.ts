import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { eq, sql } from "drizzle-orm";
import { db, apiKeys } from "@/lib/db";
import { findActiveKeyByRawToken } from "@/lib/api-keys";
import { getMemberRole } from "@/lib/workspace";
import type { OrgRole } from "@/lib/permissions";

export type ApiKeyIdentity = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

async function resolveApiKeyIdentity(bearerToken?: string): Promise<ApiKeyIdentity | null> {
  if (!bearerToken) return null;

  const key = await findActiveKeyByRawToken(bearerToken);
  if (!key) return null;

  const role = await getMemberRole(key.userId, key.organizationId);
  if (!role) return null;

  // Fire-and-forget — a stale lastUsedAt is fine, blocking the request on it isn't.
  void db
    .update(apiKeys)
    .set({ lastUsedAt: sql`now()` })
    .where(eq(apiKeys.id, key.id));

  return { userId: key.userId, organizationId: key.organizationId, role };
}

/**
 * verifyToken callback for mcp-handler's withMcpAuth. Looks the bearer token
 * up as a per-user API key (hashed, never logged) and attaches the caller's
 * user/organization/role so every MCP tool call is scoped to their workspace.
 */
export async function verifyApiKey(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const identity = await resolveApiKeyIdentity(bearerToken);
  if (!identity) return undefined;

  return {
    token: bearerToken!,
    clientId: identity.userId,
    scopes: ["worklog:read", "worklog:write"],
    extra: identity,
  };
}

/** Same lookup as verifyApiKey, for the plain REST route rather than mcp-handler's callback shape. */
export async function getApiKeyIdentity(req: Request): Promise<ApiKeyIdentity | null> {
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return resolveApiKeyIdentity(bearerToken);
}
