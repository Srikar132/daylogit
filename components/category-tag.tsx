import { CATEGORY_ACCENT_VAR, type Category } from "@/lib/constants";

export function CategoryTag({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: CATEGORY_ACCENT_VAR[category] }}
    >
      {category}
    </span>
  );
}
