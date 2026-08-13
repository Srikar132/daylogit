"use client";

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WidgetNode, type WidgetNodeData } from "@/components/canvas/widget-node";
import { WidgetToolbar, ToolbarDragGhost } from "@/components/canvas/widget-toolbar";
import { CanvasActionsProvider } from "@/components/canvas/canvas-actions-context";
import { saveMyWidgetLayout } from "@/lib/actions/widgets";
import type { WidgetLayoutItem } from "@/lib/db";
import type { BoardColumn } from "@/lib/worklog";
import type { DocProjectSummary } from "@/lib/actions/docs";
import type { GmailStatus } from "@/lib/actions/gmail";
import type { GmailMessageSummary } from "@/lib/gmail";
import type { WorkspaceMembersData } from "@/components/canvas/workspace-settings-widget";

const MULTI_INSTANCE_WIDGET_TYPES = new Set(["markdown", "media", "project-doc"]);
const KNOWN_WIDGET_TYPES = new Set([
  "board",
  "mail-summary",
  "markdown",
  "media",
  "project-doc",
  "workspace-settings",
]);
const NON_RESIZABLE_WIDGET_TYPES = new Set(["board", "mail-summary"]);
const MEDIA_MIME_PATTERN = /^(image|video)\//;

// Fixed 3-column board — wide enough that all three "To Do / In Progress /
// Completed" columns are visible without horizontal scroll on a typical
// desktop viewport. Mail summary sits beside it — fully self-contained, it
// fetches/manages its own data and takes no props from the canvas.
// Workspace settings is pinned the same way — never addable/removable (see
// widget-toolbar.tsx's ADDABLE_WIDGET_TYPES and mergeWithDefaults below).
const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { id: "board-1", type: "board", x: 40, y: 220, width: 1180, height: 660 },
  { id: "mail-summary-1", type: "mail-summary", x: 1260, y: 220, width: 340, height: 420 },
  { id: "workspace-settings-1", type: "workspace-settings", x: 1260, y: 660, width: 360, height: 460 },
];

// Height omitted for markdown — it sizes to its own content until the user
// explicitly drags a resize handle (see AUTO_HEIGHT_MIN below for the floor
// used both as its visual min-height and as a stand-in here for centering a
// fresh drop-point, since there's no real height to center on yet).
const NEW_WIDGET_DEFAULTS: Record<string, { width: number; height?: number }> = {
  markdown: { width: 340 },
  // Fixed box regardless of the pasted file's real aspect ratio — the media
  // itself renders with object-fit:contain, so nothing distorts; the user
  // resizes to taste rather than the box auto-fitting the source dimensions.
  media: { width: 360, height: 280 },
  // Height omitted — sizes to content (title/description/links) like the
  // note widget, same reasoning: a draft form and a filled-out card can be
  // very different heights.
  "project-doc": { width: 320 },
};

// Deliberately just plain data — no callbacks here. Mutation handlers
// (update/delete) are read by each widget itself via useCanvasActions(),
// not pre-bound at node-construction time, so building the initial node
// list never touches anything ref-backed during render.
type WidgetNodeContext = {
  columns: BoardColumn[];
  canWrite: boolean;
  slug: string;
  initialProjectSummaries: Record<string, DocProjectSummary>;
  initialGmailStatus: GmailStatus;
  initialGmailMessages?: GmailMessageSummary[];
  initialWorkspaceMembers?: WorkspaceMembersData;
};

function widgetTitle(type: string): string {
  switch (type) {
    case "board":
      return "Board";
    case "mail-summary":
      return "Today's Mail";
    case "markdown":
      return "Note";
    case "media":
      return "Media";
    case "project-doc":
      return "Project";
    case "workspace-settings":
      return "Workspace";
    default:
      return type;
  }
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
function mergeWithDefaults(saved: WidgetLayoutItem[] | null): WidgetLayoutItem[] {
  const layout = (saved ?? []).filter((item) => KNOWN_WIDGET_TYPES.has(item.type));
  const existingTypes = new Set(layout.map((item) => item.type));
  for (const def of DEFAULT_LAYOUT) {
    if (!MULTI_INSTANCE_WIDGET_TYPES.has(def.type) && !existingTypes.has(def.type)) {
      layout.push(def);
    }
  }
  return layout;
}

// Floor for widget types that auto-size to content (no persisted height yet)
// — without this an almost-empty note would render as a sliver. Height still
// grows past this naturally as content grows; it's a min, not a fixed size.
const AUTO_HEIGHT_MIN: Record<string, number> = { markdown: 240, "project-doc": 200 };
// Media needs right-click/video controls to work immediately, not after an
// extra double-click — the entered-gating built for text/board widgets
// would otherwise block the whole point of this widget.
// Project-doc cards only have link clicks + a MANAGE button, nothing that
// needs entered-mode's inline-typing gating either.
const ALWAYS_INTERACTIVE_WIDGET_TYPES = new Set(["media", "project-doc"]);
// No header/border chrome — just the media filling the node. Since there's
// no ".widget-drag-handle" element to grab, these skip the dragHandle
// restriction entirely so the node is draggable from anywhere on it instead.
// Notes are chromeless too now (no header/toolbar-in-card) but, unlike
// media, aren't in ALWAYS_INTERACTIVE_WIDGET_TYPES above — chromeless just
// means "no header/border chrome," it's independent of the double-click
// gate, which notes still need (accidental text edits while repositioning
// the canvas are a real risk; media's link clicks/video controls aren't).
const CHROMELESS_WIDGET_TYPES = new Set(["media", "markdown"]);

function buildNode(item: WidgetLayoutItem, ctx: WidgetNodeContext): Node {
  const autoMin = item.height === undefined ? AUTO_HEIGHT_MIN[item.type] : undefined;
  const chromeless = CHROMELESS_WIDGET_TYPES.has(item.type);

  const docProjectId = item.type === "project-doc" ? (item.data?.docProjectId as string | undefined) : undefined;

  const data: WidgetNodeData = {
    title: widgetTitle(item.type),
    canWrite: ctx.canWrite,
    resizable: !NON_RESIZABLE_WIDGET_TYPES.has(item.type),
    minHeight: autoMin,
    alwaysInteractive: ALWAYS_INTERACTIVE_WIDGET_TYPES.has(item.type),
    chromeless,
    widgetType: item.type,
    widgetData: item.data,
    columns: item.type === "board" ? ctx.columns : undefined,
    slug: item.type === "project-doc" ? ctx.slug : undefined,
    initialSummary: docProjectId ? ctx.initialProjectSummaries[docProjectId] : undefined,
    initialGmailStatus: item.type === "mail-summary" ? ctx.initialGmailStatus : undefined,
    initialGmailMessages: item.type === "mail-summary" ? ctx.initialGmailMessages : undefined,
    initialWorkspaceMembers: item.type === "workspace-settings" ? ctx.initialWorkspaceMembers : undefined,
  };

  return {
    id: item.id,
    type: "widget",
    position: { x: item.x, y: item.y },
    width: item.width,
    height: item.height,
    dragHandle: chromeless ? undefined : ".widget-drag-handle",
    data: data as unknown as Record<string, unknown>,
  };
}

const nodeTypes = { widget: WidgetNode };

interface CanvasShellProps {
  slug: string;
  initialLayout: WidgetLayoutItem[] | null;
  columns: BoardColumn[];
  canWrite: boolean;
  initialProjectSummaries: Record<string, DocProjectSummary>;
  initialGmailStatus: GmailStatus;
  initialGmailMessages?: GmailMessageSummary[];
  initialWorkspaceMembers?: WorkspaceMembersData;
}

function CanvasInner({
  slug,
  initialLayout,
  columns,
  canWrite,
  initialProjectSummaries,
  initialGmailStatus,
  initialGmailMessages,
  initialWorkspaceMembers,
}: CanvasShellProps) {
  const ctx: WidgetNodeContext = useMemo(
    () => ({
      columns,
      canWrite,
      slug,
      initialProjectSummaries,
      initialGmailStatus,
      initialGmailMessages,
      initialWorkspaceMembers,
    }),
    [
      columns,
      canWrite,
      slug,
      initialProjectSummaries,
      initialGmailStatus,
      initialGmailMessages,
      initialWorkspaceMembers,
    ],
  );

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node>(
    mergeWithDefaults(initialLayout).map((item) => buildNode(item, ctx)),
  );

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ids of nodes the user has explicitly dragged a resize handle on — only
  // these get their height persisted for auto-height widget types. Without
  // this, the very next unrelated save (e.g. typing in any note) would
  // capture react-flow's passively auto-measured height and silently pin
  // it, defeating the auto-height behavior for good.
  const manuallyResizedIds = useRef<Set<string>>(new Set());

  const [saveFailed, setSaveFailed] = useState(false);

  const persist = useCallback((current: Node[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const toSave: WidgetLayoutItem[] = current.map((n) => {
        const nodeData = n.data as unknown as { widgetType?: string; widgetData?: Record<string, unknown> };
        const type = nodeData.widgetType ?? "board";
        const autoHeight = type in AUTO_HEIGHT_MIN && !manuallyResizedIds.current.has(n.id);
        return {
          id: n.id,
          type,
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
          width: Math.round(n.width ?? 320),
          height: autoHeight ? undefined : Math.round(n.height ?? 240),
          data: nodeData.widgetData,
        };
      });

      // saveMyWidgetLayout can reject the write server-side (validation,
      // transient DB error) — the edit would otherwise vanish silently on
      // next reload with no sign anything went wrong. One retry absorbs a
      // blip; if it still fails, surface it instead of pretending it saved.
      const attempt = async (isRetry: boolean) => {
        const result = await saveMyWidgetLayout(toSave);
        if (result.error) {
          console.error("Failed to save widget layout:", result.error);
          if (!isRetry) setTimeout(() => void attempt(true), 2000);
          else setSaveFailed(true);
        } else {
          setSaveFailed(false);
        }
      };
      void attempt(false);
    }, 500);
  }, []);

  const updateWidgetData = useCallback(
    (id: string, widgetData: Record<string, unknown>) => {
      setNodes((current) => {
        const next = current.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, widgetData } } : n,
        );
        persist(next);
        return next;
      });
    },
    [persist, setNodes],
  );

  const resizeWidget = useCallback(
    (id: string, size: { width: number; height: number }) => {
      setNodes((current) => {
        const next = current.map((n) => (n.id === id ? { ...n, width: size.width, height: size.height } : n));
        persist(next);
        return next;
      });
    },
    [persist, setNodes],
  );

  // Pending uploads live only in memory — a raw File can't be serialized
  // into the persisted JSONB layout. Keyed by the widget id it belongs to.
  const pendingFiles = useRef<Map<string, File>>(new Map());
  const getPendingFile = useCallback((id: string) => pendingFiles.current.get(id), []);
  const clearPendingFile = useCallback((id: string) => {
    pendingFiles.current.delete(id);
  }, []);

  const deleteWidget = useCallback(
    (id: string) => {
      pendingFiles.current.delete(id);
      setNodes((current) => {
        const next = current.filter((n) => n.id !== id);
        persist(next);
        return next;
      });
    },
    [persist, setNodes],
  );

  const addWidget = useCallback(
    (type: string, dropPoint?: { x: number; y: number }) => {
      const defaults = NEW_WIDGET_DEFAULTS[type] ?? { width: 340, height: 320 };
      // dropPoint is the toolbar drag's release point (canvas coords) — the
      // widget centers there instead of anchoring its top-left corner to it.
      const x = dropPoint ? dropPoint.x - defaults.width / 2 : 60;
      const y = dropPoint ? dropPoint.y - (defaults.height ?? AUTO_HEIGHT_MIN[type] ?? 160) / 2 : 340;
      const item: WidgetLayoutItem = {
        id: `${type}-${crypto.randomUUID()}`,
        type,
        x: Math.round(x),
        y: Math.round(y),
        width: defaults.width,
        height: defaults.height,
      };
      setNodes((current) => {
        const next = [...current, buildNode(item, ctx)];
        persist(next);
        return next;
      });
      return item.id;
    },
    [ctx, persist, setNodes],
  );

  // A pasted/dropped file becomes its own widget immediately (status:
  // "uploading"), with the File registered in `pendingFiles` under that
  // same id so MediaWidget can pick it up and start the real upload itself.
  const addMediaFiles = useCallback(
    (files: File[], dropPoint: { x: number; y: number }) => {
      files.forEach((file, i) => {
        const id = addWidget("media", { x: dropPoint.x + i * 32, y: dropPoint.y + i * 32 });
        pendingFiles.current.set(id, file);
      });
    },
    [addWidget],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);

      let settled = false;
      for (const c of changes) {
        if (c.type === "position" && c.dragging === false) settled = true;
        if (c.type === "dimensions" && c.resizing === false) {
          settled = true;
          manuallyResizedIds.current.add(c.id);
        }
      }
      if (!settled) return;

      setNodes((current) => {
        persist(current);
        return current;
      });
    },
    [onNodesChangeInternal, persist, setNodes],
  );

  const { screenToFlowPosition } = useReactFlow();
  const [draggingType, setDraggingType] = useState<string | null>(null);

  // The toolbar lives entirely outside react-flow's pane/viewport (a plain
  // screen-fixed element), so dragging from it never touches the
  // nodrag/nopan/draggable-node machinery — this is a separate DndContext
  // scoped to just this drag, unrelated to react-flow's own node dragging.
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.widgetType as string | undefined;
    if (type) setDraggingType(type);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingType(null);
    const type = event.active.data.current?.widgetType as string | undefined;
    const rect = event.active.rect.current.translated ?? event.active.rect.current.initial;
    if (!type || !rect) return;
    const dropPoint = screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    addWidget(type, dropPoint);
  }

  // Ctrl+V anywhere on the page drops pasted image/video files at the last
  // known cursor position — a paste event carries no coordinates of its own.
  const lastPointerPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function trackPointer(e: PointerEvent) {
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    }

    function handlePaste(e: ClipboardEvent) {
      if (!canWrite) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && MEDIA_MIME_PATTERN.test(item.type)) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (!files.length) return;

      e.preventDefault();
      const dropPoint = screenToFlowPosition(lastPointerPos.current);
      addMediaFiles(files, dropPoint);
    }

    window.addEventListener("pointermove", trackPointer);
    document.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      document.removeEventListener("paste", handlePaste);
    };
  }, [canWrite, addMediaFiles, screenToFlowPosition]);

  function handleDragOverCanvas(event: React.DragEvent) {
    if (canWrite) event.preventDefault();
  }

  function handleDropOnCanvas(event: React.DragEvent) {
    if (!canWrite) return;
    const files = Array.from(event.dataTransfer.files).filter((f) => MEDIA_MIME_PATTERN.test(f.type));
    if (!files.length) return;
    event.preventDefault();
    const dropPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addMediaFiles(files, dropPoint);
  }

  return (
    // Explicit id — without one, dnd-kit falls back to a module-level
    // incrementing counter for its aria-describedby ids, and this context
    // being nested with BoardWidget's own DndContext (data-dependent task
    // count) shifts that counter differently between the server render
    // and the client hydration pass, causing a hydration mismatch warning.
    <DndContext id="canvas-widget-toolbar" sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <CanvasActionsProvider
        value={{ updateWidgetData, deleteWidget, getPendingFile, clearPendingFile, resizeWidget }}
      >
        <div className="h-full w-full" onDragOver={handleDragOverCanvas} onDrop={handleDropOnCanvas}>
          <ReactFlow
            nodes={nodes}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            minZoom={0.3}
            maxZoom={1.5}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            className="bg-[#1e1f20]"
            // Off-screen widgets stop mounting entirely — their own data
            // fetching (useQuery, Tiptap init, etc.) doesn't fire until
            // scrolled into view, so this scales down with widget count
            // instead of fighting the fetching work already done.
            onlyRenderVisibleElements
          >
            <Controls className="overflow-hidden !rounded-xl !border !border-white/[0.06]" showInteractive={false} />
            <MiniMap className="!rounded-xl !border !border-white/[0.06]" />
          </ReactFlow>
        </div>
      </CanvasActionsProvider>

      <WidgetToolbar canWrite={canWrite} />

      {saveFailed && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#f28b82]/30 bg-[#131314]/95 px-4 py-2 text-[12.5px] text-[#f28b82] shadow-2xl backdrop-blur-md">
          Couldn&apos;t save your changes — check your connection.
        </div>
      )}

      {/* Portalled straight to <body> — DragOverlay positions itself with
          `position: fixed`, but a `transform` on any ancestor (react-flow's
          pan/zoom viewport) creates a new containing block for fixed
          descendants, which would scale/translate the ghost with the canvas
          instead of tracking the real cursor. */}
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay>{draggingType ? <ToolbarDragGhost type={draggingType} /> : null}</DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

export function CanvasShell(props: CanvasShellProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
