"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceMembersManager } from "@/components/settings/workspace-members-manager";
import { getWorkspaceMembersData } from "@/lib/actions/members";

export type WorkspaceMembersData = Awaited<ReturnType<typeof getWorkspaceMembersData>>;

interface WorkspaceSettingsWidgetProps {
  initialData?: WorkspaceMembersData;
}

/** Pinned widget — always present on every canvas (see canvas-shell.tsx's
 *  DEFAULT_LAYOUT), not addable/removable like board and mail-summary. The
 *  member list + invite form render directly in the card — no separate
 *  settings page. */
export function WorkspaceSettingsWidget({ initialData }: WorkspaceSettingsWidgetProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspaceMembers"],
    queryFn: () => getWorkspaceMembersData(),
    initialData,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-2/5" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center gap-1.5 p-4 text-center text-[12px] text-[#f28b82]">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Couldn&apos;t load workspace members.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4">
      <WorkspaceMembersManager
        organizationName={data.organizationName}
        initialMembers={data.members}
        initialInvitations={data.invitations}
        canManage={data.canManage}
        canDelete={data.canDelete}
        viewerUserId={data.viewerUserId}
      />
    </div>
  );
}
