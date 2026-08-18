"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { getRunResultAction, runCodeAction } from "@/lib/actions/code-runner";
import { updateWidgetDataAction } from "@/lib/actions/widgets";
import { unwrapAction } from "@/lib/query-utils";
import { CODE_LANGUAGES, STARTER_SOURCE, type CodeLanguageId } from "@/lib/code-runner/languages";
import { problemHarness, type GeneratedProblem } from "@/lib/code-runner/problem";
import { codeWidgetTitle, type CodeMode, type CodeWidgetData } from "@/lib/code-runner/widget-data";
import { codeSyncPost } from "@/lib/code-runner/sync";
import { ProblemPanel } from "@/components/ide/problem-panel";
import { RunOutput } from "@/components/ide/run-output";

/** Monaco touches `window` and `Worker` at module scope, so it can't be part of
 *  the server render. */
const CodeEditor = dynamic(() => import("@/components/ide/code-editor").then((mod) => mod.CodeEditor), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-[12.5px] text-muted-foreground">Loading editor…</div>,
});

/** Long enough that a burst of typing is one write, short enough that closing
 *  the window straight after a keystroke rarely outruns it. Discrete actions
 *  (language, mode, generate, run) flush immediately instead of waiting. */
const SAVE_DEBOUNCE_MS = 600;

interface IdeShellProps {
  slug: string;
  widgetId: string;
  initialData: CodeWidgetData;
  canWrite: boolean;
}

export function IdeShell({ slug, widgetId, initialData, canWrite }: IdeShellProps) {
  const [data, setData] = useState<CodeWidgetData>(initialData);
  const [token, setToken] = useState<string | null>(null);

  // Mirrors `data` so a change handler can build the next value without reading
  // state inside a setState updater (which would make the update impure).
  const dataRef = useRef(data);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<CodeWidgetData | null>(null);

  const saveMutation = useMutation({
    mutationFn: (next: CodeWidgetData) =>
      unwrapAction(updateWidgetDataAction(widgetId, next as unknown as Record<string, unknown>)),
    // The canvas card lives in a different document, so its QueryClient can't be
    // invalidated from here — it listens on a BroadcastChannel instead. Posting
    // only after the write lands means the card never shows unsaved state.
    onSuccess: (_result, next) => codeSyncPost({ widgetId, data: next }),
    retry: 2,
  });

  const { mutate: save } = saveMutation;

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const next = pendingSave.current;
    pendingSave.current = null;
    if (next && canWrite) save(next);
  }, [canWrite, save]);

  const scheduleSave = useCallback(
    (next: CodeWidgetData, immediate = false) => {
      if (!canWrite) return;
      pendingSave.current = next;
      if (immediate) {
        flushSave();
        return;
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    },
    [canWrite, flushSave],
  );

  const applyChange = useCallback(
    (patch: Partial<CodeWidgetData>, immediate = false) => {
      const next = { ...dataRef.current, ...patch };
      dataRef.current = next;
      setData(next);
      scheduleSave(next, immediate);
    },
    [scheduleSave],
  );

  // Closing the window is how people finish here, so a debounced keystroke has
  // to get one last chance to go out. Best effort by nature — the request may be
  // cut off mid-flight, which is why the debounce is short and every discrete
  // action saves immediately rather than waiting.
  useEffect(() => {
    const onPageHide = () => flushSave();
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("blur", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("blur", onPageHide);
    };
  }, [flushSave]);

  const runMutation = useMutation({
    mutationFn: (input: Parameters<typeof runCodeAction>[0]) => unwrapAction(runCodeAction(input)),
    onSuccess: (response) => setToken(response.data?.token ?? null),
    // A rejected key, an exhausted quota or a rate limit fails identically every
    // time, and a retry spends another submission against the same quota.
    retry: 0,
  });

  /**
   * Judge0 is asked not to wait, so the result is polled. Polling stops the
   * moment the submission leaves the queued/processing states — see
   * `isJudge0Finished`.
   */
  const resultQuery = useQuery({
    queryKey: ["codeRun", token],
    queryFn: () => unwrapAction(getRunResultAction(token as string)),
    enabled: Boolean(token),
    refetchInterval: (query) => (query.state.data?.data?.finished ? false : 1200),
    retry: 1,
    gcTime: 0,
  });

  const result = resultQuery.data?.data;

  const handleRun = useCallback(() => {
    // What runs must be what's stored, so this doesn't wait on the debounce.
    flushSave();
    setToken(null);
    const current = dataRef.current;
    runMutation.mutate({
      languageId: current.languageId,
      code: current.code,
      stdin: current.mode === "manual" ? current.stdin : undefined,
      harness: current.mode === "assisted" && current.problem ? problemHarness(current.problem) : null,
    });
  }, [flushSave, runMutation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRun]);

  /**
   * A generated harness is written for one specific language — a Java `class
   * Solution {` wrapper around Python code is a compile error nobody could
   * explain — so switching language discards the scaffolding and offers a
   * regeneration. The question survives, since that's the part worth keeping.
   */
  function handleLanguageChange(next: CodeLanguageId) {
    const current = dataRef.current;
    if (current.mode === "assisted" && current.problem) {
      applyChange({ languageId: next, problem: null, code: "" }, true);
      return;
    }
    const untouched = current.code.trim() === "" || current.code.trim() === STARTER_SOURCE[current.languageId].trim();
    applyChange({ languageId: next, code: untouched ? STARTER_SOURCE[next] : current.code }, true);
  }

  function handleModeChange(next: CodeMode) {
    if (next === dataRef.current.mode) return;
    applyChange({ mode: next }, true);
  }

  // A result from the previous problem would be nonsense against a new one.
  function handleGenerated(problem: GeneratedProblem) {
    applyChange({ mode: "assisted", problem, code: problem.stubCode }, true);
    setToken(null);
  }

  function handleResetProblem() {
    applyChange({ problem: null, code: "" }, true);
    setToken(null);
  }

  const runError = runMutation.error?.message ?? resultQuery.error?.message;
  const running = runMutation.isPending || Boolean(token && result && !result.finished) || (Boolean(token) && !result);
  const title = useMemo(() => codeWidgetTitle(data), [data]);

  return (
    <main className="flex h-screen min-h-0 flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{title}</h1>

        <SaveStatus canWrite={canWrite} pending={saveMutation.isPending} failed={saveMutation.isError} />

        <div className="flex items-center rounded-full border border-border p-0.5">
          {(["manual", "assisted"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeChange(mode)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors cursor-pointer ${
                data.mode === mode ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "manual" ? "Manual" : "AI-assisted"}
            </button>
          ))}
        </div>

        <select
          value={data.languageId}
          onChange={(event) => handleLanguageChange(event.target.value as CodeLanguageId)}
          disabled={!canWrite}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          {CODE_LANGUAGES.map((language) => (
            <option key={language.id} value={language.id}>
              {language.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          title="Run (Ctrl/⌘ + Enter)"
          className="widget-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] disabled:opacity-60 cursor-pointer"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Running…" : "Run"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {data.mode === "assisted" && (
          <section className="flex w-[340px] shrink-0 flex-col border-r border-border">
            <ProblemPanel
              languageId={data.languageId}
              question={data.question}
              problem={data.problem}
              canWrite={canWrite}
              onQuestionChange={(question) => applyChange({ question })}
              onGenerated={handleGenerated}
              onReset={handleResetProblem}
            />
          </section>
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <CodeEditor
              languageId={data.languageId}
              value={data.code}
              readOnly={!canWrite}
              onChange={(code) => applyChange({ code })}
            />
          </div>

          {/* Assisted mode embeds its cases in the harness and reads no stdin, so
              the input box would be a control with no effect. */}
          {data.mode === "manual" && (
            <div className="flex shrink-0 flex-col gap-1 border-t border-border px-3 py-2">
              <label htmlFor="stdin" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Input (stdin)
              </label>
              <textarea
                id="stdin"
                value={data.stdin}
                onChange={(event) => applyChange({ stdin: event.target.value })}
                disabled={!canWrite}
                rows={3}
                placeholder="Anything your program reads from standard input"
                className="resize-none rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[12px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 scrollbar-thin"
              />
            </div>
          )}
        </section>

        <section className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-l border-border scrollbar-thin">
          <h2 className="shrink-0 border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Output
          </h2>
          <RunOutput mode={data.mode} result={result} pending={runMutation.isPending} error={runError} />
        </section>
      </div>

      <footer className="shrink-0 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        {slug} · saved to this workspace
      </footer>
    </main>
  );
}

function SaveStatus({ canWrite, pending, failed }: { canWrite: boolean; pending: boolean; failed: boolean }) {
  if (!canWrite) return <span className="text-[11.5px] text-muted-foreground">View only</span>;
  if (failed) {
    return (
      <span className="flex items-center gap-1 text-[11.5px] text-destructive">
        <AlertCircle className="h-3 w-3" />
        Not saved
      </span>
    );
  }
  if (pending) {
    return (
      <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
      <Check className="h-3 w-3" />
      Saved
    </span>
  );
}
