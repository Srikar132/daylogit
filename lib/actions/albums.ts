"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, albums, albumGroups, albumImages } from "@/lib/db";
import { requireViewerContext } from "@/lib/workspace";
import { canWriteEntries } from "@/lib/permissions";
import { cloudinary } from "@/lib/cloudinary";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionState = { error?: string };

export type AlbumRow = typeof albums.$inferSelect;
export type AlbumGroupRow = typeof albumGroups.$inferSelect;
export type AlbumImageRow = typeof albumImages.$inferSelect;

export type AlbumPreview = { name: string; count: number; images: AlbumImageRow[] };

/** Scopes an album lookup by the caller's org — the actual thing stopping
 *  one workspace from touching another's album by guessing an id. Every
 *  mutation below calls this first, mirroring docs.ts's getDocProject
 *  ownership-check pattern. */
async function getOwnedAlbum(id: string, organizationId: string) {
  const [row] = await db
    .select({ id: albums.id, name: albums.name })
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

const nameSchema = z.string().trim().min(1, "Name is required.").max(120, "Keep it under 120 characters.");

export async function createAlbumAction(name: string): Promise<{ error?: string; id?: string }> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };

  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`create-album:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const [album] = await db
    .insert(albums)
    .values({ organizationId: viewer.organizationId, name: parsed.data, createdBy: viewer.userId })
    .returning({ id: albums.id });

  if (!album) return { error: "Could not create the album. Please try again." };

  revalidatePath("/workspace", "layout");
  return { id: album.id };
}

export async function renameAlbumAction(id: string, name: string): Promise<ActionState> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };

  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`rename-album:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const owned = await getOwnedAlbum(id, viewer.organizationId);
  if (!owned) return { error: "Album not found." };

  await db.update(albums).set({ name: parsed.data, updatedAt: new Date() }).where(eq(albums.id, id));
  revalidatePath("/workspace", "layout");
  return {};
}

export async function deleteAlbumAction(id: string): Promise<ActionState> {
  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`delete-album:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const owned = await getOwnedAlbum(id, viewer.organizationId);
  if (!owned) return { error: "Album not found." };

  const images = await db
    .select({ cloudinaryPublicId: albumImages.cloudinaryPublicId })
    .from(albumImages)
    .where(eq(albumImages.albumId, id));

  await db.delete(albums).where(eq(albums.id, id));
  revalidatePath("/workspace", "layout");

  // Best-effort, run after the response is sent — a slow or failing
  // Cloudinary call shouldn't hold up the delete the user is waiting on.
  // Worst case is an orphaned asset, not a stuck delete. `after()` (not a
  // bare fire-and-forget) keeps this running past the point the function
  // would otherwise be frozen once the response goes out.
  const publicIds = images.map((img) => img.cloudinaryPublicId).filter((id): id is string => !!id);
  if (publicIds.length > 0) {
    after(() => Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => undefined))));
  }

  return {};
}

export async function getAlbumsForWorkspace(): Promise<AlbumRow[]> {
  const viewer = await requireViewerContext();
  return db.select().from(albums).where(eq(albums.organizationId, viewer.organizationId));
}

export async function getAlbum(id: string): Promise<AlbumRow | null> {
  const viewer = await requireViewerContext();
  const [row] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.organizationId, viewer.organizationId)))
    .limit(1);
  return row ?? null;
}

/** Batched lookup for the canvas — one round trip for every gallery widget's
 *  preview instead of one query per widget. Mirrors getDocProjectsByIds. */
export async function getAlbumPreviewsByIds(ids: string[]): Promise<Record<string, AlbumPreview>> {
  if (ids.length === 0) return {};
  const viewer = await requireViewerContext();

  const owned = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(inArray(albums.id, ids), eq(albums.organizationId, viewer.organizationId)));
  const ownedIds = owned.map((a) => a.id);
  if (ownedIds.length === 0) return {};

  const previews = await Promise.all(ownedIds.map((id) => getAlbumPreview(id)));
  return Object.fromEntries(ownedIds.map((id, i) => [id, previews[i]]));
}

/** The query backing the canvas fan card — cheap and constant-size
 *  regardless of how many images the album actually has. */
export async function getAlbumPreview(albumId: string): Promise<AlbumPreview> {
  const viewer = await requireViewerContext();
  const owned = await getOwnedAlbum(albumId, viewer.organizationId);
  if (!owned) return { name: "", count: 0, images: [] };

  const [images, [{ count }]] = await Promise.all([
    db
      .select()
      .from(albumImages)
      .where(eq(albumImages.albumId, albumId))
      .orderBy(desc(albumImages.createdAt))
      .limit(3),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(albumImages)
      .where(eq(albumImages.albumId, albumId)),
  ]);

  return { name: owned.name, count, images };
}

export async function getAlbumGroups(albumId: string): Promise<AlbumGroupRow[]> {
  const viewer = await requireViewerContext();
  const owned = await getOwnedAlbum(albumId, viewer.organizationId);
  if (!owned) return [];
  return db.select().from(albumGroups).where(eq(albumGroups.albumId, albumId)).orderBy(asc(albumGroups.position));
}

export async function createAlbumGroup(albumId: string, name: string): Promise<{ error?: string; id?: string }> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };

  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`create-album-group:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const owned = await getOwnedAlbum(albumId, viewer.organizationId);
  if (!owned) return { error: "Album not found." };

  const existing = await db
    .select({ position: albumGroups.position })
    .from(albumGroups)
    .where(eq(albumGroups.albumId, albumId));
  const nextPosition = existing.length ? Math.max(...existing.map((g) => g.position)) + 1 : 0;

  const [group] = await db
    .insert(albumGroups)
    .values({ albumId, name: parsed.data, position: nextPosition })
    .returning({ id: albumGroups.id });

  revalidatePath("/workspace", "layout");
  return { id: group?.id };
}

export async function renameAlbumGroup(id: string, albumId: string, name: string): Promise<ActionState> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };

  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`rename-album-group:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const owned = await getOwnedAlbum(albumId, viewer.organizationId);
  if (!owned) return { error: "Album not found." };

  await db.update(albumGroups).set({ name: parsed.data }).where(and(eq(albumGroups.id, id), eq(albumGroups.albumId, albumId)));
  revalidatePath("/workspace", "layout");
  return {};
}

export async function deleteAlbumGroup(id: string, albumId: string): Promise<ActionState> {
  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`delete-album-group:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const owned = await getOwnedAlbum(albumId, viewer.organizationId);
  if (!owned) return { error: "Album not found." };

  // Images in this group fall back to ungrouped via the FK's
  // onDelete: "set null" — deleting a group never deletes photos.
  await db.delete(albumGroups).where(and(eq(albumGroups.id, id), eq(albumGroups.albumId, albumId)));
  revalidatePath("/workspace", "layout");
  return {};
}

const addImageSchema = z.object({
  albumId: z.string().uuid(),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  cloudinaryPublicId: z.string().optional(),
  groupId: z.string().uuid().optional(),
});

export async function addImageToAlbum(
  input: z.infer<typeof addImageSchema>,
): Promise<{ error?: string; id?: string }> {
  const parsed = addImageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid image." };

  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`add-image:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const owned = await getOwnedAlbum(parsed.data.albumId, viewer.organizationId);
  if (!owned) return { error: "Album not found." };

  const [image] = await db
    .insert(albumImages)
    .values({
      albumId: parsed.data.albumId,
      groupId: parsed.data.groupId ?? null,
      url: parsed.data.url,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
      cloudinaryPublicId: parsed.data.cloudinaryPublicId ?? null,
      createdBy: viewer.userId,
    })
    .returning({ id: albumImages.id });

  revalidatePath("/workspace", "layout");
  return { id: image?.id };
}

/** Every image mutation below re-derives the owning album from the image
 *  row itself, then checks that album against the caller's org — same
 *  "look up the parent, then verify" shape as docs.ts's updateDocPage. */
async function getOwnedImageAlbumId(imageId: string, organizationId: string): Promise<string | null> {
  const [row] = await db
    .select({ albumId: albumImages.albumId })
    .from(albumImages)
    .where(eq(albumImages.id, imageId))
    .limit(1);
  if (!row) return null;
  const owned = await getOwnedAlbum(row.albumId, organizationId);
  return owned ? row.albumId : null;
}

export async function renameImageAction(id: string, name: string): Promise<ActionState> {
  const parsed = z.string().trim().max(200).safeParse(name);
  if (!parsed.success) return { error: "Invalid name." };

  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`rename-image:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const albumId = await getOwnedImageAlbumId(id, viewer.organizationId);
  if (!albumId) return { error: "Image not found." };

  await db.update(albumImages).set({ name: parsed.data || null }).where(eq(albumImages.id, id));
  revalidatePath("/workspace", "layout");
  return {};
}

export async function deleteImageAction(id: string): Promise<ActionState> {
  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`delete-image:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const [row] = await db
    .select({ albumId: albumImages.albumId, cloudinaryPublicId: albumImages.cloudinaryPublicId })
    .from(albumImages)
    .where(eq(albumImages.id, id))
    .limit(1);
  if (!row) return { error: "Image not found." };
  const owned = await getOwnedAlbum(row.albumId, viewer.organizationId);
  if (!owned) return { error: "Image not found." };

  await db.delete(albumImages).where(eq(albumImages.id, id));
  revalidatePath("/workspace", "layout");

  if (row.cloudinaryPublicId) {
    const publicId = row.cloudinaryPublicId;
    after(() => cloudinary.uploader.destroy(publicId).catch(() => undefined));
  }

  return {};
}

export async function moveImageToGroupAction(id: string, groupId: string | null): Promise<ActionState> {
  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`move-image:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const albumId = await getOwnedImageAlbumId(id, viewer.organizationId);
  if (!albumId) return { error: "Image not found." };

  await db.update(albumImages).set({ groupId }).where(eq(albumImages.id, id));
  revalidatePath("/workspace", "layout");
  return {};
}

export async function copyImageAction(id: string, targetGroupId?: string | null): Promise<{ error?: string; id?: string }> {
  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  const rateLimit = await checkRateLimit(`copy-image:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const [row] = await db.select().from(albumImages).where(eq(albumImages.id, id)).limit(1);
  if (!row) return { error: "Image not found." };
  const owned = await getOwnedAlbum(row.albumId, viewer.organizationId);
  if (!owned) return { error: "Image not found." };

  // Duplicates the row pointing at the same Cloudinary URL — no re-upload.
  // Deliberately omits cloudinaryPublicId so deleting either copy never
  // destroys the other's underlying asset.
  const [copy] = await db
    .insert(albumImages)
    .values({
      albumId: row.albumId,
      groupId: targetGroupId ?? row.groupId,
      url: row.url,
      width: row.width,
      height: row.height,
      name: row.name,
      createdBy: viewer.userId,
    })
    .returning({ id: albumImages.id });

  revalidatePath("/workspace", "layout");
  return { id: copy?.id };
}

export async function bulkDeleteImagesAction(ids: string[]): Promise<ActionState> {
  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  if (ids.length === 0) return {};
  const rateLimit = await checkRateLimit(`bulk-delete-images:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const rows = await db
    .select({ id: albumImages.id, albumId: albumImages.albumId, cloudinaryPublicId: albumImages.cloudinaryPublicId })
    .from(albumImages)
    .where(inArray(albumImages.id, ids));

  const albumIds = [...new Set(rows.map((r) => r.albumId))];
  const ownedAlbums = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(inArray(albums.id, albumIds), eq(albums.organizationId, viewer.organizationId)));
  const ownedSet = new Set(ownedAlbums.map((a) => a.id));
  const deletable = rows.filter((r) => ownedSet.has(r.albumId));
  if (deletable.length === 0) return {};

  await db.delete(albumImages).where(inArray(albumImages.id, deletable.map((r) => r.id)));
  revalidatePath("/workspace", "layout");

  const publicIds = deletable.map((r) => r.cloudinaryPublicId).filter((id): id is string => !!id);
  if (publicIds.length > 0) {
    after(() => Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => undefined))));
  }

  return {};
}

export async function bulkMoveImagesAction(ids: string[], groupId: string | null): Promise<ActionState> {
  const viewer = await requireViewerContext();
  if (!canWriteEntries(viewer.role)) return { error: "View-only access." };
  if (ids.length === 0) return {};
  const rateLimit = await checkRateLimit(`bulk-move-images:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const rows = await db.select({ id: albumImages.id, albumId: albumImages.albumId }).from(albumImages).where(inArray(albumImages.id, ids));
  const albumIds = [...new Set(rows.map((r) => r.albumId))];
  const ownedAlbums = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(inArray(albums.id, albumIds), eq(albums.organizationId, viewer.organizationId)));
  const ownedSet = new Set(ownedAlbums.map((a) => a.id));
  const movable = rows.filter((r) => ownedSet.has(r.albumId)).map((r) => r.id);
  if (movable.length === 0) return {};

  await db.update(albumImages).set({ groupId }).where(inArray(albumImages.id, movable));
  revalidatePath("/workspace", "layout");
  return {};
}

export type AlbumImagesPage = { images: AlbumImageRow[]; nextCursor: string | null };

/** Cursor-paginated so a huge album never loads in one shot — cursor is
 *  "createdAt,id" (id as a tiebreaker for same-millisecond uploads). */
export async function getAlbumImages(
  albumId: string,
  opts: { groupId?: string | null; cursor?: string | null; limit?: number } = {},
): Promise<AlbumImagesPage> {
  const viewer = await requireViewerContext();
  const owned = await getOwnedAlbum(albumId, viewer.organizationId);
  if (!owned) return { images: [], nextCursor: null };

  const limit = Math.min(opts.limit ?? 60, 120);
  const conditions = [eq(albumImages.albumId, albumId)];
  if (opts.groupId === null) conditions.push(sql`${albumImages.groupId} is null`);
  else if (opts.groupId) conditions.push(eq(albumImages.groupId, opts.groupId));

  if (opts.cursor) {
    const [cursorCreatedAt, cursorId] = opts.cursor.split(",");
    if (cursorCreatedAt && cursorId) {
      conditions.push(
        or(
          lt(albumImages.createdAt, new Date(cursorCreatedAt)),
          and(eq(albumImages.createdAt, new Date(cursorCreatedAt)), lt(albumImages.id, cursorId)),
        )!,
      );
    }
  }

  const rows = await db
    .select()
    .from(albumImages)
    .where(and(...conditions))
    .orderBy(desc(albumImages.createdAt), desc(albumImages.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const images = hasMore ? rows.slice(0, limit) : rows;
  const last = images.at(-1);
  const nextCursor = hasMore && last ? `${last.createdAt.toISOString()},${last.id}` : null;

  return { images, nextCursor };
}
