"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewerContext } from "@/lib/workspace";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys";

export type CreateApiKeyResult = { rawKey?: string; error?: string };
export type RevokeApiKeyResult = { error?: string };

const createKeySchema = z.object({
  name: z.string().trim().max(60, "Keep the name under 60 characters.").optional(),
});

export async function createApiKeyAction(formData: FormData): Promise<CreateApiKeyResult> {
  const viewer = await requireViewerContext();

  const parsed = createKeySchema.safeParse({ name: formData.get("name") ?? undefined });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid key name." };
  }

  const { rawKey } = await createApiKey(
    viewer.userId,
    viewer.organizationId,
    parsed.data.name || "Default key",
  );
  revalidatePath("/settings/api-keys");
  return { rawKey };
}

export async function listMyApiKeysAction() {
  const viewer = await requireViewerContext();
  return listApiKeys(viewer.userId, viewer.organizationId);
}

const revokeKeySchema = z.object({
  keyId: z.string().uuid("Invalid key id."),
});

export async function revokeApiKeyAction(formData: FormData): Promise<RevokeApiKeyResult> {
  const viewer = await requireViewerContext();

  const parsed = revokeKeySchema.safeParse({ keyId: formData.get("keyId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid key." };
  }

  await revokeApiKey(viewer.userId, parsed.data.keyId);
  revalidatePath("/settings/api-keys");
  return {};
}
