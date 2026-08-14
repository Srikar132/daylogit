"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, ExternalLink, FolderGit2, GitFork } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { createDocProjectAction, getDocProject, type DocProjectSummary } from "@/lib/actions/docs";

interface ProjectDocWidgetProps {
  id: string;
  docProjectId?: string;
  slug?: string;
  canWrite: boolean;
  /** Server-prefetched (batched for every project-doc card on the canvas at
   *  once, see app/workspace/[slug]/page.tsx) — seeded straight into the
   *  query below, so an already-known card never shows a loading state at
   *  all. Absent for a card created after that prefetch ran; the query
   *  just fetches normally in that case. */
  initialSummary?: DocProjectSummary;
}

export function ProjectDocWidget({ id, docProjectId, slug, canWrite, initialSummary }: ProjectDocWidgetProps) {
  if (!docProjectId) {
    return <DraftProjectForm id={id} canWrite={canWrite} />;
  }
  return <ProjectDocCard docProjectId={docProjectId} slug={slug} initialSummary={initialSummary} />;
}

/** The card starts life as this inline creation form — no modal. Submitting
 *  it swaps the same widget straight into the display card by writing
 *  docProjectId onto this node's own data. */
function DraftProjectForm({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubLinks, setGithubLinks] = useState("");
  const [resourceLinks, setResourceLinks] = useState("");
  const [liveLink, setLiveLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Give the project a title.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());
    if (liveLink.trim()) formData.append("liveLink", liveLink.trim());
    formData.append("githubLinks", githubLinks);
    formData.append("resourceLinks", resourceLinks);

    startTransition(async () => {
      const res = await createDocProjectAction({}, formData);
      if (res.error || !res.id) {
        setError(res.error ?? "Could not create the project.");
      } else {
        updateWidgetData(id, { docProjectId: res.id });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="nodrag nowheel flex h-full flex-col gap-2.5 overflow-y-auto scrollbar-thin p-3.5">
      <div className="flex items-center gap-2">
        <FolderGit2 className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
        <span className="text-[12.5px] font-medium text-[#e8eaed]">New Project</span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-[#f28b82]/20 bg-[#f28b82]/10 px-2.5 py-1.5 text-[11.5px] text-[#f28b82]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        autoFocus
        className="rounded-lg border-white/10 bg-white/5 px-2.5 py-1.5 text-[12.5px] text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8]"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="resize-none rounded-lg border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] leading-snug text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8] focus-visible:ring-1"
      />
      <Input
        type="text"
        value={liveLink}
        onChange={(e) => setLiveLink(e.target.value)}
        placeholder="Live link"
        className="rounded-lg border-white/10 bg-white/5 px-2.5 py-1.5 text-[12.5px] text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8]"
      />
      <Textarea
        value={githubLinks}
        onChange={(e) => setGithubLinks(e.target.value)}
        placeholder={"GitHub link(s), one per line"}
        rows={2}
        className="resize-none rounded-lg border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] leading-snug text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8] focus-visible:ring-1"
      />
      <Textarea
        value={resourceLinks}
        onChange={(e) => setResourceLinks(e.target.value)}
        placeholder={"Resource link(s), one per line"}
        rows={2}
        className="resize-none rounded-lg border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] leading-snug text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8] focus-visible:ring-1"
      />

      <div className="mt-auto flex items-center justify-end gap-2 pt-1">
        {canWrite && (
          <button
            type="button"
            onClick={() => deleteWidget(id)}
            className="rounded-full px-3 py-1.5 text-[12px] text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed] cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[#8ab4f8] px-4 py-1.5 text-[12px] font-semibold text-[#141414] shadow-md transition-transform hover:bg-[#a6c8ff] active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {isPending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}

function ProjectDocCard({
  docProjectId,
  slug,
  initialSummary,
}: {
  docProjectId: string;
  slug?: string;
  initialSummary?: DocProjectSummary;
}) {
  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["docProject", docProjectId],
    queryFn: () => getDocProject(docProjectId),
    initialData: initialSummary,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-2.5">
          <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <Skeleton className="mt-auto h-8 w-full rounded-full" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex h-full items-center justify-center gap-1.5 p-4 text-center text-[12px] text-[#f28b82]">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Couldn&apos;t load this project.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#8ab4f8]/25 to-[#8ab4f8]/5 text-[#8ab4f8] shadow-[0_0_0_1px_rgba(138,180,248,0.08)]">
          <FolderGit2 className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold text-[#e8eaed]">{project.title}</h3>
          {project.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#9aa0a6]">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {(project.githubLinks.length > 0 || project.liveLink || project.resourceLinks.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {project.githubLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label ?? link.url}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-[#9aa0a6] shadow-sm transition-colors hover:border-white/[0.12] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer"
            >
              <GitFork className="h-3.5 w-3.5" />
            </a>
          ))}
          {project.liveLink && (
            <a
              href={project.liveLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Live link"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#81c995]/15 bg-[#81c995]/[0.08] text-[#81c995] shadow-sm transition-colors hover:bg-[#81c995]/15 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {project.resourceLinks.length > 0 && (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#9aa0a6]">
              {project.resourceLinks.length} resource{project.resourceLinks.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <Link
        href={slug ? `/workspace/${slug}/docs/${docProjectId}` : "#"}
        className="nodrag mt-auto flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-[#9dc4ff] to-[#8ab4f8] py-2 text-[12.5px] font-semibold text-[#141414] shadow-[0_2px_8px_rgba(138,180,248,0.35)] transition-transform hover:brightness-105 active:scale-[0.98]"
      >
        MANAGE
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
