import { notFound } from "next/navigation";
import { getDocProjectByShareToken } from "@/lib/actions/docs";
import { DocsProjectView } from "@/components/docs/docs-project-view";

export const dynamic = "force-dynamic";

interface SharedDocsPageProps {
  params: Promise<{ token: string }>;
}

// The one page in this app that intentionally calls neither
// requireViewerContext() nor getRequestIdentity() — it's meant to be opened
// by anyone with the link, no session required.
export default async function SharedDocsPage({ params }: SharedDocsPageProps) {
  const { token } = await params;

  const result = await getDocProjectByShareToken(token);
  if (!result || !result.project.isPublic) {
    notFound();
  }

  return (
    <DocsProjectView
      project={result.project}
      initialPages={result.pages}
      canWrite={false}
    />
  );
}
