import { useNodesState, type Node, type NodeChange } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { WIDGET_SAVE_RETRY, type SaveStatus } from "@/components/canvas/hooks/use-save-status";
import { buildNode, type WidgetNodeContext } from "@/components/canvas/widget-registry";
import { updateWidgetPositionAction, updateWidgetSizeAction } from "@/lib/actions/widgets";
import { unwrapAction } from "@/lib/query-utils";
import type { WidgetLayoutItem } from "@/lib/db";

const SAVE_DEBOUNCE_MS = 500;

/**
 * Owns the node list itself and its debounced per-widget persistence to the
 * server. Each widget is its own DB row now (see `widgets` table) — moving
 * or resizing widget A only ever writes widget A's row, unlike the old
 * one-JSONB-blob-per-user design where any single change rewrote every
 * widget's data back to the server.
 */
export function useWidgetLayout(
  initialLayout: WidgetLayoutItem[],
  ctx: WidgetNodeContext,
  { reportSaveFailed, reportSaveSucceeded }: SaveStatus,
) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node>(
    initialLayout.map((item) => buildNode(item, ctx)),
  );

// Only `mutate` is destructured, deliberately: useMutation returns a NEW result
// object on every render, so a callback listing the whole mutation in its deps
// changed identity every render. That is invisible until such a callback lands in
// an effect's dependency array, where it produces an endless
// effect -> setState -> render -> effect loop. `mutate` is referentially stable,
// and naming it here keeps exhaustive-deps satisfied without reintroducing that.
  // One retry (react-query's built-in retry/retryDelay) absorbs a blip; if
  // it still fails after that, surface it instead of pretending it saved —
  // the edit would otherwise vanish silently on next reload.
  const { mutate: savePosition } = useMutation({
    ...WIDGET_SAVE_RETRY,
    mutationFn: (input: { id: string; x: number; y: number }) => unwrapAction(updateWidgetPositionAction(input)),
    onError: (err) => {
      console.error("Failed to save widget position:", err);
      reportSaveFailed();
    },
    onSuccess: reportSaveSucceeded,
  });

  const { mutate: saveSize } = useMutation({
    ...WIDGET_SAVE_RETRY,
    mutationFn: (input: { id: string; width: number; height: number }) => unwrapAction(updateWidgetSizeAction(input)),
    onError: (err) => {
      console.error("Failed to save widget size:", err);
      reportSaveFailed();
    },
    onSuccess: reportSaveSucceeded,
  });

  // One debounce timer per widget id — dragging several widgets around
  // (rare, but possible via a marquee-select) debounces each independently
  // rather than one shared timer coalescing unrelated widgets' saves.
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const scheduleSave = useCallback((id: string, run: () => void) => {
    const timers = saveTimers.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        run();
      }, SAVE_DEBOUNCE_MS),
    );
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);

      for (const c of changes) {
        if (c.type === "position" && c.dragging === false && c.position) {
          const { x, y } = c.position;
          scheduleSave(c.id, () => savePosition({ id: c.id, x: Math.round(x), y: Math.round(y) }));
        }
        if (c.type === "dimensions" && c.resizing === false && c.dimensions) {
          const { width, height } = c.dimensions;
          scheduleSave(c.id, () =>
            saveSize({ id: c.id, width: Math.round(width), height: Math.round(height) }),
          );
        }
      }
    },
    [onNodesChangeInternal, scheduleSave, savePosition, saveSize],
  );

  return { nodes, setNodes, onNodesChange };
}
