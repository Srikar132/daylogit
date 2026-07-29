import { PROJECT_ACCENT_VAR, type Project } from "@/lib/constants";

export function ProjectBadge({ project }: { project: Project }) {
  const accent = PROJECT_ACCENT_VAR[project];

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        color: accent,
        borderColor: `color-mix(in oklch, ${accent} 45%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${accent} 16%, transparent)`,
      }}
    >
      {project}
    </span>
  );
}
