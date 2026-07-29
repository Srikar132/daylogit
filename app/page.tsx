import { WorklogTable } from "@/components/worklog-table";
import { getRecentEntries } from "@/lib/worklog";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await getRecentEntries();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
      {/* ── Page header ── */}
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8ab4f8]/10">
          <ClipboardList className="h-4 w-4 text-[#8ab4f8]" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-[#e8eaed]">
            Worklog
          </h1>
          <p className="text-[11px] text-[#5f6368]">
            {entries.length > 0
              ? `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`
              : "No entries yet"}
          </p>
        </div>
      </header>

      <WorklogTable entries={entries} />
    </div>
  );
}
