import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/better-auth";
import { WorklogDashboard } from "@/components/worklog-dashboard";
import { getBoardData } from "@/lib/worklog";
import { todayIST } from "@/lib/date";
import { requireViewerContext } from "@/lib/workspace";
import { getMyWidgetLayout } from "@/lib/actions/widgets";
import { getDocProjectsByIds } from "@/lib/actions/docs";
import { getGmailStatus, getTodayMessages } from "@/lib/actions/gmail";

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

  // Wave 1: independent of each other.
  const [{ columns }, initialLayout] = await Promise.all([
    getBoardData(viewer.organizationId, { date: todayIST() }),
    getMyWidgetLayout(),
  ]);

  // Every project-doc widget on the canvas used to fetch its own summary
  // client-side on mount — N cards, N round-trips, every single load. Batch
  // them all here instead, in parallel with the Gmail status check.
  const projectDocIds = (initialLayout ?? [])
    .filter((item) => item.type === "project-doc")
    .map((item) => (item.data as { docProjectId?: unknown } | undefined)?.docProjectId)
    .filter((id): id is string => typeof id === "string");

  const [initialProjectSummaries, initialGmailStatus] = await Promise.all([
    getDocProjectsByIds(projectDocIds),
    getGmailStatus(),
  ]);

  // Only known once we have the status above, so this can't join wave 2.
  const initialGmailMessages = initialGmailStatus.connected
    ? (await getTodayMessages()).messages
    : undefined;

  return (
    <WorklogDashboard
      slug={slug}
      columns={columns}
      canWrite={viewer.role !== "member"}
      initialLayout={initialLayout}
      initialProjectSummaries={initialProjectSummaries}
      initialGmailStatus={initialGmailStatus}
      initialGmailMessages={initialGmailMessages}
    />
  );
}
