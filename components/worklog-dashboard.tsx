"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorklogBoard } from "@/components/worklog-board";
import { WorklogHeader } from "@/components/worklog-header";
import { WorklogSidebar } from "@/components/worklog-sidebar";
import type { SectionWithEntries } from "@/lib/worklog";

interface WorklogDashboardProps {
  sections: SectionWithEntries[];
}

export function WorklogDashboard({ sections }: WorklogDashboardProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#1e1f20] text-[#e8eaed] overflow-hidden font-sans">
      {/* Top Header Bar — premium centered date chip lives here */}
      <WorklogHeader onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />

      {/* Main Body: Left Sidebar + Right Horizontal Board Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <WorklogSidebar
          sections={sections}
          onRefreshSections={handleRefresh}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Horizontal Scrolling Board Main Content Area */}
        <main className="flex-1 overflow-hidden bg-[#1e1f20] flex flex-col">
          <div className="flex-1 overflow-hidden">
            <WorklogBoard initialSections={sections} onRefresh={handleRefresh} />
          </div>
        </main>
      </div>
    </div>
  );
}
