"use client";

import { AlertCircle, Check, Loader2, X } from "lucide-react";
import type { RunResult } from "@/lib/actions/code-runner";
import type { CodeMode } from "@/lib/code-runner/widget-data";

interface RunOutputProps {
  mode: CodeMode;
  result?: RunResult;
  pending: boolean;
  error?: string;
}

export function RunOutput({ mode, result, pending, error }: RunOutputProps) {
  if (error) {
    return (
      <Notice tone="error">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{error}</span>
      </Notice>
    );
  }

  if (pending || (result && !result.finished)) {
    return (
      <Notice tone="muted">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span>{result?.status ?? "Queued"}…</span>
      </Notice>
    );
  }

  if (!result) {
    return <p className="px-3 py-2 text-[12.5px] text-muted-foreground">Run to see output here.</p>;
  }

  const passed = result.cases.filter((entry) => entry.passed).length;

  return (
    <div className="flex flex-col gap-3 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
        <span className="font-medium text-foreground">{result.status}</span>
        {result.cases.length > 0 && (
          <span>
            {passed}/{result.cases.length} passed
          </span>
        )}
        {result.time && <span>{result.time}s</span>}
        {result.memory !== null && <span>{Math.round(result.memory / 1024)} MB</span>}
      </div>

      {/* Judge0 reports a build failure, a crash and a sandbox rejection in three
          different fields; the action collapses them into one so there's a single
          place to look. */}
      {result.failure && (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-2 font-mono text-[11.5px] text-destructive scrollbar-thin">
          {result.failure}
        </pre>
      )}

      {result.cases.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {result.cases.map((entry, index) => (
            <li
              key={`${entry.name}-${index}`}
              className={`rounded-lg border px-2.5 py-2 ${
                entry.passed ? "border-border bg-card" : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {entry.passed ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
                )}
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{entry.name}</span>
              </div>
              {!entry.passed && (
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[11.5px]">
                  <dt className="text-muted-foreground">expected</dt>
                  <dd className="break-all text-foreground">{entry.expected || "—"}</dd>
                  <dt className="text-muted-foreground">got</dt>
                  <dd className="break-all text-destructive">{entry.actual || "—"}</dd>
                </dl>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Assisted mode's results come from marked lines, so anything unmarked is
          the user's own printing — usually debugging a failing case, which is
          exactly when it must not be swallowed. */}
      {mode === "assisted" && result.logs && (
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your output</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-[11.5px] text-foreground scrollbar-thin">
            {result.logs}
          </pre>
        </div>
      )}

      {mode === "manual" && (
        <pre className="max-h-full min-h-16 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-[11.5px] text-foreground scrollbar-thin">
          {result.stdout || (result.failure ? "" : "(no output)")}
        </pre>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "muted"; children: React.ReactNode }) {
  return (
    <div
      className={`m-3 flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] ${
        tone === "error" ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </div>
  );
}
