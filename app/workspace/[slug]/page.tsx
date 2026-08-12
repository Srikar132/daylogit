import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/better-auth";
import { WorklogDashboard } from "@/components/worklog-dashboard";
import { getBoardData } from "@/lib/worklog";
import { todayIST } from "@/lib/date";
import { requireViewerContext } from "@/lib/workspace";
import { getMyWidgetLayout } from "@/lib/actions/widgets";

export const dynamic = "force-dynamic";

interface WorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { slug } = await params;
  const reqHeaders = await headers();

  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({ headers: reqHeaders });
  const org = organizations.find((o) => o.slug === slug);
  if (!org) {
    // Either it doesn't exist or this user isn't a member — either way,
    // back to the list rather than a dead end.
    redirect("/workspaces");
  }

  if (session.session.activeOrganizationId !== org.id) {
    await auth.api.setActiveOrganization({
      headers: reqHeaders,
      body: { organizationId: org.id },
    });
  }

  const viewer = await requireViewerContext();
  const { columns } = await getBoardData(viewer.organizationId, { date: todayIST() });
  const initialLayout = await getMyWidgetLayout();

  return (
    <WorklogDashboard
      columns={columns}
      canWrite={viewer.role !== "member"}
      initialLayout={initialLayout}
    />
  );
}
