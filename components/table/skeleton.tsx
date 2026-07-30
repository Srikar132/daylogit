import { TABLE_COLUMNS } from "./columns";

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/8 bg-[#1e1e1e] shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/8 bg-[#181818]">
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]"
                >
                  <div className="flex items-center gap-1.5">
                    {col.icon && <col.icon className="h-3.5 w-3.5 opacity-40" />}
                    <span>{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <tr
                key={index}
                className="border-b border-white/5 last:border-b-0 animate-pulse"
              >
                {/* Summary / Title */}
                <td className="px-4 py-3.5">
                  <div className="h-4 w-3/4 rounded-md bg-white/10" />
                </td>
                {/* Category */}
                <td className="px-4 py-3.5">
                  <div className="flex gap-1">
                    <div className="h-5 w-14 rounded-full bg-white/10" />
                    <div className="h-5 w-12 rounded-full bg-white/5" />
                  </div>
                </td>
                {/* Date */}
                <td className="px-4 py-3.5">
                  <div className="h-4 w-20 rounded-md bg-white/10" />
                </td>
                {/* Project */}
                <td className="px-4 py-3.5">
                  <div className="h-5 w-16 rounded-full bg-white/10" />
                </td>
                {/* Summary Details */}
                <td className="px-4 py-3.5">
                  <div className="h-4 w-full rounded-md bg-white/5" />
                </td>
                {/* Actions */}
                <td className="px-4 py-3.5 text-right">
                  <div className="ml-auto h-4 w-10 rounded-md bg-white/10" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
    </div>
  );
}
