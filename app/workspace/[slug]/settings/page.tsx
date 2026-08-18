import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getWorkspaceMembersData } from "@/lib/actions/members";
import { requireViewerContext } from "@/lib/workspace";
import { canDeleteWorkspace, canManageWorkspace } from "@/lib/permissions";
import { WorkspaceMembersManager } from "@/components/settings/workspace-members-manager";

// Members, invitations and the workspace name all change from other people's
// sessions, so this never caches.
export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireViewerContext();
  const data = await getWorkspaceMembersData();
  if (!data) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-1.5">
        <Link
          href={`/workspace/${slug}`}
          className="inline-flex w-fit items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {data.organizationName}
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Workspace settings</h1>
        <p className="text-[13px] text-muted-foreground">
          {canManageWorkspace(viewer.role)
            ? "Rename the workspace, invite people, and manage who has access."
            : "You have view-only access to this workspace."}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <WorkspaceMembersManager
          slug={slug}
          organizationName={data.organizationName}
          initialMembers={data.members}
          initialInvitations={data.invitations}
          canManage={canManageWorkspace(viewer.role)}
          canDelete={canDeleteWorkspace(viewer.role)}
          viewerUserId={viewer.userId}
        />
      </div>
    </main>
  );
}
