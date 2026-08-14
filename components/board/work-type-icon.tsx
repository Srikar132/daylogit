import { Bookmark, Bug, Component, SquareCheck } from "lucide-react";
import type { WorkType } from "@/lib/constants";
import { WORK_TYPES } from "@/lib/constants";

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

const WORK_TYPE_ICON: Record<WorkType, IconComponent> = {
  bug: Bug,
  feature: Component,
  story: Bookmark,
  task: SquareCheck,
};

const WORK_TYPE_COLOR: Record<WorkType, string> = Object.fromEntries(
  WORK_TYPES.map((t) => [t.value, t.color]),
) as Record<WorkType, string>;

export function getWorkTypeColor(type: string): string {
  return WORK_TYPE_COLOR[type as WorkType] ?? WORK_TYPE_COLOR.task;
}

export function WorkTypeIcon({ type, className = "h-4 w-4" }: { type: string; className?: string }) {
  const Icon = WORK_TYPE_ICON[type as WorkType] ?? WORK_TYPE_ICON.task;
  return <Icon className={className} style={{ color: getWorkTypeColor(type) }} />;
}
