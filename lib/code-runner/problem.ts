import { z } from "zod";
import { harnessProtocolSpec, type ProblemHarness } from "@/lib/code-runner/harness";
import { findLanguage, type CodeLanguageId } from "@/lib/code-runner/languages";

/**
 * Assisted mode: turning a pasted coding question into a stub the user
 * implements plus a harness that exercises it.
 *
 * The model generates for ONE language at a time. Generating all four per
 * request quadrupled the output for three files that would be thrown away, and
 * switching language is a deliberate act that can afford a regeneration.
 */

export const problemSchema = z.object({
  title: z.string().min(1).max(120),
  /** The question restated in a couple of sentences, for the panel above the editor. */
  summary: z.string().min(1).max(1200),
  functionName: z.string().min(1).max(80),
  /** What the user has to implement, in prose: parameters, return value, constraints. */
  signatureNote: z.string().min(1).max(600),
  /** Editor contents: the signature with an unimplemented body. */
  stubCode: z.string().min(1),
  harnessPrefix: z.string(),
  harnessSuffix: z.string().min(1),
  testCases: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        input: z.string().min(1).max(400),
        expected: z.string().min(1).max(400),
      }),
    )
    .min(3)
    .max(5),
});

export type GeneratedProblem = z.infer<typeof problemSchema>;

export function problemHarness(problem: GeneratedProblem): ProblemHarness {
  return { prefix: problem.harnessPrefix, suffix: problem.harnessSuffix };
}

/**
 * Per-language structure. This is the part that can't be generic: the assembled
 * file is `prefix + userCode + suffix`, and what each of those three pieces may
 * legally contain differs by language (see lib/code-runner/harness.ts for why
 * the sandwich exists at all).
 */
const STRUCTURE: Record<CodeLanguageId, string> = {
  python: [
    "- `harnessPrefix`: imports only (`import sys`, `from typing import List`). No class wrapper.",
    "- `stubCode`: a single top-level `def` at column 0 with a docstring and a body of `pass`.",
    "- `harnessSuffix`: top-level driver code that calls the function directly by name.",
  ].join("\n"),
  javascript: [
    "- `harnessPrefix`: usually empty. Any helper the harness needs goes in the suffix.",
    "- `stubCode`: a single top-level `function` declaration with an empty body.",
    "- `harnessSuffix`: driver code that calls the function directly by name. Node 12+ syntax only — no top-level await.",
  ].join("\n"),
  cpp: [
    "- `harnessPrefix`: `#include` directives, `using namespace std;`, and any struct/typedef the signature needs.",
    "- `stubCode`: the function definition alone, with an empty body returning a default value.",
    "- `harnessSuffix`: `int main() { ... return 0; }` calling the function. It must come after the user's function, which is why it is the suffix.",
  ].join("\n"),
  java: [
    "- `harnessPrefix`: imports, then the literal line `class Solution {` — NOT public, and left open.",
    "- `stubCode`: one `public static` method, indented as a class member, with an empty body returning a default value.",
    "- `harnessSuffix`: the closing `}` for Solution, then `public class Main { public static void main(String[] args) { ... } }` calling `Solution.<functionName>(...)`.",
    "- Judge0 compiles one file and requires the entry point to be `public class Main`; a file may hold only one public class, so Solution must not be public.",
  ].join("\n"),
};

export function buildProblemPrompt(question: string, languageId: CodeLanguageId): string {
  const language = findLanguage(languageId);
  if (!language) throw new Error(`Unsupported language: ${languageId}`);

  return [
    `Target language: ${language.label}.`,
    "",
    "The coding question:",
    "```",
    question.trim(),
    "```",
    "",
    "Produce a stub for the user to implement, plus a test harness that exercises it.",
    "",
    "## How the file is assembled",
    "",
    "The file compiled and run is exactly:",
    "",
    "    harnessPrefix + newline + <the user's code> + newline + harnessSuffix",
    "",
    "The user's code starts as your `stubCode` and they edit it in place. So:",
    "",
    STRUCTURE[languageId],
    "",
    "## Requirements",
    "",
    "- The assembled file must COMPILE AND RUN with `stubCode` unmodified. A fresh problem shows every case failing, never a compile error.",
    "- Expose exactly ONE function for the user to implement, named `functionName`. Every helper, parser and driver belongs in the harness, not the stub.",
    "- The harness must not read stdin. Embed the test inputs as literals in `harnessSuffix`.",
    "- Write 3 to 5 test cases: at least one ordinary case and at least one edge case (empty input, single element, boundary value, negative number — whichever the question admits).",
    "- `testCases` is what the UI lists before a run. Its `input`/`expected` strings must describe the SAME cases the harness embeds, in the same order.",
    "- Do not implement the solution anywhere — not in the stub, not in the harness, not in a comment.",
    "",
    "## Output protocol",
    "",
    harnessProtocolSpec(languageId),
  ].join("\n");
}

export const PROBLEM_SYSTEM_PROMPT =
  "You generate practice scaffolding for a coding exercise: one function signature for the learner to implement, and a test harness that runs their implementation against concrete cases. You never write the solution itself. The code you emit must compile as given.";
