import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireViewerContext } from "@/lib/workspace";
import { canWriteWidgets } from "@/lib/permissions";
import { getWidgetById } from "@/lib/actions/widgets";
import { normalizeCodeWidgetData, codeWidgetTitle } from "@/lib/code-runner/widget-data";
import { IdeShell } from "@/components/ide/ide-shell";

/** The code the user is editing is the whole point of this page — never serve a
 *  cached copy of it. */
export const dynamic = "force-dynamic";

interface IdePageProps {
  params: Promise<{ slug: string; widgetId: string }>;
}

/**
 * The editor's own window.
 *
 * A route rather than a canvas card because the requirement was a real,
 * resizable, desktop-application-style surface — and because a separate document
 * keeps Monaco's bundle and its web workers out of the canvas entirely.
 *
 * It loads its own data: the window can be opened directly by URL (or reopened
 * after a reload), so it can't assume a canvas ever rendered.
 */
export default async function IdePage({ params }: IdePageProps) {
  const { slug, widgetId } = await params;
  const viewer = await requireViewerContext();

  // getWidgetById is scoped to the viewer's workspace, so an id belonging to
  // another workspace is indistinguishable from one that doesn't exist.
  const widget = await getWidgetById(widgetId);
  if (!widget || widget.type !== "code") notFound();

  return (
    <IdeShell
      slug={slug}
      widgetId={widget.id}
      initialData={normalizeCodeWidgetData(widget.data)}
      canWrite={canWriteWidgets(viewer.role)}
    />
  );
}

export async function generateMetadata({ params }: IdePageProps): Promise<Metadata> {
  const { widgetId } = await params;
  const widget = await getWidgetById(widgetId);
  if (!widget || widget.type !== "code") return { title: "Code" };
  return { title: codeWidgetTitle(normalizeCodeWidgetData(widget.data)) };
}
