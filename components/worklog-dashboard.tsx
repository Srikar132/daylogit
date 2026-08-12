"use client";

import { CanvasShell } from "@/components/canvas/canvas-shell";
import { CanvasChrome } from "@/components/canvas/canvas-chrome";
import type { BoardColumn } from "@/lib/worklog";
import type { WidgetLayoutItem } from "@/lib/db";

interface WorklogDashboardProps {
  columns: BoardColumn[];
  canWrite: boolean;
  initialLayout: WidgetLayoutItem[] | null;
}

export function WorklogDashboard({ columns, canWrite, initialLayout }: WorklogDashboardProps) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1e1f20] text-[#e8eaed] font-sans">
      <CanvasShell initialLayout={initialLayout} columns={columns} canWrite={canWrite} />
      <CanvasChrome />
    </div>
  );
}
