export const PROJECTS = ["Rafttaar", "Creonex", "BellCorps", "Other"] as const;
export type Project = (typeof PROJECTS)[number];

export const CATEGORIES = [
  "Code",
  "Analysis",
  "Meeting",
  "Design",
  "Debugging",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PROJECT_ACCENT_VAR: Record<Project, string> = {
  Rafttaar: "var(--project-rafttaar)",
  Creonex: "var(--project-creonex)",
  BellCorps: "var(--project-bellcorps)",
  Other: "var(--project-other)",
};

export const MIN_SUMMARY_LENGTH = 10;

const FILLER_SUMMARIES = new Set([
  "worked on stuff",
  "did stuff",
  "did some work",
  "general work",
  "misc work",
  "misc",
  "stuff",
  "nothing much",
  "some work",
  "worked",
]);

export function isFillerSummary(summary: string): boolean {
  const normalized = summary.trim().toLowerCase();
  return (
    normalized.length < MIN_SUMMARY_LENGTH || FILLER_SUMMARIES.has(normalized)
  );
}
