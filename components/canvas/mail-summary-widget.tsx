"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import {
  getGmailStatus,
  getTodayMessages,
  getMessageDetail,
  type GmailStatus,
} from "@/lib/actions/gmail";
import { GMAIL_READONLY_SCOPE, type GmailMessageSummary } from "@/lib/gmail";
import { Skeleton } from "@/components/ui/skeleton";
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
    queryFn: getTodayMessages,
    initialData: initialMessages ? { messages: initialMessages } : undefined,
    enabled: connected,
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

  const messages = messagesQuery.data?.messages ?? [];
  const loadingMessages = connected && messagesQuery.isLoading;

  const unreadCount = useMemo(() => messages.filter((m) => m.unread).length, [messages]);

  const selectedMailSummary = useMemo(
    () => messages.find((m) => m.id === selectedMailId),
    [messages, selectedMailId],
  );

  return (
    <div className="flex h-full flex-col p-3.5 select-none">
      {/* Executive macOS Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          {selectedMailId ? (
            <button
              type="button"
              onClick={() => setSelectedMailId(null)}
              className="flex items-center gap-1 text-[12px] font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
              <span>Inbox</span>
            </button>
          ) : (
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
          <div className="flex w-full items-center justify-center gap-1.5 py-8 text-center text-[12px] text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Couldn&apos;t load emails.
          </div>
        )}

        {/* INDIVIDUAL MAIL READER VIEW */}
        {connected && selectedMailId && (
          <div className="nodrag nowheel flex flex-1 flex-col overflow-y-auto scrollbar-thin pr-1 space-y-2.5">
            {detailQuery.isLoading ? (
              <div className="flex flex-col gap-2.5 py-2">
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/3 bg-white/5" />
                <Skeleton className="h-28 w-full rounded-xl bg-white/5" />
              </div>
            ) : detailQuery.data?.error ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <AlertCircle className="h-4 w-4 text-red-400 mb-1.5" />
                <p className="text-[12px] text-zinc-300">{detailQuery.data.error}</p>
                <button
                  type="button"
                  onClick={() => setSelectedMailId(null)}
                  className="mt-2 text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Back to inbox
                </button>
              </div>
            ) : detailQuery.data?.message ? (
              <DetailView message={detailQuery.data.message} />
            ) : selectedMailSummary ? (
              <DetailView
                message={{
                  id: selectedMailSummary.id,
                  subject: selectedMailSummary.subject,
                  from: selectedMailSummary.from,
                  snippet: selectedMailSummary.snippet,
                  date: selectedMailSummary.date,
                  bodyText: selectedMailSummary.snippet,
                }}
              />
            ) : null}
          </div>
        )}

        {/* INBOX LIST VIEW */}
        {connected && !loadingMessages && !messagesQuery.isError && !selectedMailId && (
          <>
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-[12px] text-zinc-400">
                No emails received today.
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
    </div>
  );
}

function DetailView({
  message,
}: {
  message: {
    id: string;
    subject: string;
    from: string;
    snippet: string;
    date?: string;
    bodyText?: string;
    bodyHtml?: string;
  };
}) {
  const sender = parseSender(message.from);
  const formattedTime = formatMailDate(message.date);

  return (
    <div className="flex flex-col gap-2.5 py-0.5">
      {/* Subject Line */}
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
        <h3 className="text-[13.5px] font-semibold text-zinc-100 leading-snug">{message.subject}</h3>
        {message.id && (
          <a
            href={`https://mail.google.com/mail/u/0/#inbox/${message.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Gmail"
            className="flex items-center gap-1 shrink-0 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Gmail
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {/* Sender info */}
      <div className="flex items-center justify-between gap-2 text-[11.5px]">
        <div className="min-w-0">
          <span className="font-semibold text-zinc-200">{sender.name}</span>
          <span className="ml-1.5 text-zinc-400 font-mono text-[10.5px] truncate">&lt;{sender.email}&gt;</span>
        </div>
        {formattedTime && (
          <span className="text-[10.5px] text-zinc-400 font-mono shrink-0">{formattedTime}</span>
        )}
      </div>

      {/* Email Body Container */}
      <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 text-[11.5px] leading-relaxed text-zinc-300 whitespace-pre-wrap select-text font-sans min-h-[100px]">
        {message.bodyHtml ? (
          <div
            className="prose-note text-zinc-300 text-[11.5px] leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
          />
        ) : (
          message.bodyText || message.snippet
        )}
      </div>
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
