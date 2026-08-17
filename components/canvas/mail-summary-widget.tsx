"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { unwrapAction } from "@/lib/query-utils";
import {
  getGmailStatus,
  getTodayMessages,
  getMessageDetail,
  type GmailStatus,
} from "@/lib/actions/gmail";
import { GMAIL_READONLY_SCOPE, type GmailMessageSummary } from "@/lib/gmail";
import { Skeleton } from "@/components/ui/skeleton";
import { MailReaderOverlay } from "@/components/canvas/mail-reader-overlay";
import { GmailIcon } from "@/components/icons/gmail-icon";

interface MailSummaryWidgetProps {
  initialStatus?: GmailStatus;
  initialMessages?: GmailMessageSummary[];
}

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<([^>]+)>/);
  if (match) {
    return { name: match[1].trim() || match[2], email: match[2] };
  }
  return { name: from, email: from };
}

function formatMailDate(rawDate?: string): string {
  if (!rawDate) return "";
  try {
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function MailSummaryWidget({ initialStatus, initialMessages }: MailSummaryWidgetProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ["gmailStatus"],
    queryFn: getGmailStatus,
    initialData: initialStatus,
  });

  const connected = statusQuery.data?.connected ?? false;

  const messagesQuery = useQuery({
    queryKey: ["gmailMessages"],
    // unwrapAction, per the repo convention: getTodayMessages RESOLVES with
    // { error } rather than throwing, so without this the query looked
    // successful, `messages` fell back to [], and a dead token or a failed
    // request was displayed as "no emails today" — indistinguishable from an
    // empty inbox, and the real reason sat unread in data.error.
    queryFn: () => unwrapAction(getTodayMessages()),
    initialData: initialMessages ? { messages: initialMessages } : undefined,
    enabled: connected,
    // A revoked token fails identically every time; three retries just delays
    // telling the user to reconnect.
    retry: 1,
  });

  const detailQuery = useQuery({
    queryKey: ["gmailMessageDetail", selectedMailId],
    queryFn: () => (selectedMailId ? getMessageDetail(selectedMailId) : null),
    enabled: !!selectedMailId && connected,
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

  // Memoised because `?? []` builds a new array every render, which made every
  // useMemo below it recompute on each pass (and eslint rightly complained).
  const messages = useMemo(() => messagesQuery.data?.messages ?? [], [messagesQuery.data]);
  const loadingMessages = connected && messagesQuery.isLoading;

  const unreadCount = useMemo(() => messages.filter((m) => m.unread).length, [messages]);

  // Shows the list row's own subject/sender/snippet immediately, so the reader
  // opens with content instead of an empty frame while the body loads.
  const fallbackReaderMessage = useMemo(() => {
    const summary = messages.find((m) => m.id === selectedMailId);
    if (!summary) return null;
    return {
      id: summary.id,
      subject: summary.subject,
      from: summary.from,
      snippet: summary.snippet,
      date: summary.date,
      bodyText: summary.snippet,
    };
  }, [messages, selectedMailId]);

  return (
    <div className="flex h-full flex-col p-3.5 select-none">
      {/* Executive macOS Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <GmailIcon className="h-4 w-5 shrink-0 rounded-[3px]" />
          <span className="text-[12.5px] font-medium tracking-tight text-zinc-200">
            {connected ? "Today's Mail" : "Gmail"}
          </span>
          {connected && unreadCount > 0 && (
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
              {unreadCount} new
            </span>
          )}
        </div>

        {connected && (
          <button
            type="button"
            onClick={() => {
              messagesQuery.refetch();
              if (selectedMailId) detailQuery.refetch();
            }}
            disabled={messagesQuery.isFetching || detailQuery.isFetching}
            title="Refresh"
            className="rounded-md p-1 text-zinc-400 hover:bg-white/[0.08] hover:text-white cursor-pointer disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                messagesQuery.isFetching || detailQuery.isFetching ? "animate-spin" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Main View Area */}
      <div className="nodrag nowheel flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* NOT CONNECTED STATE */}
        {!statusQuery.isLoading && !connected && (
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex h-10 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <GmailIcon className="h-6 w-8" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[12.5px] font-medium text-zinc-200">Connect Gmail</p>
              <p className="text-[11px] text-zinc-400 max-w-[200px]">
                Read and manage today&apos;s workspace emails.
              </p>
            </div>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="widget-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] disabled:opacity-50 cursor-pointer"
            >
              {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Connect
            </button>
          </div>
        )}

        {/* LOADING SKELETON */}
        {(statusQuery.isLoading || (connected && loadingMessages && !selectedMailId)) && (
          <MailSkeletonRows />
        )}

        {/* ERROR STATE */}
        {connected && !loadingMessages && messagesQuery.isError && (
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-2.5 px-4 py-6 text-center">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-[12px] text-zinc-300">
              {messagesQuery.error?.message || "Couldn't load emails."}
            </p>
            {/* Reconnecting re-runs the same Google link flow as first-time
                setup, which is what a revoked or expired grant needs. */}
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="widget-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] disabled:opacity-50 cursor-pointer"
            >
              {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Reconnect Gmail
            </button>
          </div>
        )}

        {/* INBOX LIST VIEW */}
        {connected && !loadingMessages && !messagesQuery.isError && (
          <>
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-[12px] text-zinc-400">
                No mail in the last 24 hours.
              </div>
            ) : (
              <div className="nodrag nowheel flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin divide-y divide-white/[0.04]">
                {messages.map((m, i) => {
                  const sender = parseSender(m.from);
                  const formattedTime = formatMailDate(m.date);
                  return (
                    <div
                      key={m.id || i}
                      onClick={() => setSelectedMailId(m.id || null)}
                      className="group relative flex flex-col gap-0.5 py-2.5 px-1.5 transition-colors hover:bg-white/[0.04] rounded-lg cursor-pointer"
                    >
                      {/* Sender row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {m.unread && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                          )}
                          <span
                            className={`truncate text-[12px] ${
                              m.unread ? "font-semibold text-zinc-100" : "font-medium text-zinc-300"
                            } group-hover:text-white`}
                          >
                            {sender.name}
                          </span>
                        </div>
                        {formattedTime && (
                          <span className="shrink-0 text-[10.5px] text-zinc-400 font-mono">
                            {formattedTime}
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <p
                        className={`truncate text-[11.5px] ${
                          m.unread ? "font-medium text-zinc-200" : "text-zinc-400"
                        }`}
                      >
                        {m.subject}
                      </p>

                      {/* Snippet */}
                      {m.snippet && (
                        <p className="line-clamp-1 text-[11px] text-zinc-400 leading-normal">
                          {m.snippet}
                        </p>
                      )}

                      {/* Hover action to open in external Gmail */}
                      {m.id && (
                        <a
                          href={`https://mail.google.com/mail/u/0/#inbox/${m.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open in Gmail"
                          className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-all"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {selectedMailId && (
        <MailReaderOverlay
          message={detailQuery.data?.message ?? fallbackReaderMessage}
          isLoading={detailQuery.isLoading}
          error={detailQuery.data?.error}
          onClose={() => setSelectedMailId(null)}
          formatSender={parseSender}
          formatDate={formatMailDate}
        />
      )}
    </div>
  );
}

function MailSkeletonRows() {
  return (
    <div className="flex flex-col gap-2 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-1.5 py-2 px-1 border-b border-white/[0.04]">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-1/3 bg-white/10" />
            <Skeleton className="h-2.5 w-1/5 bg-white/5" />
          </div>
          <Skeleton className="h-3 w-4/5 bg-white/5" />
        </div>
      ))}
    </div>
  );
}
