import { WorkTypeIcon } from "@/components/board/work-type-icon";
import { formatDateLabel } from "@/lib/date";
import type { EntryListItem } from "@/lib/worklog";

/** The card's visual content — shared by the board's real (draggable) card
 *  and the DragOverlay ghost, so the two never drift apart. */
export function LogCardContent({ log }: { log: Pick<EntryListItem, "title" | "workType" | "dueDate"> }) {
  return (
    <>
      <span className="min-w-0 truncate text-[13px] text-[#e8eaed]">
        {log.title || "Untitled log"}
      </span>
      <div className="flex items-center gap-1.5">
        <WorkTypeIcon type={log.workType} className="h-3.5 w-3.5 shrink-0" />
        {log.dueDate && (
          <span className="text-[11px] text-[#80868b]">{formatDateLabel(log.dueDate)}</span>
        )}
      </div>
    </>
  );
}
