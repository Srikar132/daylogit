import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";

interface UseToolbarDragArgs {
  addWidget: (type: string, dropPoint?: { x: number; y: number }) => string;
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number };
}

/**
 * The widget-toolbar's own drag-to-add flow — a separate DndContext scoped
 * just to this drag (see canvas-shell.tsx: the toolbar lives entirely
 * outside react-flow's pane/viewport, so this never touches react-flow's
 * own nodrag/nopan/draggable-node machinery).
 */
export function useToolbarDrag({ addWidget, screenToFlowPosition }: UseToolbarDragArgs) {
  const [draggingType, setDraggingType] = useState<string | null>(null);

  // Mouse and touch are deliberately separate sensors, with NO PointerSensor.
  // PointerSensor handles both, and because `pointerdown` fires before
  // `touchstart` it always won on a touch device — so TouchSensor's delay never
  // applied, and a 4px-distance activation lost every time to the toolbar's own
  // vertical scrolling, which is why dragging a widget out never worked on a
  // phone. Split apart, each input gets the activation that suits it:
  // - mouse: a short distance, so a click stays a click
  // - touch: press-and-hold, with a movement tolerance that aborts activation.
  //   That tolerance is what keeps the toolbar scrollable — a swipe moves past
  //   it before the delay elapses and stays a scroll, while a stationary press
  //   becomes a drag.
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
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

  return { dndSensors, draggingType, handleDragStart, handleDragEnd };
}
