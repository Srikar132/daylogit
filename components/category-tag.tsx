import { CATEGORY_ACCENT_VAR, type Category } from "@/lib/constants";

// Icon map for category chips
const CATEGORY_ICON: Record<string, string> = {
  Code: "⌨",
  Analysis: "◈",
  Meeting: "◎",
  Design: "✦",
  Debugging: "⚡",
};

export function CategoryTag({ category }: { category: Category }) {
  const color = CATEGORY_ACCENT_VAR[category];
  const icon = CATEGORY_ICON[category] ?? "·";

  return (
    <span
      className="chip"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        color: color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span style={{ fontSize: "9px", opacity: 0.85 }}>{icon}</span>
      {category}
    </span>
  );
}
