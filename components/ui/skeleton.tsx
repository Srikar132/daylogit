interface SkeletonProps {
  className?: string;
}

/** A placeholder block shaped like the content that's about to appear —
 *  reuses the exact `.loading-sweep-bar` animation already defined in
 *  app/globals.css (used by BoardWidget's loading indicator) so the whole
 *  canvas shares one "this is loading" motion language instead of this
 *  widget introducing a second one (e.g. a generic pulse). */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-white/[0.06] ${className}`}>
      <div className="loading-sweep-bar absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />
    </div>
  );
}
