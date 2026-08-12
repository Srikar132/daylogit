import { randomBytes, createHash } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db, apiKeys } from "@/lib/db";

const KEY_PREFIX = "dlg_";

export type ApiKeyRow = typeof apiKeys.$inferSelect;

export function generateApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function createApiKey(
  userId: string,
  organizationId: string,
  name = "Default key",
): Promise<{ row: ApiKeyRow; rawKey: string }> {
  const rawKey = generateApiKey();
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      organizationId,
      name,
      keyHash: hashApiKey(rawKey),
    })
    .returning();

  return { row, rawKey };
}

export async function listApiKeys(userId: string, organizationId: string): Promise<ApiKeyRow[]> {
  return db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.organizationId, organizationId),
        isNull(apiKeys.revokedAt),
      ),
    );
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
}

export async function findActiveKeyByRawToken(rawKey: string): Promise<ApiKeyRow | undefined> {
  const hash = hashApiKey(rawKey);
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);

  return row;
}
