import { timingSafeEqual } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * verifyToken callback for mcp-handler's withMcpAuth. Compares the bearer
 * token against WORKLOG_API_KEY in constant time. Never log the token or
 * the env value here, even on failure.
 */
export function verifyApiKey(
  _req: Request,
  bearerToken?: string,
): AuthInfo | undefined {
  const expected = process.env.WORKLOG_API_KEY;
  if (!expected || !bearerToken || !safeEqual(bearerToken, expected)) {
    return undefined;
  }

  return {
    token: bearerToken,
    clientId: "worklog-single-user",
    scopes: ["worklog:read", "worklog:write"],
  };
}

/** Same check as verifyApiKey, for the plain REST route rather than mcp-handler's callback shape. */
export function hasValidApiKey(req: Request): boolean {
  const expected = process.env.WORKLOG_API_KEY;
  const bearerToken = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && bearerToken && safeEqual(bearerToken, expected));
}
