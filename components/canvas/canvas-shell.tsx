"use client";

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  useNodesState,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { useCallback, useMemo, useRef } from "react";
import { WidgetNode, type WidgetNodeData } from "@/components/canvas/widget-node";
import { BoardWidget } from "@/components/canvas/board-widget";
import { MailSummaryWidget } from "@/components/canvas/mail-summary-widget";
import { MarkdownWidget } from "@/components/canvas/markdown-widget";
import { AddWidgetCard } from "@/components/canvas/add-widget-card";
import { CanvasActionsProvider } from "@/components/canvas/canvas-actions-context";
import { saveMyWidgetLayout } from "@/lib/actions/widgets";
import type { WidgetLayoutItem } from "@/lib/db";
import type { BoardColumn } from "@/lib/worklog";

const MULTI_INSTANCE_WIDGET_TYPES = new Set(["markdown"]);
const KNOWN_WIDGET_TYPES = new Set(["board", "mail-summary", "markdown"]);
const NON_RESIZABLE_WIDGET_TYPES = new Set(["board", "mail-summary"]);

// Fixed 3-column board — wide enough that all three "To Do / In Progress /
// Completed" columns are visible without horizontal scroll on a typical
// desktop viewport. Mail summary sits beside it — fully self-contained, it
// fetches/manages its own data and takes no props from the canvas. Both
// start at y:220, leaving the top-left corner clear for the command-center
// card pinned at canvas (0,0).
const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { id: "board-1", type: "board", x: 40, y: 220, width: 1180, height: 660 },
  { id: "mail-summary-1", type: "mail-summary", x: 1260, y: 220, width: 340, height: 420 },
];

const NEW_WIDGET_DEFAULTS: Record<string, { width: number; height: number }> = {
  markdown: { width: 340, height: 320 },
};

// Deliberately just plain data — no callbacks here. Mutation handlers
// (update/delete) are read by each widget itself via useCanvasActions(),
// not pre-bound at node-construction time, so building the initial node
// list never touches anything ref-backed during render.
type WidgetNodeContext = {
  columns: BoardColumn[];
  canWrite: boolean;
};

function widgetTitle(type: string): string {
  switch (type) {
    case "board":
      return "Board";
    case "mail-summary":
      return "Today's Mail";
    case "markdown":
      return "Note";
    default:
      return type;
  }
}

function widgetContent(item: WidgetLayoutItem, ctx: WidgetNodeContext): React.ReactNode {
  switch (item.type) {
    case "board":
      return <BoardWidget columns={ctx.columns} canWrite={ctx.canWrite} />;
    case "mail-summary":
      return <MailSummaryWidget />;
    case "markdown":
      return <MarkdownWidget id={item.id} initialContent={item.data} canWrite={ctx.canWrite} />;
    default:
      return null;
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

function buildNode(item: WidgetLayoutItem, ctx: WidgetNodeContext): Node {
  const data: WidgetNodeData & { widgetType: string; widgetData?: Record<string, unknown> } = {
    title: widgetTitle(item.type),
    canWrite: ctx.canWrite,
    resizable: !NON_RESIZABLE_WIDGET_TYPES.has(item.type),
    widgetType: item.type,
    widgetData: item.data,
    render: () => widgetContent(item, ctx),
  };

  return {
    id: item.id,
    type: "widget",
    position: { x: item.x, y: item.y },
    width: item.width,
    height: item.height,
    dragHandle: ".widget-drag-handle",
    data: data as unknown as Record<string, unknown>,
  };
}

function AddWidgetNode({ data }: NodeProps) {
  const { onAdd, canWrite } = data as unknown as { onAdd: (type: string) => void; canWrite: boolean };
  return <AddWidgetCard onAdd={onAdd} canWrite={canWrite} />;
}

const nodeTypes = { widget: WidgetNode, picker: AddWidgetNode };

interface CanvasShellProps {
  initialLayout: WidgetLayoutItem[] | null;
  columns: BoardColumn[];
  canWrite: boolean;
}

function CanvasInner({ initialLayout, columns, canWrite }: CanvasShellProps) {
  const ctx: WidgetNodeContext = useMemo(() => ({ columns, canWrite }), [columns, canWrite]);

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node>(
    mergeWithDefaults(initialLayout).map((item) => buildNode(item, ctx)),
  );

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((current: Node[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const toSave: WidgetLayoutItem[] = current.map((n) => {
        const nodeData = n.data as unknown as { widgetType?: string; widgetData?: Record<string, unknown> };
        return {
          id: n.id,
          type: nodeData.widgetType ?? "board",
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
          width: Math.round(n.width ?? 320),
          height: Math.round(n.height ?? 240),
          data: nodeData.widgetData,
        };
      });
      void saveMyWidgetLayout(toSave);
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

  const deleteWidget = useCallback(
    (id: string) => {
      setNodes((current) => {
        const next = current.filter((n) => n.id !== id);
        persist(next);
        return next;
      });
    },
    [persist, setNodes],
  );

  const addWidget = useCallback(
    (type: string) => {
      const defaults = NEW_WIDGET_DEFAULTS[type] ?? { width: 340, height: 320 };
      const item: WidgetLayoutItem = {
        id: `${type}-${crypto.randomUUID()}`,
        type,
        x: 60,
        y: 340,
        ...defaults,
      };
      setNodes((current) => {
        const next = [...current, buildNode(item, ctx)];
        persist(next);
        return next;
      });
    },
    [ctx, persist, setNodes],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);

      const settled = changes.some(
        (c) =>
          (c.type === "position" && c.dragging === false) ||
          (c.type === "dimensions" && c.resizing === false),
      );
      if (!settled) return;

      setNodes((current) => {
        persist(current);
        return current;
      });
    },
    [onNodesChangeInternal, persist, setNodes],
  );

  // The command-center card is pinned at canvas (0,0) — synthesized fresh
  // every render (never part of the persisted/managed node state), not
  // draggable/selectable, so it never gets moved, resized, or saved.
  const pickerNode: Node = {
    id: "add-widget-card",
    type: "picker",
    position: { x: 0, y: 0 },
    // draggable left at its default (true) — a node forced draggable:false
    // falls through to the pane's own pan-handler on mousedown instead of
    // being claimed as a node interaction, which is what made every click
    // inside it register as a canvas-pan attempt. Since this node is
    // synthesized fresh at (0,0) every render (never part of the persisted
    // `nodes` state), any accidental drag just snaps back on next render.
    selectable: false,
    width: 220,
    height: 130,
    data: { onAdd: addWidget, canWrite },
  };

  return (
    <CanvasActionsProvider value={{ updateWidgetData, deleteWidget }}>
      <ReactFlow
        nodes={[...nodes, pickerNode]}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        minZoom={0.3}
        maxZoom={1.5}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        className="bg-[#1e1f20]"
      >
        <Controls className="overflow-hidden !rounded-xl !border !border-white/[0.06]" showInteractive={false} />
        <MiniMap className="!rounded-xl !border !border-white/[0.06]" />
      </ReactFlow>
    </CanvasActionsProvider>
  );
}

export function CanvasShell(props: CanvasShellProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
