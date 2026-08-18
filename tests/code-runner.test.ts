import { describe, expect, it } from "vitest";
import {
  assembleSource,
  CASE_DELIMITER,
  CASE_SENTINEL,
  harnessProtocolSpec,
  outputsMatch,
  parseRunOutput,
} from "@/lib/code-runner/harness";
import { CODE_LANGUAGES, findLanguage, isCodeLanguageId, resolveJudge0LanguageId } from "@/lib/code-runner/languages";
import { buildProblemPrompt } from "@/lib/code-runner/problem";

const caseLine = (name: string, expected: string, actual: string) =>
  `${CASE_SENTINEL}${CASE_DELIMITER}${name}${CASE_DELIMITER}${expected}${CASE_DELIMITER}${actual}`;

describe("resolveJudge0LanguageId", () => {
  const python = findLanguage("python")!;

  it("picks the newest matching entry when the instance lists several versions", () => {
    const available = [
      { id: 70, name: "Python (2.7.17)" },
      { id: 71, name: "Python (3.8.1)" },
      { id: 34, name: "Python (2.6.9)" },
      { id: 54, name: "C++ (GCC 9.2.0)" },
    ];
    expect(resolveJudge0LanguageId(python, available)).toBe(71);
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(resolveJudge0LanguageId(python, [{ id: 92, name: "  python (3.11.2) " }])).toBe(92);
  });

  // The whole reason ids aren't hardcoded: they differ per instance. But an
  // instance that won't serve /languages shouldn't take execution down with it.
  it("falls back to the CE id when the instance lists nothing matching", () => {
    expect(resolveJudge0LanguageId(python, [{ id: 62, name: "Java (OpenJDK 13.0.1)" }])).toBe(python.judge0FallbackId);
  });

  it("never confuses Java with JavaScript", () => {
    const available = [
      { id: 62, name: "Java (OpenJDK 13.0.1)" },
      { id: 63, name: "JavaScript (Node.js 12.14.0)" },
    ];
    expect(resolveJudge0LanguageId(findLanguage("java")!, available)).toBe(62);
    expect(resolveJudge0LanguageId(findLanguage("javascript")!, available)).toBe(63);
  });
});

describe("isCodeLanguageId", () => {
  it("accepts every declared language and rejects anything else", () => {
    for (const language of CODE_LANGUAGES) expect(isCodeLanguageId(language.id)).toBe(true);
    expect(isCodeLanguageId("ruby")).toBe(false);
    expect(isCodeLanguageId(undefined)).toBe(false);
  });
});

describe("assembleSource", () => {
  it("runs the file verbatim in manual mode", () => {
    expect(assembleSource("print(1)")).toBe("print(1)");
    expect(assembleSource("print(1)", null)).toBe("print(1)");
  });

  // Java is why assembly is a sandwich rather than an append: the entry point
  // must be `public class Main`, and only one public class may exist per file,
  // so the user's method sits inside a non-public Solution opened before it.
  it("wraps user code between prefix and suffix", () => {
    const source = assembleSource("    public static int f() { return 0; }", {
      prefix: "import java.util.*;\nclass Solution {",
      suffix: "}\npublic class Main { public static void main(String[] a) {} }",
    });
    expect(source).toBe(
      "import java.util.*;\nclass Solution {\n    public static int f() { return 0; }\n}\npublic class Main { public static void main(String[] a) {} }\n",
    );
  });

  it("keeps user code starting at column 0 of its own line, which Python requires", () => {
    const source = assembleSource("def f(x):\n    return x", { prefix: "import sys", suffix: "print(f(1))" });
    expect(source).toContain("\ndef f(x):");
  });
});

describe("outputsMatch", () => {
  it("ignores trailing whitespace, trailing newlines and CRLF", () => {
    expect(outputsMatch("42", "42\n")).toBe(true);
    expect(outputsMatch("a\nb", "a  \r\nb\r\n")).toBe(true);
  });

  it("still distinguishes genuinely different output", () => {
    expect(outputsMatch("42", "4 2")).toBe(false);
    expect(outputsMatch("[1, 2]", "[1,2]")).toBe(false);
  });
});

describe("parseRunOutput", () => {
  it("reads a case per sentinel line and compares expected against actual", () => {
    const { cases } = parseRunOutput([caseLine("empty list", "0", "0"), caseLine("negatives", "-3", "5")].join("\n"));

    expect(cases).toHaveLength(2);
    expect(cases[0]).toEqual({ name: "empty list", expected: "0", actual: "0", passed: true });
    expect(cases[1]?.passed).toBe(false);
  });

  // The reason the protocol is sentinel-prefixed at all: debug printing is
  // exactly what someone does when a case fails, and it must not corrupt the
  // results table.
  it("keeps the user's own printing out of the results and surfaces it as logs", () => {
    const { cases, logs } = parseRunOutput(
      ["checking x=3", caseLine("ordinary", "6", "6"), "done", ""].join("\n"),
    );

    expect(cases).toHaveLength(1);
    expect(cases[0]?.passed).toBe(true);
    expect(logs).toBe("checking x=3\ndone");
  });

  it("returns no cases and no logs for empty output", () => {
    expect(parseRunOutput("")).toEqual({ cases: [], logs: "" });
  });

  // A crash mid-batch is the accepted cost of one submission per run rather than
  // one per case, so whatever reported before the crash still has to come back.
  it("keeps the cases that reported before the program died", () => {
    const { cases } = parseRunOutput([caseLine("first", "1", "1"), caseLine("second", "2", "2"), "Segmentation fault"].join("\n"));
    expect(cases.map((c) => c.name)).toEqual(["first", "second"]);
  });

  it("tolerates a truncated line rather than throwing", () => {
    const { cases } = parseRunOutput(`${CASE_SENTINEL}${CASE_DELIMITER}only a name`);
    expect(cases[0]).toEqual({ name: "only a name", expected: "", actual: "", passed: true });
  });

  it("handles a value that itself contains the delimiter's characters", () => {
    const { cases } = parseRunOutput(caseLine("pipes", "a|b", "a|b"));
    expect(cases[0]?.passed).toBe(true);
  });
});

describe("harnessProtocolSpec", () => {
  // The generator and the parser share this string precisely so they can't
  // drift; a changed sentinel that only lives in one of them is silent.
  it("states the exact sentinel and delimiter the parser looks for", () => {
    for (const language of CODE_LANGUAGES) {
      const spec = harnessProtocolSpec(language.id);
      expect(spec).toContain(CASE_SENTINEL);
      expect(spec).toContain(CASE_DELIMITER);
    }
  });

  it("names each language's own print call", () => {
    expect(harnessProtocolSpec("cpp")).toContain("std::cout");
    expect(harnessProtocolSpec("java")).toContain("System.out.println");
    expect(harnessProtocolSpec("python")).toContain("print(");
    expect(harnessProtocolSpec("javascript")).toContain("console.log");
  });
});

describe("buildProblemPrompt", () => {
  const QUESTION = "Given an array of integers, return the sum of the even numbers.";

  it("carries the output protocol into the prompt", () => {
    const prompt = buildProblemPrompt(QUESTION, "python");
    expect(prompt).toContain(CASE_SENTINEL);
    expect(prompt).toContain(CASE_DELIMITER);
  });

  it("tells the model the file is prefix + user code + suffix", () => {
    expect(buildProblemPrompt(QUESTION, "cpp")).toContain("harnessPrefix + newline + <the user's code> + newline + harnessSuffix");
  });

  it("spells out Java's one-public-class constraint, which is what breaks otherwise", () => {
    const prompt = buildProblemPrompt(QUESTION, "java");
    expect(prompt).toContain("class Solution {");
    expect(prompt).toContain("NOT public");
    expect(prompt).toContain("public class Main");
  });

  it("tells C++ that main must follow the user's function", () => {
    expect(buildProblemPrompt(QUESTION, "cpp")).toContain("int main()");
  });

  it("forbids reading stdin, since assisted mode embeds its cases", () => {
    expect(buildProblemPrompt(QUESTION, "python")).toContain("must not read stdin");
  });

  it("rejects a language it has no structure rules for", () => {
    expect(() => buildProblemPrompt(QUESTION, "ruby" as "python")).toThrow(/Unsupported language/);
  });
});
