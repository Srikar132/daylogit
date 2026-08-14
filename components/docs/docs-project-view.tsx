"use client";

import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  GitFork,
  Link2,
  Menu,
  Plus,
  Printer,
  X,
} from "lucide-react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { GlobalToolbar } from "@/components/docs/global-toolbar";
import { PageSheet } from "@/components/docs/page-sheet";
import {
  createDocPage,
  deleteDocPage,
  setDocProjectPublic,
  updateDocPage,
  type DocPageRow,
  type DocProjectSummary,
} from "@/lib/actions/docs";
import { unwrapAction } from "@/lib/query-utils";

interface DocsProjectViewProps {
  /** Omitted for the public share view — there's no workspace to go back
   *  to, so the back-to-canvas link doesn't render. */
  slug?: string;
  project: DocProjectSummary;
  initialPages: DocPageRow[];
  canWrite: boolean;
}

export function DocsProjectView({ slug, project, initialPages, canWrite }: DocsProjectViewProps) {
  const [pages, setPages] = useState<DocPageRow[]>(initialPages);
  // "Which page is in view" — driven by scroll position (IntersectionObserver
  // below), not by a click swapping content. All pages render at once, like
  // scrolling through a real multi-page document; the sidebar just tracks
  // and jumps, it doesn't gate what's rendered.
  const [activePageId, setActivePageId] = useState<string | null>(initialPages[0]?.id ?? null);
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [shareCopied, setShareCopied] = useState(false);
  // Sidebar is a slide-in drawer below md; the md:translate-x-0 override
  // means this state is only ever visually meaningful on small screens.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // One toolbar for every page — it acts on whichever page's editor last
  // had focus. `toolbarTick` forces GlobalToolbar to re-render on every
  // transaction of that editor so active-state highlighting (bold/italic
  // lighting up) tracks the live cursor, not just which page is focused.
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [, setToolbarTick] = useState(0);

  useEffect(() => {
    if (!activeEditor) return;
    const rerender = () => setToolbarTick((t) => t + 1);
    activeEditor.on("transaction", rerender);
    return () => {
      activeEditor.off("transaction", rerender);
    };
  }, [activeEditor]);

  const pageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollToId = useRef<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const top = visible.reduce((a, b) => (a.intersectionRatio > b.intersectionRatio ? a : b));
        setActivePageId(top.target.getAttribute("data-page-id"));
      },
      { threshold: [0.15, 0.4, 0.6] },
    );
    for (const el of pageRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [pages]);

  useEffect(() => {
    if (!pendingScrollToId.current) return;
    const el = pageRefs.current.get(pendingScrollToId.current);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    // A freshly added page should be ready to type into immediately.
    el?.querySelector<HTMLElement>(".ProseMirror")?.focus();
    pendingScrollToId.current = null;
  }, [pages]);

  function scrollToPage(id: string) {
    setActivePageId(id);
    pageRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSidebarOpen(false);
  }

  const addPageMutation = useMutation({
    mutationFn: () => unwrapAction(createDocPage(project.id)),
    onSuccess: (res) => {
      if (!res.id) return;
      const newPage: DocPageRow = {
        id: res.id,
        docProjectId: project.id,
        title: "Untitled",
        content: null,
        position: (pages.at(-1)?.position ?? -1) + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setPages((prev) => [...prev, newPage]);
      pendingScrollToId.current = res.id;
      setSidebarOpen(false);
    },
    onError: (err) => console.error("Failed to add page:", err),
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteDocPage(id, project.id)),
    onSuccess: (_res, id) => {
      pageRefs.current.delete(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
    },
    onError: (err) => console.error("Failed to delete page:", err),
  });

  function handleDeletePage(id: string) {
    if (pages.length <= 1) return;
    deletePageMutation.mutate(id);
  }

  const savePageMutation = useMutation({
    mutationFn: (input: { pageId: string; patch: { title?: string; content?: Record<string, unknown> } }) =>
      unwrapAction(updateDocPage(input.pageId, input.patch)),
    onError: (err) => console.error("Failed to save page:", err),
  });

  function handlePageContentChange(pageId: string, json: Record<string, unknown>) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, content: json } : p)));
    savePageMutation.mutate({ pageId, patch: { content: json } });
  }

  const titleSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function handlePageTitleChange(pageId: string, title: string) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, title } : p)));
    const timers = titleSaveTimers.current;
    const existing = timers.get(pageId);
    if (existing) clearTimeout(existing);
    timers.set(
      pageId,
      setTimeout(() => {
        savePageMutation.mutate({ pageId, patch: { title } });
        timers.delete(pageId);
      }, 600),
    );
  }

  const shareToggleMutation = useMutation({
    mutationFn: (next: boolean) => unwrapAction(setDocProjectPublic(project.id, next)),
    onSuccess: (_res, next) => setIsPublic(next),
    onError: (err) => console.error("Failed to update sharing:", err),
  });

  function handleShareToggle() {
    shareToggleMutation.mutate(!isPublic);
  }

  async function handleCopyShareLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/share/docs/${project.shareToken}`);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  }

  return (
    <div className="flex h-screen flex-col bg-[#1e1f20] text-[#e8eaed]">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#131314] px-3 sm:gap-3 sm:px-4 print:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          title="Pages"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        {slug && (
          <Link
            href={`/workspace/${slug}`}
            title="Back to canvas"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#e8eaed] sm:flex-none sm:text-[14px]">
          {project.title}
        </h1>

        <div className="hidden items-center gap-1 sm:flex">
          {project.githubLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label ?? link.url}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed]"
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
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#81c995] hover:bg-white/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {canWrite && (
            <>
              {isPublic && (
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  title="Copy link"
                  className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer sm:px-3"
                >
                  {shareCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{shareCopied ? "Copied" : "Copy link"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleShareToggle}
                className={`rounded-full px-2.5 py-1.5 text-[12px] font-medium cursor-pointer sm:px-3.5 ${
                  isPublic
                    ? "bg-[#81c995]/15 text-[#81c995] hover:bg-[#81c995]/25"
                    : "bg-white/[0.06] text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed]"
                }`}
              >
                {isPublic ? "Shared" : "Share"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            title="Export PDF"
            className="flex items-center gap-1.5 rounded-full bg-[#8ab4f8] px-2.5 py-1.5 text-[12px] font-semibold text-[#141414] hover:bg-[#a6c8ff] cursor-pointer sm:px-3.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {canWrite && <GlobalToolbar editor={activeEditor} />}

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-14 z-20 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`fixed inset-y-14 left-0 z-30 flex w-64 flex-col border-r border-white/[0.06] bg-[#131314] transition-transform duration-200 md:static md:inset-y-auto md:z-auto md:w-56 md:translate-x-0 md:transition-none print:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => scrollToPage(page.id)}
                className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-2 cursor-pointer ${
                  page.id === activePageId
                    ? "bg-white/10 text-[#e8eaed]"
                    : "text-[#9aa0a6] hover:bg-white/5"
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[13px]">{page.title}</span>
                {canWrite && pages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeletePage(page.id);
                    }}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#5f6368] opacity-0 hover:text-[#f28b82] group-hover:opacity-100 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={() => addPageMutation.mutate()}
              disabled={addPageMutation.isPending}
              className="flex items-center gap-1.5 border-t border-white/[0.06] px-3 py-2.5 text-[12.5px] text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed] cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add page
            </button>
          )}
        </div>

        {/* All pages render at once, stacked — a continuous scroll through
            the whole document, like scrolling through a Notion doc, instead
            of swapping one page's content in and out. Each page is its own
            document (created via "+ Add page" in the sidebar), styled as a
            Letter-proportioned sheet but growing naturally with content —
            actual pagination only happens at export/print time. */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#1e1f20] px-3 py-6 sm:px-6 sm:py-10 print:overflow-visible print:bg-white print:p-0">
          <div className="mx-auto flex w-full max-w-[816px] flex-col gap-6 sm:gap-10 print:gap-0">
            {pages.map((page) => (
              <div key={page.id} className="print:break-after-page">
                <input
                  type="text"
                  value={page.title}
                  onChange={(e) => handlePageTitleChange(page.id, e.target.value)}
                  placeholder="Untitled"
                  disabled={!canWrite}
                  className="mb-2 w-full truncate bg-transparent text-[11.5px] font-medium uppercase tracking-wider text-[#5f6368] outline-none placeholder:text-[#5f6368] focus:text-[#9aa0a6] disabled:cursor-default print:hidden"
                />
                <PageSheet
                  page={page}
                  canWrite={canWrite}
                  registerRef={(el) => {
                    if (el) pageRefs.current.set(page.id, el);
                    else pageRefs.current.delete(page.id);
                  }}
                  onChange={(json) => handlePageContentChange(page.id, json)}
                  onFocusEditor={setActiveEditor}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
