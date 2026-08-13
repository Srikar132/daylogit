"use server";

import { and, desc, eq } from "drizzle-orm";
import { db, oauthAccessToken, oauthApplication } from "@/lib/db";
import { requireViewerContext } from "@/lib/workspace";

export type ConnectionActionState = { error?: string };

/** No official better-auth endpoint lists a user's authorized OAuth apps —
 *  we own the oauthAccessToken/oauthApplication tables, so this just reads
 *  them directly. Reconnecting the same app issues a new token row without
 *  removing the old one, so this dedupes by client and keeps the most
 *  recent (ordered desc, first occurrence wins). */
export async function listMyConnectionsAction() {
  const viewer = await requireViewerContext();

  const rows = await db
    .select({
      clientId: oauthApplication.clientId,
      name: oauthApplication.name,
      icon: oauthApplication.icon,
      createdAt: oauthAccessToken.createdAt,
    })
    .from(oauthAccessToken)
    .innerJoin(oauthApplication, eq(oauthAccessToken.clientId, oauthApplication.clientId))
    .where(eq(oauthAccessToken.userId, viewer.userId))
    .orderBy(desc(oauthAccessToken.createdAt));

  const seen = new Set<string>();
  const connections = rows.filter((row) => {
    if (seen.has(row.clientId)) return false;
    seen.add(row.clientId);
    return true;
  });

  return { connections };
}

export async function revokeConnectionAction(
  _prevState: ConnectionActionState,
  formData: FormData,
): Promise<ConnectionActionState> {
  const viewer = await requireViewerContext();
  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Missing client id." };
  }

  await db
    .delete(oauthAccessToken)
    .where(and(eq(oauthAccessToken.userId, viewer.userId), eq(oauthAccessToken.clientId, clientId)));

  return {};
}
