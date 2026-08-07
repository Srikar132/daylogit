import { Check } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-screen w-screen flex-col bg-[#1e1f20] text-[#e8eaed] overflow-hidden">
      {/* Header Skeleton (Matches present Navbar UI) */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#2e2f33] bg-[#1e1f20] px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex cursor-pointer items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b6ef3] text-white shadow-md">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
            <span className="text-[20px] font-medium tracking-tight text-[#e8eaed]">
              DayLog
            </span>
          </div>
        </div>

        {/* Right: Fully Rounded Today Button Skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-full bg-[#131314] border border-white/10 animate-pulse" />
        </div>
      </header>

      {/* Main Board Skeleton Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Skeleton */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#2e2f33] bg-[#1e1f20] p-4 md:flex">
          <div className="mb-4 h-4 w-16 rounded bg-white/10 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="h-4 w-4 rounded border border-white/20 bg-white/5 animate-pulse" />
                <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        </aside>

        {/* Horizontal Columns Board Skeleton */}
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">
          <div className="flex items-start gap-4">
            {[1, 2, 3].map((col) => (
              <div
                key={col}
                className="flex w-80 md:w-[355px] shrink-0 flex-col rounded-3xl bg-[#131314] p-4 border border-white/[0.06] shadow-2xl animate-pulse space-y-3"
              >
                {/* Top drag handle pill */}
                <div className="w-10 h-[3px] bg-white/10 rounded-full mx-auto mb-1" />

                {/* Section Header */}
                <div className="flex items-center justify-between pb-2">
                  <div className="h-5 w-32 rounded bg-white/10" />
                  <div className="h-4 w-4 rounded-full bg-white/10" />
                </div>

                {/* Add log button */}
                <div className="h-10 w-full rounded-full bg-[#1e1f20]" />

                {/* Log Item Skeletons */}
                <div className="space-y-2 pt-2">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-16 w-full rounded-2xl bg-[#1e1f20]/60 border border-white/[0.04]"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
