/**
 * The languages the code widget supports, and everything that differs between
 * them in one place.
 *
 * `judge0Family` is matched at run time rather than hardcoding an id, because
 * Judge0's numeric language ids are per-instance: they differ between Judge0 CE
 * on RapidAPI, a self-hosted CE box and judge0.com, and they change when an
 * instance upgrades a compiler. `judge0FallbackId` is the id on Judge0 CE today,
 * used only when GET /languages can't be reached.
 */

export const CODE_LANGUAGES = [
  {
    id: "cpp",
    label: "C++",
    monaco: "cpp",
    judge0Family: "c++",
    judge0FallbackId: 54,
  },
  {
    id: "java",
    label: "Java",
    monaco: "java",
    judge0Family: "java",
    judge0FallbackId: 62,
  },
  {
    id: "python",
    label: "Python",
    monaco: "python",
    judge0Family: "python",
    judge0FallbackId: 71,
  },
  {
    id: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    judge0Family: "javascript",
    judge0FallbackId: 63,
  },
] as const;

export type CodeLanguageId = (typeof CODE_LANGUAGES)[number]["id"];
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: CodeLanguageId = "python";

export function isCodeLanguageId(value: unknown): value is CodeLanguageId {
  return typeof value === "string" && CODE_LANGUAGES.some((lang) => lang.id === value);
}

export function findLanguage(id: string): CodeLanguage | undefined {
  return CODE_LANGUAGES.find((lang) => lang.id === id);
}

/**
 * Judge0 names a language as `Family (version)` — "Java (OpenJDK 13.0.1)",
 * "C++ (GCC 9.2.0)". This reduces a listing entry to its family.
 */
function parseJudge0Family(name: string): string {
  const parenIndex = name.indexOf("(");
  return (parenIndex === -1 ? name : name.slice(0, parenIndex)).trim().toLowerCase();
}

/**
 * Picks the Judge0 language id for one of our languages out of the instance's
 * own /languages listing.
 *
 * The family name is compared for EQUALITY, not as a prefix: "javascript"
 * starts with "java", so a prefix test resolves Java to whichever of the two has
 * the higher id and compiles Java source as JavaScript. CE lists Java at 62 and
 * JavaScript at 63, so that failure was silent and always in the same direction.
 *
 * Among genuine matches the highest id wins — CE keeps older compiler versions
 * listed under the same family, and on every instance seen so far the newest
 * version has the highest id. An arbitrary pick would silently compile against a
 * decade-old language standard.
 */
export function resolveJudge0LanguageId(
  language: CodeLanguage,
  available: Array<{ id: number; name: string }>,
): number {
  const matches = available.filter((entry) => parseJudge0Family(entry.name) === language.judge0Family);
  if (matches.length === 0) return language.judge0FallbackId;
  return matches.reduce((best, entry) => (entry.id > best.id ? entry : best)).id;
}

/** Starting contents for a fresh scratch file in manual mode. */
export const STARTER_SOURCE: Record<CodeLanguageId, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    string name;\n    getline(cin, name);\n    cout << "Hello, " << name << endl;\n    return 0;\n}\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        String name = in.hasNextLine() ? in.nextLine() : "world";\n        System.out.println("Hello, " + name);\n    }\n}\n`,
  python: `import sys\n\nname = sys.stdin.readline().strip() or "world"\nprint(f"Hello, {name}")\n`,
  javascript: `const input = require("fs").readFileSync(0, "utf8").trim();\nconsole.log(\`Hello, \${input || "world"}\`);\n`,
};
