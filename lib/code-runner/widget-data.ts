import { DEFAULT_LANGUAGE, isCodeLanguageId, STARTER_SOURCE, type CodeLanguageId } from "@/lib/code-runner/languages";
import { problemSchema, type GeneratedProblem } from "@/lib/code-runner/problem";

/**
 * What a code widget stores, and the one place it's read out of the database's
 * untyped `data` column.
 *
 * Three separate callers read this — the canvas card, the editor window, and the
 * run action — so it lives here as a shared normaliser rather than being
 * re-derived at each site. That's the same lesson as `BookmarkData`: when the
 * shape is duplicated, the action and the widget drift apart.
 */

export const CODE_MODES = ["manual", "assisted"] as const;
export type CodeMode = (typeof CODE_MODES)[number];

export type CodeWidgetData = {
  mode: CodeMode;
  languageId: CodeLanguageId;
  /** Just the user's code. The assisted-mode harness is never mixed into it. */
  code: string;
  /** Manual mode only — assisted mode's harness embeds its cases and reads no stdin. */
  stdin: string;
  /** Assisted mode: the question as pasted, kept so it can be regenerated for another language. */
  question: string;
  problem: GeneratedProblem | null;
};

const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

export function normalizeCodeWidgetData(raw: Record<string, unknown> | undefined): CodeWidgetData {
  const languageId: CodeLanguageId = isCodeLanguageId(raw?.languageId) ? raw.languageId : DEFAULT_LANGUAGE;
  const mode: CodeMode = raw?.mode === "assisted" ? "assisted" : "manual";

  // A problem that no longer parses (shape changed, row hand-edited) is dropped
  // rather than half-trusted — a harness with a missing suffix produces a
  // compile error nobody can explain.
  const parsedProblem = raw?.problem ? problemSchema.safeParse(raw.problem) : null;
  const problem = parsedProblem?.success ? parsedProblem.data : null;

  return {
    mode: mode === "assisted" && !problem && !asString(raw?.question) ? "manual" : mode,
    languageId,
    code: asString(raw?.code, STARTER_SOURCE[languageId]),
    stdin: asString(raw?.stdin),
    question: asString(raw?.question),
    problem,
  };
}

/** Card label. Derived rather than stored so renaming a generated problem can't
 *  leave a stale copy behind. */
export function codeWidgetTitle(data: CodeWidgetData): string {
  if (data.problem) return data.problem.title;
  if (data.mode === "assisted") return "New exercise";
  return "Scratch code";
}

/** First non-blank, non-comment line — enough for the card to show that the
 *  widget holds something without rendering an editor on the canvas. */
export function codeWidgetPreview(data: CodeWidgetData): string {
  const line = data.code
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && !entry.startsWith("//") && !entry.startsWith("#") && !entry.startsWith("/*"));
  return line ?? "";
}
