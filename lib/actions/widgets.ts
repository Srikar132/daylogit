"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, widgetLayouts, type WidgetLayoutItem } from "@/lib/db";
import { requireViewerContext } from "@/lib/workspace";

const layoutItemSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().min(80),
  // Optional — a markdown note omits this until manually resized, sizing to
  // its content in the meantime.
  height: z.number().min(80).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const layoutSchema = z.array(layoutItemSchema).max(64);

export async function getMyWidgetLayout(): Promise<WidgetLayoutItem[] | null> {
  const viewer = await requireViewerContext();

  const [row] = await db
    .select({ layout: widgetLayouts.layout })
    .from(widgetLayouts)
    .where(
      and(
        eq(widgetLayouts.userId, viewer.userId),
        eq(widgetLayouts.organizationId, viewer.organizationId),
      ),
    )
    .limit(1);

  return row?.layout ?? null;
}

export async function saveMyWidgetLayout(layout: WidgetLayoutItem[]): Promise<{ error?: string }> {
  const viewer = await requireViewerContext();

  const parsed = layoutSchema.safeParse(layout);
  if (!parsed.success) {
    return { error: "Invalid layout." };
  }

  const existing = await db
    .select({ id: widgetLayouts.id })
    .from(widgetLayouts)
    .where(
      and(
        eq(widgetLayouts.userId, viewer.userId),
        eq(widgetLayouts.organizationId, viewer.organizationId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(widgetLayouts)
      .set({ layout: parsed.data, updatedAt: new Date() })
      .where(eq(widgetLayouts.id, existing[0].id));
  } else {
    await db.insert(widgetLayouts).values({
      userId: viewer.userId,
      organizationId: viewer.organizationId,
      layout: parsed.data,
    });
  }

  return {};
}
