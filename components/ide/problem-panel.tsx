"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { generateProblemAction } from "@/lib/actions/code-runner";
import { unwrapAction } from "@/lib/query-utils";
import { findLanguage, type CodeLanguageId } from "@/lib/code-runner/languages";
import type { GeneratedProblem } from "@/lib/code-runner/problem";

interface ProblemPanelProps {
  languageId: CodeLanguageId;
  question: string;
  problem: GeneratedProblem | null;
  canWrite: boolean;
  onQuestionChange: (question: string) => void;
  onGenerated: (problem: GeneratedProblem) => void;
  onReset: () => void;
}

/**
 * Assisted mode's left-hand half: paste a question, get a stub plus a harness.
 *
 * Generation is per-language on purpose (see lib/code-runner/problem.ts), so
 * switching language here offers a regenerate rather than silently reusing a
 * harness written for another language.
 */
export function ProblemPanel({
  languageId,
  question,
  problem,
  canWrite,
  onQuestionChange,
  onGenerated,
  onReset,
}: ProblemPanelProps) {
  const generateMutation = useMutation({
    mutationFn: (input: { question: string; languageId: CodeLanguageId }) => unwrapAction(generateProblemAction(input)),
    onSuccess: (result) => {
      if (result.data) onGenerated(result.data);
    },
  });

  const languageLabel = findLanguage(languageId)?.label ?? languageId;

  function handleGenerate() {
    generateMutation.mutate({ question, languageId });
  }

  if (problem) {
    return (
      <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto scrollbar-thin p-3">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-[13.5px] font-semibold text-foreground">{problem.title}</h2>
          {canWrite && (
            <button
              type="button"
              onClick={onReset}
              title="Start from a different question"
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              New
            </button>
          )}
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{problem.summary}</p>

        <div className="rounded-lg border border-border bg-card px-2.5 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Implement</p>
          <p className="mt-1 font-mono text-[12px] text-foreground">{problem.functionName}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{problem.signatureNote}</p>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Test cases ({problem.testCases.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {problem.testCases.map((testCase, index) => (
              <li key={`${testCase.name}-${index}`} className="rounded-lg border border-border bg-card px-2.5 py-1.5">
                <p className="text-[12px] font-medium text-foreground">{testCase.name}</p>
                <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-2 font-mono text-[11.5px] text-muted-foreground">
                  <dt>in</dt>
                  <dd className="break-all">{testCase.input}</dd>
                  <dt>out</dt>
                  <dd className="break-all">{testCase.expected}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2.5 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
        <h2 className="text-[13px] font-semibold text-foreground">Paste a coding question</h2>
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        You get one function to implement in {languageLabel}, plus 3–5 test cases. The driver code is written for you and
        stays out of your way.
      </p>

      {generateMutation.error && (
        <div className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-[11.5px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{generateMutation.error.message}</span>
        </div>
      )}

      <textarea
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        disabled={!canWrite}
        placeholder="Given an array of integers, return the indices of the two numbers that add up to a target…"
        className="min-h-40 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 scrollbar-thin"
      />

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canWrite || generateMutation.isPending || question.trim().length < 20}
        className="widget-btn-primary flex items-center justify-center gap-1.5 px-4 py-2 text-[12.5px] disabled:opacity-50 cursor-pointer"
      >
        {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {generateMutation.isPending ? "Generating…" : `Generate for ${languageLabel}`}
      </button>
    </div>
  );
}
