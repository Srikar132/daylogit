import type { Node } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { AUTO_HEIGHT_MIN, NEW_WIDGET_DEFAULTS, buildNode, type WidgetNodeContext } from "@/components/canvas/widget-registry";
import { createWidgetAction, deleteWidgetAction, updateWidgetDataAction, updateWidgetSizeAction } from "@/lib/actions/widgets";
import { unwrapAction } from "@/lib/query-utils";
import type { WidgetLayoutItem } from "@/lib/db";

interface UseWidgetActionsArgs {
  ctx: WidgetNodeContext;
  setNodes: (updater: (current: Node[]) => Node[]) => void;
}

/**
 * Widget CRUD — everything CanvasActionsProvider hands to individual widgets
 * (update/delete/resize/pending-file) plus `addWidget`, used by the toolbar-
 * drag and paste hooks to actually create new nodes. Each call here writes
 * exactly the one widget row it touches — no shared array to rewrite.
 */
export function useWidgetActions({ ctx, setNodes }: UseWidgetActionsArgs) {
  const updateDataMutation = useMutation({
    mutationFn: (input: { id: string; widgetData: Record<string, unknown> }) =>
      unwrapAction(updateWidgetDataAction(input.id, input.widgetData)),
    onError: (err) => console.error("Failed to save widget data:", err),
  });

  const updateWidgetData = useCallback(
    (id: string, widgetData: Record<string, unknown>) => {
      setNodes((current) => current.map((n) => (n.id === id ? { ...n, data: { ...n.data, widgetData } } : n)));
      updateDataMutation.mutate({ id, widgetData });
    },
    [setNodes, updateDataMutation],
  );

  const resizeMutation = useMutation({
    mutationFn: (input: { id: string; width: number; height: number }) => unwrapAction(updateWidgetSizeAction(input)),
    onError: (err) => console.error("Failed to save widget size:", err),
  });

  const resizeWidget = useCallback(
    (id: string, size: { width: number; height: number }) => {
      setNodes((current) => current.map((n) => (n.id === id ? { ...n, width: size.width, height: size.height } : n)));
      resizeMutation.mutate({ id, ...size });
    },
    [setNodes, resizeMutation],
  );

  // Ephemeral interaction state, not persisted — WidgetNode drives this
  // directly off its own selected/entered state (idle -> selected arms the
  // card for a repositioning drag; interactive locks it again).
  const setWidgetDraggable = useCallback(
    (id: string, draggable: boolean) => {
      setNodes((current) =>
        current.map((n) => (n.id === id && n.draggable !== draggable ? { ...n, draggable } : n)),
      );
    },
    [setNodes],
  );

  // `useReactFlow().updateNode()` writes through xyflow's internal batch
  // queue, which gets clobbered back to stale by our own controlled `nodes`
  // prop on the next render — deselecting has to go through the same
  // `setNodes` pipeline as every other node-array write in this file.
  const setWidgetSelected = useCallback(
    (id: string, selected: boolean) => {
      setNodes((current) =>
        current.map((n) => (n.id === id && n.selected !== selected ? { ...n, selected } : n)),
      );
    },
    [setNodes],
  );

  // Pending uploads live only in memory — a raw File can't be persisted.
  // Keyed by the widget id it belongs to.
  const pendingFiles = useRef<Map<string, File>>(new Map());
  const getPendingFile = useCallback((id: string) => pendingFiles.current.get(id), []);
  const clearPendingFile = useCallback((id: string) => {
    pendingFiles.current.delete(id);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteWidgetAction(id)),
    onError: (err) => console.error("Failed to delete widget:", err),
  });

  const deleteWidget = useCallback(
    (id: string) => {
      pendingFiles.current.delete(id);
      setNodes((current) => current.filter((n) => n.id !== id));
      deleteMutation.mutate(id);
    },
    [setNodes, deleteMutation],
  );

  const createMutation = useMutation({
    mutationFn: (item: WidgetLayoutItem) => unwrapAction(createWidgetAction(item)),
    onError: (err, item) => {
      console.error("Failed to create widget:", err);
      // The optimistic node never made it to the server — pull it back out
      // rather than leaving a widget on the canvas that doesn't exist in
      // the DB and will vanish on next reload with no explanation.
      setNodes((current) => current.filter((n) => n.id !== item.id));
    },
  });

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
      setNodes((current) => [...current, buildNode(item, ctx)]);
      createMutation.mutate(item);
      return item.id;
    },
    [ctx, setNodes, createMutation],
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

  return {
    updateWidgetData,
    deleteWidget,
    resizeWidget,
    setWidgetDraggable,
    setWidgetSelected,
    addWidget,
    addMediaFiles,
    getPendingFile,
    clearPendingFile,
  };
}
