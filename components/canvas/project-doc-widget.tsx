"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, ExternalLink, FolderGit2, GitBranch, Globe, Lock, Plus, Terminal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  createDocProjectAction,
  deleteDocProjectAction,
  getDocProject,
  updateDocProjectAction,
  type DocProjectSummary,
} from "@/lib/actions/docs";
import type { DocLink } from "@/lib/db";
import { unwrapAction } from "@/lib/query-utils";

interface ProjectDocWidgetProps {
  id: string;
  docProjectId?: string;
  slug?: string;
  canWrite: boolean;
  initialSummary?: DocProjectSummary;
}

export function ProjectDocWidget({ id, docProjectId, slug, canWrite, initialSummary }: ProjectDocWidgetProps) {
  if (!docProjectId) {
    return <DraftProjectForm id={id} canWrite={canWrite} />;
  }
  return <ProjectDocCard id={id} docProjectId={docProjectId} slug={slug} canWrite={canWrite} initialSummary={initialSummary} />;
}

function formatGithubLabel(url: string, explicitLabel?: string): string {
  if (explicitLabel) return explicitLabel;
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2) {
      return `${pathSegments[0]}/${pathSegments[1]}`;
    }
    if (pathSegments.length === 1) {
      return pathSegments[0];
    }
    return parsed.hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function formatLiveHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

type SpecDraft = {
  title: string;
  description: string;
  liveLink: string;
  githubLinks: string;
  resourceLinks: string;
};

/** Inverse of the server's `parseLinks` (one url per line) so an existing spec
 *  can be loaded back into the same textareas it was written in. */
function linksToText(links?: DocLink[] | null): string {
  return (links ?? []).map((link) => link.url).join("\n");
}

function specDraftFrom(project?: DocProjectSummary): SpecDraft {
  return {
    title: project?.title ?? "",
    description: project?.description ?? "",
    liveLink: project?.liveLink ?? "",
    githubLinks: linksToText(project?.githubLinks),
    resourceLinks: linksToText(project?.resourceLinks),
  };
}

interface ProjectSpecFormProps {
  heading: string;
  subheading: string;
  initial: SpecDraft;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  cancelLabel: string;
}

/** One form behind both creating a spec and editing it afterwards. Sharing it is
 *  the point: the fields, their validation and the FormData keys all have to
 *  match what the server expects, and two copies would drift the moment either
 *  side gains a field. */
function ProjectSpecForm({
  heading,
  subheading,
  initial,
  submitLabel,
  pendingLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
  cancelLabel,
}: ProjectSpecFormProps) {
  const [draft, setDraft] = useState(initial);
  const [localError, setLocalError] = useState<string | null>(null);

  function set(key: keyof SpecDraft, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    if (!draft.title.trim()) {
      setLocalError("Give the project a title.");
      return;
    }

    const formData = new FormData();
    formData.append("title", draft.title.trim());
    if (draft.description.trim()) formData.append("description", draft.description.trim());
    if (draft.liveLink.trim()) formData.append("liveLink", draft.liveLink.trim());
    formData.append("githubLinks", draft.githubLinks);
    formData.append("resourceLinks", draft.resourceLinks);

    onSubmit(formData);
  }

  const shownError = error ?? localError;
  const fieldClass =
    "nodrag rounded-xl border-widget-border bg-widget-surface px-3 py-1.5 text-[12.5px] text-widget-text-primary placeholder:text-widget-text-muted focus-visible:ring-1 focus-visible:ring-white/30";
  const areaClass =
    "nodrag resize-none rounded-xl border-widget-border bg-widget-surface px-3 py-1.5 text-[12px] leading-snug text-widget-text-primary placeholder:text-widget-text-muted focus-visible:ring-1 focus-visible:ring-white/30";

  return (
    <form
      onSubmit={handleSubmit}
      // No card-level nodrag/nowheel: that made the whole form claim every
      // drag, so the card could never be moved. The shell's chrome decides
      // both (lib/canvas/widget-interaction.ts); only the fields below claim
      // drags, since inside a field a drag means "select text".
      className="widget-card-shell relative flex h-full w-full flex-col justify-between overflow-y-auto scrollbar-thin p-4"
    >
      <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-200 shadow-inner">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-widget-text-primary">{heading}</h3>
            <p className="text-[11px] text-widget-text-secondary">{subheading}</p>
          </div>
        </div>

        {shownError && (
          <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11.5px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{shownError}</span>
          </div>
        )}

        <Input
          type="text"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Project Title (e.g. Daylogit Core API)"
          autoFocus
          className={fieldClass}
        />
        <Textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Brief architectural overview..."
          rows={2}
          className={areaClass}
        />
        <Input
          type="text"
          value={draft.liveLink}
          onChange={(e) => set("liveLink", e.target.value)}
          placeholder="Live App URL (e.g. https://app.company.com)"
          className={fieldClass + " font-mono"}
        />
        <Textarea
          value={draft.githubLinks}
          onChange={(e) => set("githubLinks", e.target.value)}
          placeholder={"GitHub repository URLs (one per line)"}
          rows={2}
          className={areaClass + " font-mono"}
        />
        <Textarea
          value={draft.resourceLinks}
          onChange={(e) => set("resourceLinks", e.target.value)}
          placeholder={"Resource / Spec links (one per line)"}
          rows={2}
          className={areaClass + " font-mono"}
        />
      </div>

      <div className="relative z-10 flex items-center justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-widget-text-secondary hover:bg-white/[0.06] hover:text-widget-text-primary transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="widget-btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] disabled:opacity-60 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          {isPending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

function DraftProjectForm({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => unwrapAction(createDocProjectAction({}, formData)),
    onSuccess: (res) => updateWidgetData(id, { docProjectId: res.id }),
    onError: (err) => setError(err.message),
  });

  return (
    <ProjectSpecForm
      heading="New Project Doc"
      subheading="Register tech spec & repositories"
      initial={specDraftFrom()}
      submitLabel="Save Spec"
      pendingLabel="Creating…"
      isPending={createMutation.isPending}
      error={error}
      onSubmit={(formData) => {
        setError(null);
        createMutation.mutate(formData);
      }}
      // Nothing exists on the server yet, so backing out means removing the card.
      onCancel={() => {
        if (canWrite) deleteWidget(id);
      }}
      cancelLabel="Cancel"
    />
  );
}

function ProjectDocCard({
  id,
  docProjectId,
  slug,
  canWrite,
  initialSummary,
}: {
  id: string;
  docProjectId: string;
  slug?: string;
  canWrite: boolean;
  initialSummary?: DocProjectSummary;
}) {
  const { deleteWidget } = useCanvasActions();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["docProject", docProjectId],
    queryFn: () => getDocProject(docProjectId),
    initialData: initialSummary,
  });

  const deleteMutation = useMutation({
    mutationFn: () => unwrapAction(deleteDocProjectAction(docProjectId)),
    onSuccess: () => deleteWidget(id),
    onError: (err) => console.error("Failed to delete doc project:", err),
  });

  const updateMutation = useMutation({
    mutationFn: (formData: FormData) => {
      formData.append("id", docProjectId);
      return unwrapAction(updateDocProjectAction({}, formData));
    },
    onSuccess: () => {
      // The canvas card and the docs page read the same key, so neither keeps
      // showing the pre-edit spec.
      void queryClient.invalidateQueries({ queryKey: ["docProject", docProjectId] });
      setIsEditing(false);
    },
    onError: (err) => setEditError(err.message),
  });

  function handleDeleteProject() {
    if (!window.confirm("Delete this doc project? This can't be undone.")) return;
    deleteMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="widget-card-shell flex h-full flex-col justify-between p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-xl bg-white/[0.05]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-white/[0.05]" />
            <Skeleton className="h-3 w-full bg-white/[0.05]" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-6 w-full rounded-lg bg-white/[0.05]" />
          <Skeleton className="h-6 w-2/3 rounded-lg bg-white/[0.05]" />
        </div>
        <Skeleton className="h-9 w-full rounded-full bg-white/[0.05]" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="widget-card-shell flex h-full items-center justify-center gap-1.5 p-4 text-center text-[12px] text-destructive border-destructive/20">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Couldn&apos;t load project spec.</span>
      </div>
    );
  }

  // Editing reuses the creation form rather than a second, drifting copy. Before
  // this there was no way to change a spec at all once it had been saved.
  if (isEditing && canWrite) {
    return (
      <ProjectSpecForm
        heading="Edit Project Doc"
        subheading="Update tech spec & repositories"
        initial={specDraftFrom(project)}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        isPending={updateMutation.isPending}
        error={editError}
        onSubmit={(formData) => {
          setEditError(null);
          updateMutation.mutate(formData);
        }}
        onCancel={() => {
          setEditError(null);
          setIsEditing(false);
        }}
        cancelLabel="Discard"
      />
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full rounded-2xl">
        <ProjectDocCardBody project={project} slug={slug} docProjectId={docProjectId} />
      </ContextMenuTrigger>
      <ContextMenuContent>
        {canWrite && <ContextMenuItem onClick={() => setIsEditing(true)}>Edit spec</ContextMenuItem>}
        {canWrite && (
          <ContextMenuItem variant="destructive" onClick={handleDeleteProject}>
            Delete project
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ProjectDocCardBody({
  project,
  slug,
  docProjectId,
}: {
  project: DocProjectSummary;
  slug?: string;
  docProjectId: string;
}) {
  const { title, description, liveLink, githubLinks, resourceLinks, isPublic } = project;
  const liveHost = liveLink ? formatLiveHost(liveLink) : null;

  return (
    <div className="group relative widget-card-shell flex h-full w-full flex-col justify-between overflow-hidden p-3.5 sm:p-4">
      {/* Top Accent Ribbon Glow */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/5 blur-2xl opacity-30 transition-opacity group-hover:opacity-60 pointer-events-none" />

      {/* Main Content Area (Flexible & Scrollable on resize) */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto scrollbar-thin space-y-2.5 pr-0.5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-widget-text-primary shadow-sm">
              <FolderGit2 className="h-4 w-4 text-zinc-200" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[13.5px] font-semibold text-widget-text-primary group-hover:text-white transition-colors">
                {title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-widget-text-secondary">
                {isPublic ? (
                  <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                    <Globe className="h-3 w-3" /> Public
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-widget-text-secondary">
                    <Lock className="h-3 w-3" /> Private
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Live Badge */}
          {liveLink && (
            <a
              href={liveLink}
              target="_blank"
              rel="noopener noreferrer"
              title={`Visit ${liveLink}`}
              className="nodrag flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 shadow-sm transition-colors hover:bg-emerald-500/20 cursor-pointer"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span>LIVE</span>
            </a>
          )}
        </div>

        {/* Project Description */}
        {description && (
          <p className="line-clamp-2 text-[11.5px] leading-relaxed text-widget-text-secondary font-normal">
            {description}
          </p>
        )}

        {/* Link Matrix & Repository Badges */}
        <div className="space-y-1.5 pt-0.5">
          {/* Prominent Live Host Bar */}
          {liveLink && liveHost && (
            <a
              href={liveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="nodrag widget-surface flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono text-widget-text-primary transition-all hover:text-white cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">{liveHost}</span>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60 ml-1" />
            </a>
          )}

          {/* Monospace Repositories & Resources */}
          <div className="flex flex-wrap items-center gap-1.5">
            {githubLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.url}
                className="nodrag widget-surface inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-[10.5px] font-mono text-widget-text-primary transition-colors hover:text-white cursor-pointer"
              >
                <GitBranch className="h-3 w-3 shrink-0 text-zinc-300" />
                <span className="truncate">{formatGithubLabel(link.url, link.label)}</span>
              </a>
            ))}

            {resourceLinks.length > 0 && (
              <div className="widget-surface inline-flex items-center gap-1 px-2 py-1 text-[10.5px] font-mono text-widget-text-secondary">
                <span>{resourceLinks.length} resource{resourceLinks.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info & Sleek Action */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-t border-white/[0.06] pt-2.5 mt-2">
        <span className="text-[10.5px] font-medium text-widget-text-secondary">Doc Hub</span>

        <Link
          href={slug ? `/workspace/${slug}/docs/${docProjectId}` : "#"}
          className="nodrag widget-btn-glass inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold cursor-pointer"
        >
          <span>Open Spec</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

