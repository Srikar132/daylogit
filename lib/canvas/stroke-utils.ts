import simplify from "simplify-js";

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type DrawTool = "pen" | "highlighter" | "eraser";

export interface Stroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: Point[];
}

/**
 * 1. Straight Line Snapping (Underlines, Dividers, Connectors)
 */
export function isStraightLine(points: Point[]): boolean {
  if (points.length < 4) return false;
  const start = points[0];
  const end = points[points.length - 1];
  const straightDist = Math.hypot(end.x - start.x, end.y - start.y);
  if (straightDist < 35) return false;

  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalLen += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }

  return straightDist / totalLen > 0.88;
}

/**
 * 2. Square & Rectangle Detection (Requires 4 distinct corner turns)
 */
export function isRectangleOrSquare(points: Point[]): boolean {
  if (points.length < 12) return false;

  const start = points[0];
  const end = points[points.length - 1];
  const endDist = Math.hypot(end.x - start.x, end.y - start.y);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.hypot(width, height);
  if (width < 30 || height < 30) return false;

  // Must close loop (end point near start point)
  if (endDist / diagonal > 0.35) return false;

  // Detect distinct 90-degree corner turns
  let cornerCount = 0;
  const step = Math.max(2, Math.floor(points.length / 14));
  for (let i = step; i < points.length - step; i += step) {
    const p1 = points[i - step];
    const p2 = points[i];
    const p3 = points[Math.min(points.length - 1, i + step)];

    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);

    if (mag1 > 4 && mag2 > 4) {
      const dot = v1.x * v2.x + v1.y * v2.y;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
      // Turning angle between 55° and 125°
      if (angle > (55 * Math.PI) / 180 && angle < (125 * Math.PI) / 180) {
        cornerCount++;
      }
    }
  }

  return cornerCount >= 3;
}

/**
 * 3. Circle / Ellipse Detection (Smooth loop without sharp corners)
 */
export function isCircleOrEllipse(points: Point[]): boolean {
  if (points.length < 12) return false;

  const start = points[0];
  const end = points[points.length - 1];
  const endDist = Math.hypot(end.x - start.x, end.y - start.y);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.hypot(width, height);
  if (width < 35 || height < 35) return false;

  // Must close loop tightly
  if (endDist / diagonal > 0.25) return false;

  // Check area fill (circle area / bounding box ≈ 0.785)
  let polygonArea = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    polygonArea += points[i].x * points[j].y;
    polygonArea -= points[j].x * points[i].y;
  }
  polygonArea = Math.abs(polygonArea) / 2;

  const areaRatio = polygonArea / (width * height);
  return areaRatio >= 0.65 && areaRatio <= 0.88;
}

/**
 * Generates perfect equal square or rectangle points with laser-straight 90° edges.
 */
export function generatePerfectRectanglePoints(points: Point[]): Point[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const aspectRatio = width / height;

  // If aspect ratio is close to 1.0 (between 0.82 and 1.22), snap to a 100% PERFECT EQUAL SQUARE
  if (aspectRatio >= 0.82 && aspectRatio <= 1.22) {
    const side = Math.max(width, height);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const half = side / 2;
    return [
      { x: Math.round(cx - half), y: Math.round(cy - half) },
      { x: Math.round(cx + half), y: Math.round(cy - half) },
      { x: Math.round(cx + half), y: Math.round(cy + half) },
      { x: Math.round(cx - half), y: Math.round(cy + half) },
      { x: Math.round(cx - half), y: Math.round(cy - half) },
    ];
  }

  // Otherwise snap to a 100% PERFECT RECTANGLE
  return [
    { x: Math.round(minX), y: Math.round(minY) },
    { x: Math.round(maxX), y: Math.round(minY) },
    { x: Math.round(maxX), y: Math.round(maxY) },
    { x: Math.round(minX), y: Math.round(maxY) },
    { x: Math.round(minX), y: Math.round(minY) },
  ];
}

/**
 * Generates perfect ellipse points for auto-perfected circles/ellipses.
 */
export function generatePerfectEllipsePoints(points: Point[], numPoints = 24): Point[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;

  const ellipsePoints: Point[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * Math.PI * 2;
    ellipsePoints.push({
      x: Math.round((cx + rx * Math.cos(theta)) * 10) / 10,
      y: Math.round((cy + ry * Math.sin(theta)) * 10) / 10,
    });
  }
  return ellipsePoints;
}

/**
 * Auto-perfects shaky hand drawings into clean Whimsical shapes (straight lines, squares, rectangles, circles, smoothed curves).
 */
export function perfectStrokePoints(points: Point[]): Point[] {
  if (points.length <= 3) return points;

  // 1. Straight line check (underlines, dividers, lines)
  if (isStraightLine(points)) {
    const start = points[0];
    const end = points[points.length - 1];
    return [start, end];
  }

  // 2. Square & Rectangle check (snaps to perfect equal square or 90° rectangle)
  if (isRectangleOrSquare(points)) {
    return generatePerfectRectanglePoints(points);
  }

  // 3. Circle / ellipse check
  if (isCircleOrEllipse(points)) {
    return generatePerfectEllipsePoints(points);
  }

  // 4. General curve smoothing: Douglas-Peucker simplification for natural handwriting
  const simplified = simplify(
    points.map((p) => ({ x: p.x, y: p.y })),
    1.2,
    true,
  );

  return simplified.map((p, i) => ({
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10,
    pressure: points[i]?.pressure ?? 0.5,
  }));
}

/**
 * Alias for backward compatibility
 */
export const simplifyStrokePoints = perfectStrokePoints;

/**
 * Generates Whimsical-style smooth quadratic bezier curves through stroke points.
 */
export function getCenterlineSvgPath(points: Point[]): string {
  if (!points || points.length === 0) return "";
  if (points.length === 1) {
    const { x, y } = points[0];
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

/**
 * Calculates squared distance from point p to line segment (v, w).
 */
function distanceToSegmentSquared(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number },
): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}

/**
 * Distance check from point (x, y) to any line segment in a stroke.
 */
export function isPointNearStroke(
  point: { x: number; y: number },
  stroke: Stroke,
  threshold = 24,
): boolean {
  const radius = Math.max(threshold, stroke.size + 12);
  const radiusSq = radius * radius;

  if (!stroke.points || stroke.points.length === 0) return false;
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    return (p.x - point.x) ** 2 + (p.y - point.y) ** 2 <= radiusSq;
  }

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const distSq = distanceToSegmentSquared(point, stroke.points[i], stroke.points[i + 1]);
    if (distSq <= radiusSq) return true;
  }

  return false;
}
