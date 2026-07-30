import { AlignLeft, Calendar, List, Target, Type } from "lucide-react";
import { CategoryTag } from "@/components/category-tag";
import { ProjectTag } from "@/components/project-tag";
import { CategoryDropdown } from "./category-dropdown";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { formatFullDate, formatTime } from "@/lib/date";
import type { Category, Project } from "@/lib/constants";

export const TABLE_COLUMNS = [
  { key: "summary", label: "Task / Summary", icon: Type, width: "32%" },
  { key: "category", label: "Category", icon: List, width: "16%" },
  { key: "date", label: "Date & Time", icon: Calendar, width: "16%" },
  { key: "project", label: "Project", icon: Target, width: "14%" },
  { key: "fullSummary", label: "Details", icon: AlignLeft, width: "14%" },
  { key: "actions", label: "Actions", icon: null, width: "8%" },
] as const;

export function SummaryCell({ text }: { text: string }) {
  return (
    <HoverCard>
      <HoverCardTrigger className="line-clamp-2 cursor-pointer text-[13px] leading-snug whitespace-pre-wrap break-words text-[#9aa0a6] transition-colors hover:text-[#e8eaed]">
        {text}
      </HoverCardTrigger>
      <HoverCardContent side="top" sideOffset={8} className="w-[380px] border-white/10 bg-[#2d2d2d] p-4 text-[#e8eaed] shadow-2xl">
        <div className="mb-2 flex items-center gap-1.5 border-b border-white/10 pb-2">
          <AlignLeft className="h-3.5 w-3.5 text-[#8ab4f8]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9aa0a6]">
            Full Summary
          </span>
        </div>
        <div className="max-h-60 overflow-y-auto pr-1">
          <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words text-[#c4c7c5]">
            {text}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function RenderCategories({ categories }: { categories: string[] }) {
  if (!categories || categories.length === 0) return null;

  if (categories.length === 1) {
    return <CategoryTag category={categories[0] as Category} />;
  }

  return <CategoryDropdown categories={categories} />;
}

export function RenderDate({ date, updatedAt }: { date: string; updatedAt: Date }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12.5px] font-medium tabular-nums text-[#e8eaed]">
        {formatFullDate(date)}
      </span>
      <span className="text-[10.5px] tabular-nums text-[#5f6368]">
        {formatTime(updatedAt)}
      </span>
    </div>
  );
}

export function RenderProject({ project }: { project: string }) {
  return <ProjectTag project={project as Project} />;
}
