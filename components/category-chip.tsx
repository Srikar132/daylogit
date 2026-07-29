export function CategoryChip({ category }: { category: string }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs">
      {category}
    </span>
  );
}
