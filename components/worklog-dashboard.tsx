"use client";

import { useState } from "react";
import { EditEntryModal } from "@/components/edit-entry-modal";
import { WorklogDataTable } from "@/components/table/data-table";
import { WorklogHeader } from "@/components/worklog-header";
import { WorklogSidebar } from "@/components/worklog-sidebar";
import type { EntryRow } from "@/lib/worklog";

interface WorklogDashboardProps {
  entries: EntryRow[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  currentProject?: string;
  isToday?: boolean;
  currentDate?: string;
}

export function WorklogDashboard({
  entries,
  totalCount,
  totalPages,
  page,
  pageSize,
  currentProject,
  isToday,
  currentDate,
}: WorklogDashboardProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#141414] text-[#e8eaed]">
      {/* Top Bar Header */}
      <WorklogHeader
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <WorklogSidebar
          onOpenCreate={() => setIsCreateOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-4">
            {/* Title / Summary Banner (No underline border) */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[20px] font-bold tracking-tight text-[#e8eaed]">
                  {currentDate
                    ? `Logs for ${currentDate}`
                    : isToday
                    ? "Today's Work Log"
                    : currentProject && currentProject !== "all"
                    ? `${currentProject} Logs`
                    : "All Work Logs"}
                </h1>
                <p className="text-[12px] text-[#9aa0a6]">
                  {totalCount > 0
                    ? `Showing ${totalCount} recorded task log${totalCount === 1 ? "" : "s"}`
                    : "No logs found"}
                </p>
              </div>
            </div>

            {/* Paginated Server-Side Data Table */}
            <WorklogDataTable
              entries={entries}
              totalCount={totalCount}
              totalPages={totalPages}
              page={page}
              pageSize={pageSize}
              onOpenCreate={() => setIsCreateOpen(true)}
            />
          </div>
        </main>
      </div>

      {/* Create Modal */}
      <EditEntryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
