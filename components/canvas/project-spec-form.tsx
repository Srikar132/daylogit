"use client";

import { AlertCircle, Plus, Terminal } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DocProjectSummary } from "@/lib/actions/docs";
import type { DocLink } from "@/lib/db";

export type SpecDraft = {
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

export function specDraftFrom(project?: DocProjectSummary): SpecDraft {
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
export function ProjectSpecForm({
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
