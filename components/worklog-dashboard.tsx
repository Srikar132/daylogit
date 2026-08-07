"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorklogBoard } from "@/components/worklog-board";
import { WorklogHeader } from "@/components/worklog-header";
import { WorklogSidebar } from "@/components/worklog-sidebar";
import type { SectionRow, SectionWithEntries } from "@/lib/worklog";

interface WorklogDashboardProps {
  sections: SectionWithEntries[];
  allSectionList: SectionRow[];
  isToday?: boolean;
  currentDate?: string;
}

export function WorklogDashboard({
  sections,
  allSectionList,
  isToday,
  currentDate,
}: WorklogDashboardProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Default all section names selected
  const [selectedSectionNames, setSelectedSectionNames] = useState<string[]>(
    allSectionList.map((s) => s.name),
  );

  function handleToggleSectionName(name: string) {
    setSelectedSectionNames((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name],
    );
  }

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#1e1f20] text-[#e8eaed] overflow-hidden font-sans">
      {/* Top Google Tasks Header Bar */}
      <WorklogHeader
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Body: Left Sidebar + Right Horizontal Board Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <WorklogSidebar
          allSections={allSectionList}
          selectedSectionNames={selectedSectionNames}
          onToggleSectionName={handleToggleSectionName}
          onRefreshSections={handleRefresh}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Horizontal Scrolling Board Main Content Area */}
        <main className="flex-1 overflow-hidden bg-[#1e1f20] flex flex-col">
          {(isToday || currentDate) && (
            <div className="px-6 pt-4 pb-0 flex items-center justify-between">
              <div>
                <h1 className="text-[20px] font-medium text-[#e8eaed]">
                  {isToday ? "Today's Logs" : `Logs for ${currentDate}`}
                </h1>
                <p className="text-[12px] text-[#9aa0a6]">
                  Viewing work logs filtered by date
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <WorklogBoard
              initialSections={sections}
              visibleSectionNames={
                isToday || currentDate
                  ? undefined // show all relevant sections for date
                  : selectedSectionNames
              }
              onRefresh={handleRefresh}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
