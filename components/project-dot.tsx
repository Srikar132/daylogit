import { PROJECT_ACCENT_VAR, type Project } from "@/lib/constants";

export function ProjectDot({ project }: { project: Project }) {
  return (
    <span
      className="mt-1.5 size-2 shrink-0 rounded-full"
      style={{ backgroundColor: PROJECT_ACCENT_VAR[project] }}
      aria-hidden
    />
  );
}
