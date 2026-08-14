import type { Node } from "@xyflow/react";
import { useCallback, useRef } from "react";
import { AUTO_HEIGHT_MIN, NEW_WIDGET_DEFAULTS, buildNode, type WidgetNodeContext } from "@/components/canvas/widget-registry";
import type { WidgetLayoutItem } from "@/lib/db";

interface UseWidgetActionsArgs {
  ctx: WidgetNodeContext;
  setNodes: (updater: (current: Node[]) => Node[]) => void;
  persist: (current: Node[]) => void;
}

/**
 * Widget CRUD — everything CanvasActionsProvider hands to individual widgets
 * (update/delete/resize/pending-file) plus `addWidget`, used by the toolbar-
 * drag and paste hooks to actually create new nodes.
 */
export function useWidgetActions({ ctx, setNodes, persist }: UseWidgetActionsArgs) {
  const updateWidgetData = useCallback(
    (id: string, widgetData: Record<string, unknown>) => {
      setNodes((current) => {
        const next = current.map((n) => (n.id === id ? { ...n, data: { ...n.data, widgetData } } : n));
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

  return { updateWidgetData, deleteWidget, resizeWidget, addWidget, addMediaFiles, getPendingFile, clearPendingFile };
}
