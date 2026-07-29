import { PROJECT_ACCENT_VAR, type Project } from "@/lib/constants";

export function ProjectTag({ project }: { project: Project }) {
  const color = PROJECT_ACCENT_VAR[project];

  return (
    <span
      className="chip"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color: color,
        border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      {/* Colored dot */}
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {project}
    </span>
  );
}
