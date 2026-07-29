import { PROJECT_ACCENT_VAR, type Project } from "@/lib/constants";

export function ProjectTag({ project }: { project: Project }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: PROJECT_ACCENT_VAR[project] }}
    >
      {project}
    </span>
  );
}
