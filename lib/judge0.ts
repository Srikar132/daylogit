import { findLanguage, resolveJudge0LanguageId, type CodeLanguage } from "@/lib/code-runner/languages";

/**
 * Judge0 transport. Server-only — the key must never reach the browser.
 *
 * Works against any Judge0 instance:
 *
 * - **Self-hosted** (what this project runs — see docker/judge0): `JUDGE0_URL`
 *   plus `JUDGE0_KEY` set to the instance's `AUTHN_TOKEN`. The token is mandatory
 *   for anything reachable from the internet — Judge0 runs arbitrary code.
 * - **judge0.com**: `JUDGE0_URL` plus `JUDGE0_KEY`, sent as `X-Auth-Token`.
 * - **Judge0 CE on RapidAPI**: additionally set `JUDGE0_HOST`, whose presence is
 *   what switches authentication over to the RapidAPI headers.
 *
 * With no `JUDGE0_URL` every call reports a configuration error instead of
 * throwing, the same graceful degradation as `lib/email.ts` and
 * `lib/rate-limit.ts`, so dev and CI need no secrets.
 */

const JUDGE0_URL = process.env.JUDGE0_URL?.replace(/\/+$/, "");
const JUDGE0_KEY = process.env.JUDGE0_KEY;
const JUDGE0_HOST = process.env.JUDGE0_HOST;

export const JUDGE0_UNCONFIGURED_ERROR = "Code execution isn't configured on this server (JUDGE0_URL).";

/** Only the URL is checked. Judge0's auth token is per-instance and optional, so
 *  requiring a key here would report a perfectly good unauthenticated instance as
 *  misconfigured — and a wrong or missing token surfaces as Judge0's own 401,
 *  which says far more than a generic "not configured" would. */
export function isJudge0Configured(): boolean {
  return Boolean(JUDGE0_URL);
}

function headers(): HeadersInit {
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (!JUDGE0_KEY) return base;
  if (JUDGE0_HOST) {
    base["X-RapidAPI-Key"] = JUDGE0_KEY;
    base["X-RapidAPI-Host"] = JUDGE0_HOST;
  } else {
    base["X-Auth-Token"] = JUDGE0_KEY;
  }
  return base;
}

/** Judge0 status ids 1 and 2 are "queued" and "processing"; everything above is
 *  a terminal state. Only that boundary is consulted — the specific terminal
 *  status is shown to the user as Judge0's own description rather than being
 *  branched on. */
const JUDGE0_LAST_PENDING_STATUS = 2;

export type Judge0Result = {
  status: { id: number; description: string };
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  time: string | null;
  memory: number | null;
};

export function isJudge0Finished(result: Judge0Result): boolean {
  return result.status.id > JUDGE0_LAST_PENDING_STATUS;
}

/**
 * `/languages` is cached for the life of the server instance.
 *
 * Judge0's numeric ids are fixed per instance and only move when the instance
 * upgrades a compiler, so a per-request lookup would spend a quota-counted round
 * trip on data that never changes. Fluid Compute reuses instances, so this
 * survives across requests.
 */
let languageCache: Array<{ id: number; name: string }> | null = null;

async function fetchLanguages(): Promise<Array<{ id: number; name: string }>> {
  if (languageCache) return languageCache;

  const response = await fetch(`${JUDGE0_URL}/languages`, {
    headers: headers(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Judge0 /languages failed (${response.status}).`);

  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error("Judge0 /languages returned an unexpected shape.");

  languageCache = body.filter(
    (entry): entry is { id: number; name: string } =>
      typeof entry === "object" && entry !== null && typeof (entry as { id?: unknown }).id === "number" && typeof (entry as { name?: unknown }).name === "string",
  );
  return languageCache;
}

/**
 * Our language id to this instance's numeric id.
 *
 * A failed `/languages` call falls back to the CE ids rather than failing the
 * run: those ids are correct on every Judge0 CE deployment, so a listing outage
 * shouldn't take code execution down with it.
 */
export async function judge0LanguageId(languageId: string): Promise<number> {
  const language: CodeLanguage | undefined = findLanguage(languageId);
  if (!language) throw new Error(`Unsupported language: ${languageId}`);

  try {
    return resolveJudge0LanguageId(language, await fetchLanguages());
  } catch {
    return language.judge0FallbackId;
  }
}

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");
const decode = (value: string | null | undefined) => (value ? Buffer.from(value, "base64").toString("utf8") : "");

/**
 * Creates a submission and returns its token.
 *
 * `wait=false` on purpose. Judge0's synchronous mode is disabled on most hosted
 * instances, and where it works it holds the HTTP connection open for the whole
 * compile-and-run — which on a serverless function means paying for the wait and
 * risking the request timeout. The client polls instead.
 *
 * `base64_encoded=true` so source and stdin survive intact; Judge0 otherwise
 * requires the payload to be valid UTF-8 JSON and rejects some binary input.
 */
export async function createJudge0Submission(input: {
  source: string;
  languageId: number;
  stdin?: string;
}): Promise<string> {
  const response = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`, {
    method: "POST",
    headers: headers(),
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      language_id: input.languageId,
      source_code: encode(input.source),
      stdin: encode(input.stdin ?? ""),
      cpu_time_limit: 5,
      wall_time_limit: 10,
      memory_limit: 128000,
    }),
  });

  if (!response.ok) {
    throw new Error(await judge0ErrorMessage(response));
  }

  const body: unknown = await response.json();
  const token = (body as { token?: unknown })?.token;
  if (typeof token !== "string" || token.length === 0) throw new Error("Judge0 did not return a submission token.");
  return token;
}

export async function getJudge0Submission(token: string): Promise<Judge0Result> {
  const fields = "stdout,stderr,compile_output,message,status,time,memory";
  const response = await fetch(
    `${JUDGE0_URL}/submissions/${encodeURIComponent(token)}?base64_encoded=true&fields=${fields}`,
    { headers: headers(), signal: AbortSignal.timeout(15_000) },
  );

  if (!response.ok) {
    throw new Error(await judge0ErrorMessage(response));
  }

  const body = (await response.json()) as {
    status?: { id?: number; description?: string };
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    message?: string | null;
    time?: string | null;
    memory?: number | null;
  };

  return {
    status: { id: body.status?.id ?? 0, description: body.status?.description ?? "Unknown" },
    stdout: decode(body.stdout),
    stderr: decode(body.stderr),
    compileOutput: decode(body.compile_output),
    message: decode(body.message),
    time: body.time ?? null,
    memory: body.memory ?? null,
  };
}

/** Quota exhaustion is the failure people will actually hit, so it gets its own
 *  wording rather than a bare status code. */
async function judge0ErrorMessage(response: Response): Promise<string> {
  if (response.status === 429) {
    return "Judge0's rate limit is exhausted — wait a moment, or move off the free tier.";
  }
  if (response.status === 401 || response.status === 403) {
    return "Judge0 rejected the API key. Check JUDGE0_KEY.";
  }
  const text = await response.text().catch(() => "");
  const detail = text.slice(0, 200).trim();
  return `Judge0 request failed (${response.status})${detail ? `: ${detail}` : ""}.`;
}
