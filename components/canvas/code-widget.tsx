"use client";

import { useEffect, useState } from "react";
import { Code2, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { findLanguage } from "@/lib/code-runner/languages";
import { codeWidgetPreview, codeWidgetTitle, normalizeCodeWidgetData, type CodeWidgetData } from "@/lib/code-runner/widget-data";
import { codeWindowName, codeWindowUrl, isCodeSyncMessage, openCodeSyncChannel } from "@/lib/code-runner/sync";

interface CodeWidgetProps {
  id: string;
  slug: string;
  canWrite: boolean;
  widgetData?: Record<string, unknown>;
}

/**
 * Canvas entry point for the code editor. Deliberately not an editor.
 *
 * The user's requirement was a real window rather than an inline surface, and
 * that also keeps Monaco (a couple of megabytes, its own workers) out of the
 * canvas bundle entirely — the editor route is a separate document, so nothing
 * here loads it.
 */
export function CodeWidget({ id, slug, canWrite, widgetData }: CodeWidgetProps) {
  const { deleteWidget } = useCanvasActions();
  const [liveData, setLiveData] = useState<CodeWidgetData | null>(null);

  // Display-only. The editor window has already persisted whatever it sends, so
  // writing it back from here would be a redundant round trip at best and a
  // save loop at worst.
  useEffect(() => {
    const channel = openCodeSyncChannel();
    if (!channel) return;

    const onMessage = (event: MessageEvent) => {
      if (isCodeSyncMessage(event.data) && event.data.widgetId === id) setLiveData(event.data.data);
    };
    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [id]);

  const data = liveData ?? normalizeCodeWidgetData(widgetData);
  const language = findLanguage(data.languageId);
  const preview = codeWidgetPreview(data);

  /**
   * `window.open` has to run synchronously inside the click handler — behind an
   * await or a timeout every popup blocker treats it as unrequested. The window
   * name is per-widget so a second click focuses the one already open rather than
   * opening a rival that would race it on save.
   */
  function openEditor() {
    const target = window.open(
      codeWindowUrl(slug, id),
      codeWindowName(id),
      "popup=yes,width=1280,height=860,noopener=no",
    );
    target?.focus();
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="group widget-card-shell flex h-full flex-col gap-2.5 overflow-hidden p-3.5">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 shrink-0 text-zinc-300" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-widget-text-primary">
            {codeWidgetTitle(data)}
          </span>
          {data.mode === "assisted" && (
            <span title="AI-generated exercise" className="shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            </span>
          )}
        </div>

        {preview ? (
          <p className="truncate rounded-lg bg-widget-surface px-2.5 py-1.5 font-mono text-[11.5px] text-widget-text-secondary">
            {preview}
          </p>
        ) : (
          <p className="text-[12px] text-widget-text-muted">Nothing written yet.</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[11.5px] text-widget-text-muted">{language?.label ?? data.languageId}</span>
          <button
            type="button"
            onClick={openEditor}
            className="nodrag widget-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[12px] cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open editor
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={openEditor}>
          <ExternalLink className="h-3.5 w-3.5" /> Open editor
        </ContextMenuItem>
        {canWrite && (
          <ContextMenuItem variant="destructive" onClick={() => deleteWidget(id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
