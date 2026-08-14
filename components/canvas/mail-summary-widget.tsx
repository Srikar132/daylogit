"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getGmailStatus, getTodayMessages, type GmailStatus } from "@/lib/actions/gmail";
import { GMAIL_READONLY_SCOPE, type GmailMessageSummary } from "@/lib/gmail";
import { Skeleton } from "@/components/ui/skeleton";
import { GmailIcon } from "@/components/icons/gmail-icon";

interface MailSummaryWidgetProps {
  /** Server-prefetched alongside every other canvas widget's initial data
   *  (see app/workspace/[slug]/page.tsx) — seeded into the queries below so
   *  a normal page load never shows a loading state for this widget at all. */
  initialStatus?: GmailStatus;
  initialMessages?: GmailMessageSummary[];
}

function senderInitial(from: string): string {
  const name = from.match(/^[^<]+/)?.[0]?.trim() || from;
  return name.charAt(0).toUpperCase() || "?";
}

export function MailSummaryWidget({ initialStatus, initialMessages }: MailSummaryWidgetProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["gmailStatus"],
    queryFn: getGmailStatus,
    initialData: initialStatus,
  });

  const connected = statusQuery.data?.connected ?? false;

  const messagesQuery = useQuery({
    queryKey: ["gmailMessages"],
    queryFn: getTodayMessages,
    initialData: initialMessages ? { messages: initialMessages } : undefined,
    enabled: connected,
  });

  async function handleConnect() {
    setIsConnecting(true);
    try {
      await authClient.linkSocial({
        provider: "google",
        scopes: [GMAIL_READONLY_SCOPE],
        callbackURL: window.location.href,
      });
    } finally {
      setIsConnecting(false);
    }
  }

  const messages = messagesQuery.data?.messages ?? [];
  const loadingMessages = connected && messagesQuery.isLoading;

  return (
    <div className="flex h-full flex-col p-4">
      {/* No repeated "Today's Mail" text here — WidgetNode's own chrome
          header already shows the title; this row just carries the brand
          icon (identifies which service this is, at a glance) + refresh. */}
      <div className="flex items-center gap-2 pb-3">
        <GmailIcon className="h-5 w-[26px] shrink-0 rounded-[3px] shadow-sm" />
        <div className="flex-1" />
        {connected && (
          <button
            type="button"
            onClick={() => messagesQuery.refetch()}
            disabled={messagesQuery.isFetching}
            title="Refresh"
            className="rounded-md p-1 text-[#9aa0a6] hover:bg-white/[0.06] hover:text-[#e8eaed] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${messagesQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        {statusQuery.isLoading && <MailSkeletonRows />}

        {!statusQuery.isLoading && !connected && (
          <div className="flex w-full flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-16 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-inner">
              <GmailIcon className="h-7 w-[38px]" />
            </div>
            <p className="text-[12.5px] text-[#9aa0a6]">Connect Gmail to see today&apos;s emails here.</p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#9dc4ff] to-[#8ab4f8] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#141414] shadow-[0_2px_8px_rgba(138,180,248,0.35)] disabled:opacity-50 cursor-pointer"
            >
              {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Connect Gmail
            </button>
          </div>
        )}

        {connected && loadingMessages && <MailSkeletonRows />}

        {connected && !loadingMessages && messagesQuery.isError && (
          <div className="flex w-full items-center justify-center gap-1.5 py-8 text-center text-[12.5px] text-[#f28b82]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Couldn&apos;t reach Gmail. Try again shortly.
          </div>
        )}

        {connected &&
          !loadingMessages &&
          !messagesQuery.isError &&
          (messages.length === 0 ? (
            <p className="w-full py-6 text-center text-[12.5px] text-[#9aa0a6]">No new emails today.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8ab4f8]/15 text-[11px] font-semibold text-[#8ab4f8]">
                    {senderInitial(m.from)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-[12.5px] font-medium text-[#e8eaed]">
                        {m.subject}
                      </span>
                    </div>
                    <p className="truncate text-[11.5px] text-[#9aa0a6]">{m.from}</p>
                    {m.snippet && (
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[#80868b]">{m.snippet}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function MailSkeletonRows() {
  return (
    <div className="flex flex-col gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-2.5 px-1.5 py-2">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
