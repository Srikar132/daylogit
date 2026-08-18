"use server";

import { z } from "zod";
import { generateObject, NoObjectGeneratedError } from "ai";
import { requireViewerContext } from "@/lib/workspace";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createJudge0Submission,
  getJudge0Submission,
  isJudge0Configured,
  isJudge0Finished,
  judge0LanguageId,
  JUDGE0_UNCONFIGURED_ERROR,
  type Judge0Result,
} from "@/lib/judge0";
import { assembleSource, parseRunOutput, type CaseResult } from "@/lib/code-runner/harness";
import { CODE_LANGUAGES } from "@/lib/code-runner/languages";
import { buildProblemPrompt, PROBLEM_SYSTEM_PROMPT, problemSchema, type GeneratedProblem } from "@/lib/code-runner/problem";

/** The model runs through Vercel AI Gateway (AI_GATEWAY_API_KEY), so a plain
 *  "provider/model" string is all that's needed — no provider package. */
const PROBLEM_MODEL = "anthropic/claude-opus-5";

const MAX_SOURCE_CHARS = 100_000;
const MAX_STDIN_CHARS = 20_000;

const languageIdSchema = z.enum(CODE_LANGUAGES.map((lang) => lang.id) as [string, ...string[]]);

const runSchema = z.object({
  languageId: languageIdSchema,
  code: z.string().max(MAX_SOURCE_CHARS),
  stdin: z.string().max(MAX_STDIN_CHARS).optional(),
  /** Assisted mode only. Absent means run the file exactly as written. */
  harness: z.object({ prefix: z.string().max(MAX_SOURCE_CHARS), suffix: z.string().max(MAX_SOURCE_CHARS) }).nullish(),
});

export type RunSubmission = { token: string };

/**
 * Starts a run and returns the submission token.
 *
 * Deliberately does NOT wait for the result: Judge0 queues submissions behind its
 * workers, so holding a server action open for a compile-and-run burns function
 * time and risks the request timeout. The client polls `getRunResultAction`.
 */
export async function runCodeAction(
  input: z.infer<typeof runSchema>,
): Promise<{ data?: RunSubmission; error?: string }> {
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid run request." };

  const viewer = await requireViewerContext();
  if (!isJudge0Configured()) return { error: JUDGE0_UNCONFIGURED_ERROR };

  // Every run is a third-party API call against a metered quota, so this is a
  // cost limit as much as an abuse limit.
  const rateLimit = await checkRateLimit(`run-code:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  const source = assembleSource(parsed.data.code, parsed.data.harness ?? null);
  if (source.trim().length === 0) return { error: "There's nothing to run yet." };

  try {
    const languageId = await judge0LanguageId(parsed.data.languageId);
    const token = await createJudge0Submission({
      source,
      languageId,
      // Assisted mode embeds its cases in the harness and reads no stdin, so
      // the input box belongs to manual mode alone.
      stdin: parsed.data.harness ? "" : (parsed.data.stdin ?? ""),
    });
    return { data: { token } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't start that run." };
  }
}

export type RunResult = {
  /** False while Judge0 still has the submission queued or processing. */
  finished: boolean;
  status: string;
  /** Set when the program failed rather than produced output. */
  failure?: string;
  stdout: string;
  /** Whatever the program printed that wasn't a marked case-result line. */
  logs: string;
  cases: CaseResult[];
  /** Seconds. */
  time: string | null;
  /** Kilobytes. */
  memory: number | null;
};

export async function getRunResultAction(token: string): Promise<{ data?: RunResult; error?: string }> {
  if (typeof token !== "string" || token.length === 0 || token.length > 128) return { error: "Invalid run token." };

  await requireViewerContext();
  if (!isJudge0Configured()) return { error: JUDGE0_UNCONFIGURED_ERROR };

  try {
    return { data: toRunResult(await getJudge0Submission(token)) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't read that run." };
  }
}

/**
 * Judge0 reports failures in three separate fields depending on how the program
 * died — `compile_output` for a build failure, `stderr` for a crash or uncaught
 * exception, and `message` for anything the sandbox itself rejected. Collapsing
 * them into one leaves the UI a single thing to render. The per-test-case split of
 * stdout happens here too, since it's the same work regardless of how the run was
 * started.
 */
function toRunResult(result: Judge0Result): RunResult {
  const { cases, logs } = parseRunOutput(result.stdout);
  const failure = [result.compileOutput, result.stderr, result.message].map((part) => part.trim()).find(Boolean);

  return {
    finished: isJudge0Finished(result),
    status: result.status.description,
    failure: failure || undefined,
    stdout: result.stdout,
    logs,
    cases,
    time: result.time,
    memory: result.memory,
  };
}

const generateSchema = z.object({
  question: z.string().trim().min(20, "Paste the full question — that's too short to work from.").max(8_000),
  languageId: languageIdSchema,
});

/**
 * Turns a pasted coding question into a stub plus a harness (assisted mode).
 *
 * One language per call — see lib/code-runner/problem.ts.
 */
export async function generateProblemAction(
  input: z.infer<typeof generateSchema>,
): Promise<{ data?: GeneratedProblem; error?: string }> {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid question." };

  const viewer = await requireViewerContext();
  if (!process.env.AI_GATEWAY_API_KEY) return { error: "AI generation isn't configured on this server." };

  const rateLimit = await checkRateLimit(`generate-problem:${viewer.userId}`);
  if (!rateLimit.success) return { error: rateLimit.error };

  try {
    const { object } = await generateObject({
      model: PROBLEM_MODEL,
      schema: problemSchema,
      system: PROBLEM_SYSTEM_PROMPT,
      prompt: buildProblemPrompt(parsed.data.question, parsed.data.languageId as GeneratedProblemLanguage),
    });
    return { data: object };
  } catch (err) {
    // A schema mismatch is the model's failure, not the user's — say so plainly
    // rather than surfacing a validation dump.
    if (NoObjectGeneratedError.isInstance(err)) {
      return { error: "The generated scaffolding came back malformed. Try again." };
    }
    return { error: err instanceof Error ? err.message : "Couldn't generate that problem." };
  }
}

type GeneratedProblemLanguage = Parameters<typeof buildProblemPrompt>[1];
