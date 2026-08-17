"use client";

import { AlertCircle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { buildEmailSrcDoc, EMAIL_IFRAME_SANDBOX } from "@/lib/mail-html";

export type ReaderMessage = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date?: string;
  bodyText?: string;
  bodyHtml?: string;
};

interface MailReaderOverlayProps {
  message: ReaderMessage | null;
  isLoading: boolean;
  error?: string;
  onClose: () => void;
  formatSender: (raw: string) => { name: string; email: string };
  formatDate: (raw?: string) => string;
}

/**
 * Reading a mail happens here rather than inside the widget card.
 *
 * A canvas card is a few hundred pixels wide; real email is a full document,
 * often a multi-column marketing table, and cramming it into the card left a few
 * legible lines. This is a portalled dialog, so it's sized against the viewport
 * instead of the card and is unaffected by the canvas's own pan/zoom transform.
 */
export function MailReaderOverlay({
  message,
  isLoading,
  error,
  onClose,
  formatSender,
  formatDate,
}: MailReaderOverlayProps) {
  const sender = message ? formatSender(message.from) : null;
  const timestamp = message ? formatDate(message.date) : "";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // grid-rows so the header keeps its height and only the body scrolls;
        // minmax(0,1fr) is what actually lets that row shrink below its content.
        className="flex h-[85vh] w-[94vw] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border border-white/[0.08] p-0 sm:max-w-3xl"
      >
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-white/[0.08] px-5 py-4 pr-12">
          <DialogTitle className="text-[15px] leading-snug font-semibold text-foreground">
            {message?.subject || (isLoading ? "Loading…" : "Message")}
          </DialogTitle>
          {sender && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
              <span className="font-medium text-zinc-200">{sender.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">&lt;{sender.email}&gt;</span>
              {timestamp && <span className="font-mono text-[11px] text-muted-foreground">· {timestamp}</span>}
              {message?.id && (
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${message.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Open in Gmail
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-black/20">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-4 w-2/3 bg-white/10" />
              <Skeleton className="h-3 w-1/3 bg-white/5" />
              <Skeleton className="h-40 w-full rounded-xl bg-white/5" />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-[12.5px] text-zinc-300">{error}</p>
            </div>
          ) : message?.bodyHtml ? (
            // Sandboxed WITHOUT allow-scripts: email html is untrusted, and it
            // was previously injected straight into the page. The frame also
            // keeps the sender's CSS from leaking into this UI.
            <iframe
              title={message.subject || "Email"}
              srcDoc={buildEmailSrcDoc(message.bodyHtml)}
              sandbox={EMAIL_IFRAME_SANDBOX}
              referrerPolicy="no-referrer"
              className="h-full w-full border-0 bg-transparent"
            />
          ) : (
            <div className="h-full overflow-y-auto scrollbar-thin p-5 text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-300 select-text">
              {message?.bodyText || message?.snippet}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
