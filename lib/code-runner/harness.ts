import type { CodeLanguageId } from "@/lib/code-runner/languages";

/**
 * Assembling a runnable file, and reading per-test-case results back out of its
 * stdout.
 *
 * Two constraints shape all of this:
 *
 * 1. **Assembly is prefix + user code + suffix, never append.** Judge0 compiles
 *    a single file and Java requires the entry point to be `public class Main`,
 *    of which a file may hold exactly one — so the user's function has to sit
 *    inside a *non*-public `class Solution` that the harness opens before it and
 *    closes after. C++ has the same ordering constraint for a different reason
 *    (a function must be declared above the `main` that calls it). Python and JS
 *    would tolerate a plain append; one uniform model beats four special cases.
 *
 * 2. **One submission per run, not one per test case.** The harness embeds the
 *    cases as literals and loops them itself, so a five-case run costs one
 *    Judge0 submission instead of five — the difference between ~50 and ~10 runs
 *    a day on the free tier. The cost is that a hang or a segfault takes the
 *    whole batch down rather than one case, which is why `parseRunOutput`
 *    returns whatever cases did report before the crash.
 */

/**
 * Marks a line as a machine-readable case result rather than program output.
 *
 * Everything unmarked is treated as the user's own printing and surfaced
 * separately as logs — without this, a stray `print()` inside the function under
 * test would corrupt the results table (and debug printing is exactly what
 * someone does when a case fails).
 */
export const CASE_SENTINEL = "__HELM_CASE__";

/**
 * Field separator. Deliberately printable ASCII: the obvious choice of an ASCII
 * unit separator can't be written safely as a C++ literal, because `"\x1f"`
 * followed by a hex digit — `"\x1fFAIL"` — is parsed as ONE oversized hex
 * escape rather than a separator plus text.
 */
export const CASE_DELIMITER = "~|~";

export type ProblemHarness = {
  prefix: string;
  suffix: string;
};

/**
 * Manual mode passes no harness and runs the file exactly as written; assisted
 * mode wraps it. The blank-line padding matters for Python, where the user's
 * code has to start at column 0 on its own line.
 */
export function assembleSource(userCode: string, harness?: ProblemHarness | null): string {
  if (!harness) return userCode;
  return `${harness.prefix}\n${userCode}\n${harness.suffix}\n`;
}

export type CaseResult = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
};

export type ParsedRunOutput = {
  cases: CaseResult[];
  /** Anything the program printed that wasn't a case result line. */
  logs: string;
};

/**
 * Comparison is ours, not Judge0's.
 *
 * Judge0 can compare stdout against an `expected_output` itself and report
 * status 4 (Wrong Answer), but that check is whitespace-exact — a trailing
 * newline difference reads as a wrong answer. Normalising here keeps the rule
 * visible and adjustable.
 */
export function outputsMatch(expected: string, actual: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(actual);
}

function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function parseRunOutput(stdout: string): ParsedRunOutput {
  const cases: CaseResult[] = [];
  const logLines: string[] = [];

  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.startsWith(CASE_SENTINEL)) {
      logLines.push(rawLine);
      continue;
    }
    // Leading empty field is the sentinel's own segment.
    const [, name = "", expected = "", actual = ""] = line.slice(CASE_SENTINEL.length).split(CASE_DELIMITER);
    cases.push({
      name: name.trim(),
      expected,
      actual,
      passed: outputsMatch(expected, actual),
    });
  }

  return { cases, logs: logLines.join("\n").trim() };
}

/**
 * The contract the generated harness has to satisfy, injected into the model
 * prompt AND repeated here so the parser and the generator can't drift apart.
 */
export function harnessProtocolSpec(language: CodeLanguageId): string {
  const printCall: Record<CodeLanguageId, string> = {
    cpp: 'std::cout << "..." << std::endl;',
    java: "System.out.println(\"...\");",
    python: 'print("...")',
    javascript: 'console.log("...");',
  };

  return [
    `For every test case the harness must print EXACTLY ONE line, using ${printCall[language]}:`,
    "",
    `${CASE_SENTINEL}${CASE_DELIMITER}<case name>${CASE_DELIMITER}<expected value>${CASE_DELIMITER}<actual value>`,
    "",
    `- The line starts with the literal text ${CASE_SENTINEL} and fields are separated by the literal text ${CASE_DELIMITER}.`,
    "- Do NOT decide or print pass/fail; the caller compares expected against actual.",
    "- Both values must be rendered on a SINGLE line (a list as `[1, 2, 3]`, a boolean as `true`/`false`). A newline inside a value truncates that result.",
    "- Print nothing else. Any other output is shown to the user as their own program's logs.",
    "- Wrap each case so one throwing case does not stop the rest, printing the error text as the actual value.",
  ].join("\n");
}
