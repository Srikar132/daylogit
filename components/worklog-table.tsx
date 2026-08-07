"use client";

import type { EntryRow } from "@/lib/worklog";

export function WorklogTable({ entries }: { entries: EntryRow[] }) {
  return (
    <div className="p-4 text-[13px] text-[#9aa0a6]">
      {entries.length} log entries
    </div>
  );
}
