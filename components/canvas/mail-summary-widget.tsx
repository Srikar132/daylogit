"use client";

import { Loader2, Mail, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getGmailStatus, getTodayMessages } from "@/lib/actions/gmail";
import { GMAIL_READONLY_SCOPE, type GmailMessageSummary } from "@/lib/gmail";

type LoadState =
  | { phase: "checking" }
  | { phase: "disconnected" }
  | { phase: "loading" }
  | { phase: "ready"; messages: GmailMessageSummary[] }
  | { phase: "error"; message: string };

export function MailSummaryWidget() {
  const [state, setState] = useState<LoadState>({ phase: "checking" });
  const [isConnecting, setIsConnecting] = useState(false);

  const load = useCallback(async () => {
    const status = await getGmailStatus();
    if (!status.connected) {
      setState({ phase: "disconnected" });
      return;
    }
    setState({ phase: "loading" });
    const result = await getTodayMessages();
    if (result.error) {
      setState({ phase: "error", message: result.error });
    } else {
      setState({ phase: "ready", messages: result.messages ?? [] });
    }
  }, []);

  useEffect(() => {
    // Legitimate fetch-on-mount — there's no prop/state to derive this from
    // during render, it's an external Gmail API call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-2 pb-3">
        <Mail className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
        <h2 className="flex-1 truncate text-[13.5px] font-medium text-[#e8eaed]">
          Today&apos;s Mail
        </h2>
        {state.phase === "ready" && (
          <button
            type="button"
            onClick={load}
            title="Refresh"
            className="rounded-md p-1 text-[#9aa0a6] hover:bg-white/[0.06] hover:text-[#e8eaed] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        {state.phase === "checking" && (
          <div className="flex w-full items-center justify-center py-8 text-[#9aa0a6]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {state.phase === "disconnected" && (
          <div className="flex w-full flex-col items-center gap-3 py-6 text-center">
            <p className="text-[12.5px] text-[#9aa0a6]">
              Connect Gmail to see today&apos;s emails here.
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 rounded-full bg-[#8ab4f8] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#141414] disabled:opacity-50 cursor-pointer"
            >
              {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Connect Gmail
            </button>
          </div>
        )}

        {state.phase === "loading" && (
          <div className="flex w-full items-center justify-center py-8 text-[#9aa0a6]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {state.phase === "error" && (
          <p className="w-full text-center text-[12.5px] text-[#f28b82]">{state.message}</p>
        )}

        {state.phase === "ready" &&
          (state.messages.length === 0 ? (
            <p className="w-full py-6 text-center text-[12.5px] text-[#9aa0a6]">
              No new emails today.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {state.messages.map((m, i) => (
                <div key={i} className="rounded-lg bg-white/[0.05] px-2.5 py-2">
                  <span className="min-w-0 truncate text-[12.5px] font-medium text-[#e8eaed]">
                    {m.subject}
                  </span>
                  <p className="truncate text-[11.5px] text-[#9aa0a6]">{m.from}</p>
                  {m.snippet && (
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[#80868b]">
                      {m.snippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
