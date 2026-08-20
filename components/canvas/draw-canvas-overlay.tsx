"use client";

import { useReactFlow, ViewportPortal } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { useCanvasMode } from "@/components/canvas/canvas-mode-context";
import {
  getCenterlineSvgPath,
  isPointNearStroke,
  simplifyStrokePoints,
  type Point,
  type Stroke,
} from "@/lib/canvas/stroke-utils";

interface LaserStroke {
  points: { x: number; y: number }[];
}

export function DrawCanvasOverlay() {
  const { mode, activeTool, strokeColor, strokeWidth } = useCanvasMode();
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();
  const { widgets, addWidget, updateWidgetData, pushDrawHistory } =
    useCanvasActions() as any;

  const [activePoints, setActivePoints] = useState<Point[]>([]);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const activePointsRef = useRef<Point[]>([]);
  const laserCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Laser session tracking
  const laserStrokesRef = useRef<LaserStroke[]>([]);
  const activeLaserStrokeRef = useRef<LaserStroke | null>(null);
  const laserReleasedAtRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isActiveMode = mode === "draw" || mode === "laser";

  // Find saved strokes from draw widget
  const drawWidget = widgets.find((w: any) => w.type === "draw");
  const savedStrokes = (drawWidget?.data?.strokes as Stroke[]) ?? [];

  // Spacebar panning listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !e.repeat) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        setIsSpacePressed(true);
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Smooth mouse wheel / trackpad scrolling in draw & laser modes
  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    const { x, y, zoom } = getViewport();
    if (e.ctrlKey || e.metaKey) {
      // Zoom canvas
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      setViewport({ x, y, zoom: Math.min(1.5, Math.max(0.3, zoom * zoomFactor)) });
    } else {
      // Pan canvas up/down/left/right seamlessly while drawing
      setViewport({ x: x - e.deltaX, y: y - e.deltaY, zoom });
    }
  }

  // 2-Finger Touch Gestures for Mobile Panning & Pinch-Zoom
  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      // Cancel active 1-finger drawing when 2 fingers touch mobile screen
      isDrawingRef.current = false;
      activePointsRef.current = [];
      setActivePoints([]);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      touchStartRef.current = { dist, center };
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

      const dx = center.x - touchStartRef.current.center.x;
      const dy = center.y - touchStartRef.current.center.y;
      const scale = dist / (touchStartRef.current.dist || 1);

      const { x, y, zoom } = getViewport();
      const newZoom = Math.min(1.5, Math.max(0.3, zoom * scale));

      setViewport({
        x: x + dx,
        y: y + dy,
        zoom: newZoom,
      });

      touchStartRef.current = { dist, center };
    }
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length < 2) {
      touchStartRef.current = null;
    }
  }

  // 100% Reliable Line-Segment Hit Eraser
  function eraseNearPoint(clientX: number, clientY: number) {
    if (!drawWidget || savedStrokes.length === 0) return;
    const canvasPos = screenToFlowPosition({ x: clientX, y: clientY });
    const hits = savedStrokes.filter((s) => isPointNearStroke(canvasPos, s, 28));
    if (hits.length > 0) {
      const hitIds = new Set(hits.map((h) => h.id));
      const remaining = savedStrokes.filter((s) => !hitIds.has(s.id));
      if (pushDrawHistory) pushDrawHistory(savedStrokes);
      updateWidgetData(drawWidget.id, { strokes: remaining });
    }
  }

  // Laser Pointer Animation Loop
  useEffect(() => {
    if (mode !== "laser") {
      laserStrokesRef.current = [];
      activeLaserStrokeRef.current = null;
      laserReleasedAtRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let running = true;

    function renderLaser() {
      if (!running) return;
      const canvas = laserCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = window.innerWidth;
          const height = window.innerHeight;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          ctx.clearRect(0, 0, width, height);

          const now = Date.now();
          const releasedAt = laserReleasedAtRef.current;

          let alpha = 1.0;
          if (releasedAt !== null) {
            const elapsed = now - releasedAt;
            if (elapsed < 1000) {
              alpha = 1.0; // Entire laser text stays 100% visible together for 1 full second
            } else {
              alpha = Math.max(0, 1 - (elapsed - 1000) / 350); // Entire laser text fades out together
            }
            if (elapsed >= 1350) {
              laserStrokesRef.current = [];
              laserReleasedAtRef.current = null;
            }
          }

          if (alpha > 0 && laserStrokesRef.current.length > 0) {
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#FF2D2D";
            ctx.strokeStyle = `rgba(255, 45, 45, ${alpha.toFixed(2)})`;
            ctx.lineWidth = 5;

            for (const stroke of laserStrokesRef.current) {
              const pts = stroke.points;
              if (pts.length < 2) continue;

              ctx.beginPath();
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length - 1; i++) {
                const xc = (pts[i].x + pts[i + 1].x) / 2;
                const yc = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
              }
              ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
              ctx.stroke();
            }

            ctx.restore();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLaser);
    }

    animFrameRef.current = requestAnimationFrame(renderLaser);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isActiveMode) return;

    // Spacebar + drag OR Middle mouse button -> Pan canvas
    if (isSpacePressed || e.button === 1) {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (mode === "draw" && activeTool === "eraser") {
      eraseNearPoint(e.clientX, e.clientY);
      isDrawingRef.current = true;
      return;
    }

    isDrawingRef.current = true;

    if (mode === "laser") {
      laserReleasedAtRef.current = null;
      const newStroke: LaserStroke = { points: [{ x: e.clientX, y: e.clientY }] };
      activeLaserStrokeRef.current = newStroke;
      laserStrokesRef.current.push(newStroke);
    } else {
      const canvasPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const point: Point = {
        x: canvasPos.x,
        y: canvasPos.y,
        pressure: e.pressure || 0.5,
      };
      activePointsRef.current = [point];
      setActivePoints([point]);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isActiveMode) return;

    // Pan canvas while Spacebar or Middle Mouse is held
    if (isPanningRef.current && lastPanPosRef.current) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      const { x, y, zoom } = getViewport();
      setViewport({ x: x + dx, y: y + dy, zoom });
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (mode === "laser") {
      if (isDrawingRef.current && activeLaserStrokeRef.current) {
        activeLaserStrokeRef.current.points.push({
          x: e.clientX,
          y: e.clientY,
        });
      }
      return;
    }

    if (!isDrawingRef.current) return;

    if (activeTool === "eraser") {
      eraseNearPoint(e.clientX, e.clientY);
      return;
    }

    const canvasPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const point: Point = {
      x: canvasPos.x,
      y: canvasPos.y,
      pressure: e.pressure || 0.5,
    };

    activePointsRef.current.push(point);
    setActivePoints([...activePointsRef.current]);
  }

  function handlePointerUp() {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastPanPosRef.current = null;
      return;
    }

    isDrawingRef.current = false;

    if (mode === "laser") {
      activeLaserStrokeRef.current = null;
      laserReleasedAtRef.current = Date.now();
      return;
    }

    if (activeTool === "eraser") return;

    const rawPoints = activePointsRef.current;
    activePointsRef.current = [];
    setActivePoints([]);

    if (rawPoints.length < 2) return;

    const simplifiedPoints = simplifyStrokePoints(rawPoints);

    const newStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tool: activeTool as "pen" | "highlighter",
      color: strokeColor,
      size: strokeWidth,
      points: simplifiedPoints,
    };

    if (drawWidget) {
      const existingStrokes = (drawWidget.data?.strokes as Stroke[]) ?? [];
      if (pushDrawHistory) pushDrawHistory(existingStrokes);
      updateWidgetData(drawWidget.id, {
        strokes: [...existingStrokes, newStroke],
      });
    } else {
      if (pushDrawHistory) pushDrawHistory([]);
      addWidget("draw", { x: 0, y: 0 }, { strokes: [newStroke] });
    }
  }

  // Active stroke preview object
  const currentPreviewStroke: Stroke | null =
    activePoints.length > 0
      ? {
          id: "preview",
          tool: activeTool === "eraser" ? "pen" : (activeTool as "pen" | "highlighter"),
          color: strokeColor,
          size: strokeWidth,
          points: activePoints,
        }
      : null;

  let cursorClass = "cursor-crosshair";
  if (isSpacePressed || isPanningRef.current) {
    cursorClass = "cursor-grab active:cursor-grabbing";
  } else if (mode === "laser") {
    cursorClass = "cursor-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%3E%3Ccircle%20cx%3D%228%22%20cy%3D%228%22%20r%3D%226%22%20fill%3D%22%23ff2d2d%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E')_8_8,auto]";
  } else if (activeTool === "pen") {
    cursorClass = "cursor-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M17%203a2.85%202.83%200%201%201%204%204L7.5%2020.5%202%2022l1.5-5.5Z%22%2F%3E%3Cpath%20d%3D%22m15%205%204%204%22%2F%3E%3C%2Fsvg%3E')_2_22,auto]";
  } else if (activeTool === "highlighter") {
    cursorClass = "cursor-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23f7ce15%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m9%2011-6%206v3h3l6-6%22%2F%3E%3Cpath%20d%3D%22m22%2012-4.6%204.6a2%202%200%200%201-2.8%200l-5.2-5.2a2%202%200%200%201%200-2.8L14%204%22%2F%3E%3C%2Fsvg%3E')_3_21,auto]";
  } else if (activeTool === "eraser") {
    cursorClass = "cursor-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%2327272a%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m7%2021-4.3-4.3a1%201%200%200%201%200-1.4l9.6-9.6a1%201%200%200%201%201.4%200l4.3%204.3a1%201%200%200%201%200-1.4L8.4%2021A1%201%200%200%201%207%2021Z%22%2F%3E%3Cpath%20d%3D%22m22%2021-12%200%22%2F%3E%3C%2Fsvg%3E')_4_20,auto]";
  }

  const isEraserActive = mode === "draw" && activeTool === "eraser";

  return (
    <>
      {/* Interactive Overlay for Gestures & Touch Navigation */}
      {isActiveMode && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ touchAction: "none" }}
          className={`absolute inset-0 z-10 ${cursorClass}`}
        >
          {/* Laser Pointer Canvas (Screen Coordinates) */}
          {mode === "laser" && (
            <canvas
              ref={laserCanvasRef}
              className="fixed inset-0 pointer-events-none z-30"
            />
          )}
        </div>
      )}

      {/* Board-wide Drawing Layer (Committed + Live Preview inside ViewportPortal) */}
      <ViewportPortal>
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-20">
          {/* Committed Saved Strokes */}
          {savedStrokes.map((stroke) => {
            const pathD = getCenterlineSvgPath(stroke.points);
            const isHighlighter = stroke.tool === "highlighter";
            const strokeWidthVal = isHighlighter ? stroke.size * 2.5 : stroke.size;

            return (
              <path
                key={stroke.id}
                d={pathD}
                fill="none"
                stroke={stroke.color}
                strokeWidth={strokeWidthVal}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isHighlighter ? 0.45 : 1.0}
                style={{
                  mixBlendMode: isHighlighter ? "multiply" : "normal",
                  cursor: isEraserActive ? "pointer" : "default",
                }}
              />
            );
          })}

          {/* Active Live Drawing Preview Stroke */}
          {mode === "draw" && currentPreviewStroke && (
            <path
              d={getCenterlineSvgPath(currentPreviewStroke.points)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={activeTool === "highlighter" ? strokeWidth * 2.5 : strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={activeTool === "highlighter" ? 0.45 : 1.0}
            />
          )}
        </svg>
      </ViewportPortal>
    </>
  );
}
