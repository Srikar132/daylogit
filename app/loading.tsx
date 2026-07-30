import { TableSkeleton } from "@/components/table/skeleton";
import { CheckCircle2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#141414] text-[#e8eaed]">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/8 bg-[#141414] px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8ab4f8] text-[#141414]">
            <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="text-[17px] font-semibold text-[#e8eaed]">DayLog</span>
        </div>
        <div className="h-10 w-96 rounded-full bg-white/5 animate-pulse" />
      </header>

      {/* Main Skeleton */}
      <div className="flex flex-1">
        {/* Sidebar Skeleton */}
        <aside className="hidden w-64 shrink-0 border-r border-white/8 p-4 md:block">
          <div className="h-12 w-full rounded-full bg-white/10 animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-9 w-full rounded-full bg-white/5 animate-pulse" />
            <div className="h-9 w-full rounded-full bg-white/5 animate-pulse" />
            <div className="h-9 w-full rounded-full bg-white/5 animate-pulse" />
          </div>
        </aside>

        {/* Content Skeleton */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="h-8 w-48 rounded bg-white/10 animate-pulse" />
            <TableSkeleton rows={8} />
          </div>
        </main>
      </div>
    </div>
  );
}
