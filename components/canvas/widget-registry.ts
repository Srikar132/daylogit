import type { Node } from "@xyflow/react";
import type { WidgetNodeData } from "@/components/canvas/widget-node";
import type { WidgetLayoutItem } from "@/lib/db";
import type { BoardColumn } from "@/lib/worklog";
import type { DocProjectSummary } from "@/lib/actions/docs";
import type { AlbumPreview } from "@/lib/actions/albums";
import type { GmailStatus } from "@/lib/actions/gmail";
import type { GmailMessageSummary } from "@/lib/gmail";

/**
 * Single source of truth for "what widget types exist and how they behave."
 * Adding a new widget type means touching this file, not hunting through
 * canvas-shell.tsx's component body.
 */

export const MULTI_INSTANCE_WIDGET_TYPES = new Set(["bookmark", "gallery", "markdown", "media", "project-doc"]);
export const KNOWN_WIDGET_TYPES = new Set([
  "board",
  "bookmark",
  "gallery",
  "mail-summary",
  "markdown",
  "media",
  "project-doc",
]);
// Bookmark is a compact, fixed-format row (icon + text) — its height should
// always hug its own content, never be dragged to an arbitrary size (the
// reference design has no resize handles on it at all).
export const NON_RESIZABLE_WIDGET_TYPES = new Set(["board", "mail-summary", "bookmark", "gallery"]);

// Floor for widget types that auto-size to content (no persisted height yet)
// — without this an almost-empty note would render as a sliver. Height still
// grows past this naturally as content grows; it's a min, not a fixed size.
// Bookmark has no entry here — its content (icon + title + url) already has
// a fixed minimum height on its own, so a floor on top of that just leaves
// dead space below a card with no description.
export const AUTO_HEIGHT_MIN: Record<string, number> = { markdown: 240, "project-doc": 200, gallery: 200 };
// Widgets that own a text caret. These are the only ones with an `editing`
// phase, because they're the only ones where a drag is ambiguous: inside text
// it must select characters, on the card it must reposition. Every other
// widget (media controls, board inputs, links, buttons) is simply live from
// the first click in `select` mode — see lib/canvas/widget-interaction.ts.
export const TEXT_EDITING_WIDGET_TYPES = new Set(["markdown"]);

// Fixed 3-column board — wide enough that all three "To Do / In Progress /
// Completed" columns are visible without horizontal scroll on a typical
// desktop viewport. Mail summary sits beside it — fully self-contained, it
// fetches/manages its own data and takes no props from the canvas.
// Workspace settings used to be pinned here as a third card; it lives at
// /workspace/[slug]/settings now, reachable from the avatar menu. Dropping the
// type from KNOWN_WIDGET_TYPES is what retires the existing rows: mergeWithDefaults
// filters out anything whose type it no longer recognises, so saved copies stop
// appearing without needing a data migration.
export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { id: "board-1", type: "board", x: 40, y: 220, width: 1180, height: 660 },
  { id: "mail-summary-1", type: "mail-summary", x: 1260, y: 220, width: 340, height: 420 },
];

// Height omitted for markdown — it sizes to its own content until the user
// explicitly drags a resize handle (see AUTO_HEIGHT_MIN above for the floor
// used both as its visual min-height and as a stand-in here for centering a
// fresh drop-point, since there's no real height to center on yet).
export const NEW_WIDGET_DEFAULTS: Record<string, { width: number; height?: number }> = {
  markdown: { width: 340 },
  // Height omitted — a draft URL form and a filled-out compact card (icon +
  // title + description + url, one row) are different heights, same
  // reasoning as project-doc/markdown below. Wider than the old design —
  // this is a horizontal row now, not a tall image-on-top card.
  bookmark: { width: 380 },
  // Fixed box regardless of the pasted file's real aspect ratio — the media
  // itself renders with object-fit:contain, so nothing distorts; the user
  // resizes to taste rather than the box auto-fitting the source dimensions.
  media: { width: 360, height: 280 },
  // Height omitted — sizes to content (title/description/links) like the
  // note widget, same reasoning: a draft form and a filled-out card can be
  // very different heights.
  "project-doc": { width: 320 },
  // Height omitted — same reasoning as project-doc: a draft name form and
  // a filled-out fan-card preview are different heights.
  gallery: { width: 300 },
};

// Deliberately just plain data — no callbacks here. Mutation handlers
// (update/delete) are read by each widget itself via useCanvasActions(),
// not pre-bound at node-construction time, so building the initial node
// list never touches anything ref-backed during render.
export type WidgetNodeContext = {
  columns: BoardColumn[];
  canWrite: boolean;
  slug: string;
  initialProjectSummaries: Record<string, DocProjectSummary>;
  initialAlbumPreviews: Record<string, AlbumPreview>;
  initialGmailStatus: GmailStatus;
  initialGmailMessages?: GmailMessageSummary[];
};

export function widgetTitle(type: string): string {
  switch (type) {
    case "board":
      return "Board";
    case "bookmark":
      return "Bookmark";
    case "gallery":
      return "Gallery";
    case "mail-summary":
      return "Today's Mail";
    case "markdown":
      return "Note";
    case "media":
      return "Media";
    case "project-doc":
      return "Project";
    default:
      return type;
  }
}

export function buildNode(item: WidgetLayoutItem, ctx: WidgetNodeContext): Node {
  // Bookmark never keeps a stored height — any value sitting in the DB may
  // be a leftover from a previous card design (e.g. a taller thumbnail
  // layout) that no longer matches this type's actual content height, so
  // it's always ignored in favor of auto-measuring the current content.
  const height = item.type === "bookmark" ? undefined : item.height;
  const autoMin = height === undefined ? AUTO_HEIGHT_MIN[item.type] : undefined;

  const docProjectId = item.type === "project-doc" ? (item.data?.docProjectId as string | undefined) : undefined;
  const albumId = item.type === "gallery" ? (item.data?.albumId as string | undefined) : undefined;

  const data: WidgetNodeData = {
    title: widgetTitle(item.type),
    canWrite: ctx.canWrite,
    resizable: !NON_RESIZABLE_WIDGET_TYPES.has(item.type),
    minHeight: autoMin,
    textEditing: TEXT_EDITING_WIDGET_TYPES.has(item.type),
    widgetType: item.type,
    widgetData: item.data,
    columns: item.type === "board" ? ctx.columns : undefined,
    // Board needs this too, to scope its query key to this workspace
    // (lib/query-keys.ts).
    slug: ctx.slug,
    initialSummary: docProjectId ? ctx.initialProjectSummaries[docProjectId] : undefined,
    initialPreview: albumId ? ctx.initialAlbumPreviews[albumId] : undefined,
    initialGmailStatus: item.type === "mail-summary" ? ctx.initialGmailStatus : undefined,
    initialGmailMessages: item.type === "mail-summary" ? ctx.initialGmailMessages : undefined,
  };

  return {
    id: item.id,
    type: "widget",
    position: { x: item.x, y: item.y },
    width: item.width,
    height,
    dragHandle: undefined,
    // WidgetNode owns this from here on, derived from the canvas mode and the
    // widget's phase (lib/canvas/widget-interaction.ts). Starting false means
    // the first frame — before that effect runs — can't accidentally drag.
    draggable: false,
    data: data as unknown as Record<string, unknown>,
  };
}

/**
 * Any default widget type the user doesn't already have gets appended (at its
 * default position) — otherwise a newly-introduced default widget would
 * silently never show up for someone whose layout was already saved before it
 * existed. Widgets they already have keep whatever position/size they last
 * left them at. Anything saved whose type is no longer known (a widget that's
 * since been removed) is dropped — it'll simply stop appearing, and the next
 * save naturally stops persisting it. Multi-instance types (like markdown
 * notes) are exempt from the "add if missing" step — having zero of them is
 * the normal starting state, not something to backfill.
 */
export function mergeWithDefaults(saved: WidgetLayoutItem[] | null): WidgetLayoutItem[] {
  const layout = (saved ?? []).filter((item) => KNOWN_WIDGET_TYPES.has(item.type));
  const existingTypes = new Set(layout.map((item) => item.type));
  for (const def of DEFAULT_LAYOUT) {
    if (!MULTI_INSTANCE_WIDGET_TYPES.has(def.type) && !existingTypes.has(def.type)) {
      layout.push(def);
    }
  }
  return layout;
}
