import { Coffee } from "lucide-react";

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
      <Coffee className="text-muted-foreground size-6" aria-hidden />
      <p className="text-muted-foreground text-sm">
        Nothing logged for {label} yet — enjoy the quiet.
      </p>
    </div>
  );
}
