import Image from "next/image";
import { Plus } from "lucide-react";
import {
  TABLE_COLUMNS,
  RenderCategories,
  RenderDate,
  RenderProject,
  SummaryCell,
} from "./columns";
import { RowActions } from "./actions";
import { TablePagination } from "./pagination";
import type { EntryRow } from "@/lib/worklog";

interface WorklogDataTableProps {
  entries: EntryRow[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  onOpenCreate?: () => void;
}

export function WorklogDataTable({
  entries,
  totalCount,
  totalPages,
  page,
  pageSize,
  onOpenCreate,
}: WorklogDataTableProps) {
  const hasData = entries.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Elevated Card Container */}
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-2xl transition-all">
        {/* Scrollable Table Area */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            {/* Table Column Header */}
            <thead>
              <tr className="border-b border-white/10 bg-[#181818]">
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#9aa0a6] select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.icon && <col.icon className="h-3.5 w-3.5 text-[#8ab4f8]" />}
                      <span>{col.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {hasData ? (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
                  >
                    {/* Summary / Task Preview */}
                    <td className="px-4 py-3.5 align-top">
                      <span className="text-[13px] font-medium leading-snug text-[#e8eaed]">
                        {entry.project} — {entry.summary.length > 50 ? `${entry.summary.slice(0, 50)}…` : entry.summary}
                      </span>
                    </td>

                    {/* Category Badges */}
                    <td className="px-4 py-3.5 align-top">
                      <RenderCategories categories={entry.category} />
                    </td>

                    {/* Date & Updated Time */}
                    <td className="px-4 py-3.5 align-top">
                      <RenderDate date={entry.date} updatedAt={entry.updatedAt} />
                    </td>

                    {/* Project Tag */}
                    <td className="px-4 py-3.5 align-top">
                      <RenderProject project={entry.project} />
                    </td>

                    {/* Full Summary Hover */}
                    <td className="px-4 py-3.5 align-top">
                      <SummaryCell text={entry.summary} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 align-top text-right">
                      <RowActions entry={entry} />
                    </td>
                  </tr>
                ))
              ) : (
                /* Google Empty State */
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#8ab4f8]/5 p-4">
                        <Image
                          src="/empty-state.png"
                          alt="No entries"
                          width={100}
                          height={75}
                          className="opacity-75"
                        />
                      </div>
                      <div className="max-w-xs space-y-1">
                        <p className="text-[14.5px] font-semibold text-[#e8eaed]">
                          No work logs found
                        </p>
                        <p className="text-[12px] leading-relaxed text-[#9aa0a6]">
                          Keep track of your accomplishments across projects by adding your first entry.
                        </p>
                      </div>
                      {onOpenCreate && (
                        <button
                          type="button"
                          onClick={onOpenCreate}
                          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#8ab4f8] px-4 py-2 text-[12.5px] font-semibold text-[#141414] transition-transform hover:scale-[1.02] active:scale-95 shadow-md"
                        >
                          <Plus className="h-4 w-4" />
                          Log Your First Task
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination Controls */}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
