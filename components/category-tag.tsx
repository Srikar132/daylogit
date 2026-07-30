import { CATEGORY_ACCENT_VAR, type Category } from "@/lib/constants";

// Icon map for category chips
const CATEGORY_ICON: Record<string, string> = {
  Code: "⌨",
  Analysis: "◈",
  Meeting: "◎",
  Design: "✦",
  Debugging: "⚡",
};

export function CategoryTag({
  category,
  selected = true,
}: {
  category: Category;
  selected?: boolean;
}) {
  const color = CATEGORY_ACCENT_VAR[category];
  const icon = CATEGORY_ICON[category] ?? "·";

  return (
    <span
      className="chip transition-all select-none"
      style={{
        opacity: selected ? 1 : 0.4,
        backgroundColor: selected
          ? `color-mix(in srgb, ${color} 18%, transparent)`
          : "rgba(255,255,255,0.04)",
        color: selected ? color : "#9aa0a6",
        border: selected
          ? `1px solid color-mix(in srgb, ${color} 30%, transparent)`
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span style={{ fontSize: "9px", opacity: selected ? 0.85 : 0.4 }}>
        {icon}
      </span>
      {category}
    </span>
  );
}
