"use server";

import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { db, widgets, type WidgetLayoutItem } from "@/lib/db";
import { requireViewerContext } from "@/lib/workspace";
import { mergeWithDefaults } from "@/components/canvas/widget-registry";
import { checkDragRateLimit, checkRateLimit } from "@/lib/rate-limit";

const MAX_WIDGETS_PER_WORKSPACE = 64;

const idSchema = z.string().min(1);
const layoutItemSchema = z.object({
  id: idSchema,
  type: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().min(80),
  // Optional — a markdown note omits this until manually resized, sizing to
  // its content in the meantime.
  height: z.number().min(80).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

function rowToItem(row: { id: string; type: string; x: number; y: number; width: number; height: number | null; data: unknown }): WidgetLayoutItem {
  return {
    id: row.id,
    type: row.type,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height ?? undefined,
    data: (row.data as Record<string, unknown> | null) ?? undefined,
  };
}

/** Every mutation below scopes its WHERE by (id, organizationId, userId) —
 *  the same composite the unique index covers — rather than looking the row
 *  up first and checking ownership separately. A stray id from another
 *  user/org just matches zero rows instead of erroring, which is fine: it
 *  simply means nothing to update. */
function ownedWhere(id: string, organizationId: string, userId: string) {
  return and(eq(widgets.id, id), eq(widgets.organizationId, organizationId), eq(widgets.userId, userId));
}

/** Reads this user's widgets and, the first time any pinned default (board,
 *  mail-summary, workspace-settings) is missing, inserts it — once inserted
 *  it behaves like any other widget from then on. Replaces the old
 *  "merge defaults into the in-memory array and let the next full-array
 *  save persist them" approach, which no longer exists now that saves are
 *  per-widget. */
export async function getMyWidgetLayout(): Promise<WidgetLayoutItem[]> {
  const viewer = await requireViewerContext();

  const rows = await db
    .select()
    .from(widgets)
    .where(and(eq(widgets.organizationId, viewer.organizationId), eq(widgets.userId, viewer.userId)));

  const existing = rows.map(rowToItem);
  const merged = mergeWithDefaults(existing);
  const existingIds = new Set(existing.map((item) => item.id));
  const missing = merged.filter((item) => !existingIds.has(item.id));

  if (missing.length > 0) {
    await db.insert(widgets).values(
      missing.map((item) => ({
        id: item.id,
        organizationId: viewer.organizationId,
        userId: viewer.userId,
        type: item.type,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height ?? null,
        data: item.data ?? null,
      })),
    );
  }

  return merged;
}

export async function createWidgetAction(item: WidgetLayoutItem): Promise<{ error?: string }> {
  const parsed = layoutItemSchema.safeParse(item);
  if (!parsed.success) return { error: "Invalid widget." };

  const viewer = await requireViewerContext();
  const rateLimit = await checkRateLimit(`create-widget:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(widgets)
    .where(and(eq(widgets.organizationId, viewer.organizationId), eq(widgets.userId, viewer.userId)));
  if (existingCount >= MAX_WIDGETS_PER_WORKSPACE) {
    return { error: "This workspace has reached its widget limit." };
  }

  await db.insert(widgets).values({
    id: parsed.data.id,
    organizationId: viewer.organizationId,
    userId: viewer.userId,
    type: parsed.data.type,
    x: parsed.data.x,
    y: parsed.data.y,
    width: parsed.data.width,
    height: parsed.data.height ?? null,
    data: parsed.data.data ?? null,
  });

  return {};
}

const positionSchema = z.object({ id: idSchema, x: z.number(), y: z.number() });

export async function updateWidgetPositionAction(input: z.infer<typeof positionSchema>): Promise<{ error?: string }> {
  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid position." };

  const viewer = await requireViewerContext();
  const rateLimit = await checkDragRateLimit(`update-widget-position:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  await db
    .update(widgets)
    .set({ x: parsed.data.x, y: parsed.data.y, updatedAt: new Date() })
    .where(ownedWhere(parsed.data.id, viewer.organizationId, viewer.userId));

  return {};
}

const sizeSchema = z.object({ id: idSchema, width: z.number().min(80), height: z.number().min(80).nullable() });

export async function updateWidgetSizeAction(input: z.infer<typeof sizeSchema>): Promise<{ error?: string }> {
  const parsed = sizeSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid size." };

  const viewer = await requireViewerContext();
  const rateLimit = await checkDragRateLimit(`update-widget-size:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  await db
    .update(widgets)
    .set({ width: parsed.data.width, height: parsed.data.height, updatedAt: new Date() })
    .where(ownedWhere(parsed.data.id, viewer.organizationId, viewer.userId));

  return {};
}

export async function updateWidgetDataAction(id: string, data: Record<string, unknown>): Promise<{ error?: string }> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Invalid widget id." };

  const viewer = await requireViewerContext();
  const rateLimit = await checkDragRateLimit(`update-widget-data:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  await db
    .update(widgets)
    .set({ data, updatedAt: new Date() })
    .where(ownedWhere(parsedId.data, viewer.organizationId, viewer.userId));

  return {};
}

export async function deleteWidgetAction(id: string): Promise<{ error?: string }> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: "Invalid widget id." };

  const viewer = await requireViewerContext();
  const rateLimit = await checkRateLimit(`delete-widget:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  await db.delete(widgets).where(ownedWhere(parsedId.data, viewer.organizationId, viewer.userId));

  return {};
}
