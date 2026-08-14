import { useNodesState, type Node, type NodeChange } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import { AUTO_HEIGHT_MIN, buildNode, mergeWithDefaults, type WidgetNodeContext } from "@/components/canvas/widget-registry";
import { saveMyWidgetLayout } from "@/lib/actions/widgets";
import type { WidgetLayoutItem } from "@/lib/db";

/**
 * Owns the node list itself and its debounced persistence to the server —
 * everything downstream (widget CRUD, toolbar drag, paste) mutates nodes
 * through the `setNodes`/`persist` this returns rather than knowing about
 * saving at all.
 */
export function useWidgetLayout(initialLayout: WidgetLayoutItem[] | null, ctx: WidgetNodeContext) {
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

  return { nodes, setNodes, onNodesChange, persist, saveFailed };
}
