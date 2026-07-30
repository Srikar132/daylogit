"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export function TablePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateQueryParams(newParams: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams(searchParams.toString());

    if (newParams.page !== undefined) {
      params.set("page", newParams.page.toString());
    }
    if (newParams.pageSize !== undefined) {
      params.set("pageSize", newParams.pageSize.toString());
      // Reset to page 1 when page size changes
      params.set("page", "1");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-white/8 px-4 py-3 sm:flex-row text-[12.5px] text-[#9aa0a6]">
      {/* Left: Page Size Selector */}
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(val) => updateQueryParams({ pageSize: Number(val) })}
        >
          <SelectTrigger className="h-8 w-[70px] border-white/10 bg-white/5 text-[12px] text-[#e8eaed] focus:ring-[#8ab4f8]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#2d2d2d] text-[#e8eaed]">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem
                key={size}
                value={size.toString()}
                className="text-[12px] focus:bg-[#8ab4f8]/10 focus:text-[#8ab4f8]"
              >
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Center/Right: Record Range Summary & Navigation */}
      <div className="flex items-center gap-4">
        <span className="tabular-nums font-medium text-[#e8eaed]">
          {startItem}–{endItem} of {totalCount}
        </span>

        {/* Page Nav Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => updateQueryParams({ page: 1 })}
            disabled={page <= 1}
            aria-label="First page"
            className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-white/5 hover:text-[#e8eaed]"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => updateQueryParams({ page: page - 1 })}
            disabled={page <= 1}
            aria-label="Previous page"
            className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-white/5 hover:text-[#e8eaed]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => updateQueryParams({ page: page + 1 })}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-white/5 hover:text-[#e8eaed]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => updateQueryParams({ page: totalPages })}
            disabled={page >= totalPages}
            aria-label="Last page"
            className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-white/5 hover:text-[#e8eaed]"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
