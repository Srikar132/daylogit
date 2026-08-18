import type { CodeWidgetData } from "@/lib/code-runner/widget-data";

/**
 * How the editor window tells the canvas that a widget changed.
 *
 * The editor opens as a separate browser window, which means a separate
 * document, a separate React tree and its own QueryClient — so
 * `invalidateQueries` in the editor cannot reach the canvas's cache, and the card
 * would keep showing whatever it was server-rendered with until a reload. A
 * BroadcastChannel message crosses the document boundary; the card treats it as
 * display state only and never writes it back, since the editor has already
 * persisted it.
 */

export const CODE_SYNC_CHANNEL = "helm-code-widget";

export type CodeSyncMessage = {
  widgetId: string;
  data: CodeWidgetData;
};

/** Undefined where BroadcastChannel isn't available (older Safari), which
 *  degrades to "the card updates on the next reload" rather than breaking. */
export function openCodeSyncChannel(): BroadcastChannel | undefined {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return undefined;
  return new BroadcastChannel(CODE_SYNC_CHANNEL);
}

/** One-shot announce from the editor window. Opening a channel per message
 *  rather than holding one open keeps the editor from also receiving its own
 *  broadcasts. */
export function codeSyncPost(message: CodeSyncMessage): void {
  const channel = openCodeSyncChannel();
  if (!channel) return;
  channel.postMessage(message);
  channel.close();
}

export function isCodeSyncMessage(value: unknown): value is CodeSyncMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { widgetId?: unknown }).widgetId === "string" &&
    typeof (value as { data?: unknown }).data === "object" &&
    (value as { data: unknown }).data !== null
  );
}

/**
 * The editor window's name, so a second click focuses the window already open
 * for this widget instead of opening a duplicate that would race it on save.
 */
export function codeWindowName(widgetId: string): string {
  return `helm-ide-${widgetId}`;
}

export function codeWindowUrl(slug: string, widgetId: string): string {
  return `/workspace/${encodeURIComponent(slug)}/ide/${encodeURIComponent(widgetId)}`;
}
