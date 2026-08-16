"use client";

import { NodeResizer, type NodeProps } from "@xyflow/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { WidgetChromeProvider } from "@/components/canvas/widget-chrome-context";
import { BoardWidget } from "@/components/canvas/board-widget";
import { BookmarkWidget } from "@/components/canvas/bookmark-widget";
import { GalleryWidget } from "@/components/canvas/gallery-widget";
import { MailSummaryWidget } from "@/components/canvas/mail-summary-widget";
import { MediaWidget } from "@/components/canvas/media-widget";
import { ProjectDocWidget } from "@/components/canvas/project-doc-widget";
import { WorkspaceSettingsWidget, type WorkspaceMembersData } from "@/components/canvas/workspace-settings-widget";
import type { BoardColumn } from "@/lib/worklog";
import type { DocProjectSummary } from "@/lib/actions/docs";
import type { AlbumPreview } from "@/lib/actions/albums";
import type { GmailStatus } from "@/lib/actions/gmail";
import type { GmailMessageSummary } from "@/lib/gmail";

// Tiptap + its extensions (table, task-list, etc.) is the heaviest single
// widget dependency and, unlike board/mail-summary, genuinely optional —
// not every canvas has a note on it. Split out rather than paying for it
// on every canvas open regardless of whether a note widget exists.
const MarkdownWidget = dynamic(() => import("@/components/canvas/markdown-widget").then((m) => m.MarkdownWidget), {
  ssr: false,
});

export type WidgetNodeData = {
  /** No visible header anymore — used as a native `title` tooltip on hover. */
  title: string;
  canWrite: boolean;
  resizable?: boolean;
  /** Content-driven height floor, in px — see widget-registry's AUTO_HEIGHT_MIN.
   *  Applied directly on the card's own container, not an ancestor:
   *  min-height on a percentage-sized ancestor doesn't stretch percentage
   *  children to fill it (they resolve as `auto` per spec), so the floor
   *  has to live on the box that actually needs to grow. */
  minHeight?: number;
  /** Skips the double-click-to-enter gating — the body is interactive right
   *  away. For widgets like media, where link clicks/video controls need to
   *  work immediately rather than after an extra double-click step. */
  alwaysInteractive?: boolean;
  widgetType: string;
  widgetData?: Record<string, unknown>;
  /** Only populated for type "board". */
  columns?: BoardColumn[];
  /** Only populated for types "project-doc"/"gallery" — needed for the
   *  MANAGE/OPEN GALLERY link. */
  slug?: string;
  /** Server-prefetched — batched once for every project-doc card on the
   *  canvas rather than each one fetching its own on mount. */
  initialSummary?: DocProjectSummary;
  /** Server-prefetched — batched once for every gallery card on the canvas,
   *  same precedent as initialSummary above. */
  initialPreview?: AlbumPreview;
  /** Server-prefetched — only populated for type "mail-summary". */
  initialGmailStatus?: GmailStatus;
  initialGmailMessages?: GmailMessageSummary[];
  /** Server-prefetched — only populated for type "workspace-settings". */
  initialWorkspaceMembers?: WorkspaceMembersData;
};

// Dispatches on the node's OWN live `data` prop rather than a closure baked
// in at node-creation time — a closure captured once would never see later
// updates from updateWidgetData (this bit media widgets: upload completion
// updates data.widgetData, but a frozen `render()` closure kept showing the
// original "uploading" snapshot forever).
function renderWidgetBody(id: string, data: WidgetNodeData): React.ReactNode {
  switch (data.widgetType) {
    case "board":
      return <BoardWidget columns={data.columns ?? []} canWrite={data.canWrite} />;
    case "bookmark":
      return <BookmarkWidget id={id} canWrite={data.canWrite} widgetData={data.widgetData} />;
    case "gallery": {
      const albumId = data.widgetData?.albumId;
      return (
        <GalleryWidget
          id={id}
          albumId={typeof albumId === "string" ? albumId : undefined}
          slug={data.slug}
          canWrite={data.canWrite}
          initialPreview={data.initialPreview}
        />
      );
    }
    case "mail-summary":
      return (
        <MailSummaryWidget
          initialStatus={data.initialGmailStatus}
          initialMessages={data.initialGmailMessages}
        />
      );
    case "markdown":
      return <MarkdownWidget id={id} initialContent={data.widgetData} canWrite={data.canWrite} />;
    case "media":
      return <MediaWidget id={id} data={data.widgetData} canWrite={data.canWrite} />;
    case "project-doc": {
      const docProjectId = data.widgetData?.docProjectId;
      return (
        <ProjectDocWidget
          id={id}
          docProjectId={typeof docProjectId === "string" ? docProjectId : undefined}
          slug={data.slug}
          canWrite={data.canWrite}
          initialSummary={data.initialSummary}
        />
      );
    }
    case "workspace-settings":
      return <WorkspaceSettingsWidget initialData={data.initialWorkspaceMembers} />;
    default:
      return null;
  }
}

// Fully invisible — the selected/entered ring highlight (rendered on the
// card itself) is the only visual affordance; the actual drag hit-areas
// (all 4 edges + 4 corners) sit right on top of that ring, transparent.
// Must be the LAST child in DOM order, after the card content, or the
// content div (same size, no z-index) paints over it and swallows every
// pointer event except the exact corner pixel the content's own border
// radius happens to leave uncovered.
// Sizes are set via style (not className) so they win regardless of
// Tailwind specificity — generous on purpose: `autoScale` keeps this a
// fixed screen size at any zoom level, so it has to be big enough to grab
// comfortably even zoomed all the way out.
const RESIZE_LINE_CLASS = "!border-transparent";
const RESIZE_LINE_STYLE = { borderWidth: 10 };
const RESIZE_HANDLE_CLASS = "!border-none !bg-transparent";
const RESIZE_HANDLE_STYLE = { width: 22, height: 22 };
const RESIZE_MIN_WIDTH = 160;
const RESIZE_MIN_HEIGHT = 100;

export function WidgetNode({ id, data, selected }: NodeProps) {
  const widgetData = data as unknown as WidgetNodeData;
  const { title, resizable = true, minHeight, alwaysInteractive = false } = widgetData;
  const [entered, setEntered] = useState(false);
  const [floatingToolbar, setFloatingToolbar] = useState<React.ReactNode | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { setWidgetDraggable, setWidgetSelected } = useCanvasActions();

  // Three states, one derived rule: idle (draggable=false, a drag anywhere on
  // the card falls through to the pane's own pan) -> selected (single click;
  // draggable=true, a subsequent drag repositions it) -> interactive (double-
  // click/tap "enters" the widget; draggable locks back to false so trying
  // to hit a button/link can't also drag the card). xyflow attaches its own
  // node-drag handler only when `draggable` is true, so this one flag is the
  // whole mechanism — no custom drag pass-through needed.
  useEffect(() => {
    setWidgetDraggable(id, selected && !entered);
  }, [id, selected, entered, setWidgetDraggable]);

  // Stepping "inside" a widget (double-click/double-tap) makes its body
  // directly interactive; clicking anywhere outside, or Escape, steps back
  // out to fully idle (deselecting too — outside clicks on UI outside
  // xyflow's own DOM, like the toolbar or workspace chrome, won't trigger
  // xyflow's own pane-click deselect on their own).
  useEffect(() => {
    if (!entered && !selected) return;

    function exitToIdle() {
      setEntered(false);
      setWidgetSelected(id, false);
    }

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        exitToIdle();
      }
    }
    // Capture phase, not bubble — a rich-text widget's own editor (Tiptap/
    // ProseMirror) has its own Escape handling and can stop the event from
    // ever reaching a bubble-phase document listener. Capture runs before
    // the event reaches that editor at all, so it can't be swallowed.
    //
    // stopPropagation matters here beyond just our own editor: xyflow's own
    // node wrapper also has an Escape handler (for its own selection model),
    // and its handleNodeClick has a quirk — if the node is already
    // deselected by the time it runs, it ignores "unselect" and *selects*
    // the node instead (its guard only checks unselect when already
    // selected). Since our exitToIdle deselects first, letting the event
    // continue to that handler re-selects the node right back. Stopping
    // propagation here keeps xyflow's own node-level handling from ever
    // seeing this keypress.
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        exitToIdle();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [entered, selected, id, setWidgetSelected]);

  const isEntered = alwaysInteractive || entered;
  // Media has no background of its own (the image/video fills the card);
  // every other type needs one to actually read as a card now that none of
  // them have a bordered/bg'd header container anymore. Markdown keeps its
  // user-customizable override.
  const cardBg =
    widgetData.widgetType === "media"
      ? undefined
      : (widgetData.widgetData?.bgColor as string | undefined);

  return (
    <div ref={rootRef} className="relative h-full w-full" title={title} onDoubleClick={() => setEntered(true)}>
      <div
        style={{ ...(minHeight ? { minHeight } : undefined), ...(cardBg ? { backgroundColor: cardBg } : undefined) }}
        className={`widget-card-shell h-full w-full touch-manipulation overflow-hidden transition-all ${entered ? "ring-2 ring-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)]" : selected ? "ring-2 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]" : ""
          } ${isEntered
            ? // `nodrag` only locks once the user actually double-clicked in —
            // alwaysInteractive widgets (media/bookmark/project-doc) skip that
            // gate by design, so they'd otherwise be permanently nodrag'd with
            // no way left to grab their body and reposition them at all, now
            // that there's no header handle to fall back on. Their own
            // genuinely-interactive sub-elements (a link, a button) carry
            // `nodrag` themselves instead of the whole card claiming it.
            `nowheel ${entered ? "nodrag" : ""}`
            : "pointer-events-none"
          } ${
            // Cursor tracks the REAL entered state, not isEntered — an
            // alwaysInteractive widget's body stays clickable (pointer-events
            // above) even when idle/selected, but the cursor still needs to
            // read grab there like every other widget; only actually being
            // entered (double-clicked in) drops it to a normal pointer. Any
            // genuinely-interactive sub-element (a link, a button) carries
            // its own explicit cursor class that wins over this by CSS
            // specificity, so this doesn't fight real click targets.
            entered ? "cursor-auto" : "cursor-grab active:cursor-grabbing"
          }`}
      >
        <WidgetChromeProvider value={{ entered: isEntered, setFloatingToolbar }}>
          {renderWidgetBody(id, widgetData)}
        </WidgetChromeProvider>
      </div>

      {/* Toolbar sits above the card, outside its overflow-hidden clip —
          per-card, not one shared canvas-wide bar. */}
      {entered && floatingToolbar && (
        <div className="nodrag absolute inset-x-0 bottom-full z-10 mb-2 flex justify-center">
          {floatingToolbar}
        </div>
      )}

      {resizable && (
        <NodeResizer
          minWidth={RESIZE_MIN_WIDTH}
          minHeight={RESIZE_MIN_HEIGHT}
          isVisible={selected}
          lineClassName={RESIZE_LINE_CLASS}
          lineStyle={RESIZE_LINE_STYLE}
          handleClassName={RESIZE_HANDLE_CLASS}
          handleStyle={RESIZE_HANDLE_STYLE}
        />
      )}
    </div>
  );
}
