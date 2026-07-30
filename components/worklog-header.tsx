"use client";

import { CheckCircle2, Menu, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface WorklogHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function WorklogHeader({ onToggleMobileSidebar }: WorklogHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [, startTransition] = useTransition();

  function handleSearchChange(value: string) {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
        params.set("page", "1");
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearSearch() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/8 bg-[#141414]/90 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Menu + Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation"
          className="rounded-full p-2 text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#e8eaed] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8ab4f8] text-[#141414] shadow-md">
            <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-[#e8eaed]">
            DayLog
          </span>
        </div>
      </div>

      {/* Center: Universal Search Input */}
      <div className="ml-4 flex flex-1 max-w-xl items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa0a6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by keyword, date (e.g. 30, 29, Jul), or project..."
            className="h-10 w-full rounded-full border border-transparent bg-white/5 pl-10 pr-9 text-[13px] text-[#e8eaed] placeholder:text-[#5f6368] transition-all focus:border-[#8ab4f8]/30 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#e8eaed]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
