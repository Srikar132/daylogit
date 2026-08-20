"use client";

import { ArrowUpRight, ExternalLink, FolderGit2, GitBranch, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DocProjectSummary } from "@/lib/actions/docs";
import { formatGithubLabel, formatLiveHost } from "@/components/canvas/project-doc-format";

export function ProjectDocCardBody({
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

        <Link href={slug ? `/workspace/${slug}/docs/${docProjectId}` : "#"} className="nodrag">
          <Button
            type="button"
            variant="default"
            size="xs"
            className="cursor-pointer"
            badgeIcon={<ArrowUpRight className="h-3 w-3" />}
          >
            Open Spec
          </Button>
        </Link>
      </div>
    </div>
  );
}
