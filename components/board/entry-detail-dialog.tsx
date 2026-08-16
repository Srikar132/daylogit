"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FileWarning, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatFullDate, formatTime } from "@/lib/date";
import { parseEntrySummary, type ParsedLogItem } from "@/lib/summary-parser";
import type { EntryRow } from "@/lib/worklog";

interface EntryDetailDialogProps {
  /** null closes the dialog — the board never fetches an entry's full body until this is set. */
  entryId: string | null;
  /** Passed down from the board's own status columns — avoids a join just to label the header. */
  statusLabel?: string;
  canWrite: boolean;
  onClose: () => void;
  /** Called after a successful delete — the board owns removing the entry
   *  from its own column state, this dialog doesn't touch that. */
  onDeleted: (entryId: string) => void;
}

async function deleteEntry(entryId: string): Promise<void> {
  const res = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Failed to delete this entry.");
  }
}

async function fetchEntry(entryId: string): Promise<EntryRow> {
  const res = await fetch(`/api/entries/${entryId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Failed to load this entry.");
  }
  return res.json();
}

/**
 * The full-detail view for one log entry — opened from a board row click.
 * Fetches the entry's full row (summary included) lazily via GET
 * /api/entries/[id]; the board's own list query never carries `summary` (see
 * lib/worklog.ts's EntryListItem), so this is the only place that data is
 * ever requested, and only for the one entry actually opened. Cached per
 * entry id — reopening the same entry within a session is instant.
 *
 * Editing/comments are still out of scope — delete is the one write action
 * this dialog owns.
 */
export function EntryDetailDialog({ entryId, statusLabel, canWrite, onClose, onDeleted }: EntryDetailDialogProps) {
  const {
    data: entry,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["entry", entryId],
    queryFn: () => fetchEntry(entryId!),
    enabled: !!entryId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntry(entryId!),
    onSuccess: () => onDeleted(entryId!),
    onError: (err) => console.error("Failed to delete entry:", err),
  });

  function handleDelete() {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    deleteMutation.mutate();
  }

  const items: ParsedLogItem[] = entry ? parseEntrySummary(entry.summary) : [];

  return (
    <Dialog open={Boolean(entryId)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[min(600px,80vh)] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 p-0 shadow-2xl">
        {isLoading ? (
          <DetailSkeleton />
        ) : error ? (
          <DetailError message={error.message} />
        ) : entry ? (
          <DetailBody
            entry={entry}
            statusLabel={statusLabel}
            items={items}
            canWrite={canWrite}
            onDelete={handleDelete}
            deleting={deleteMutation.isPending}
          />
        ) : (
          <DetailError message="Something went wrong." />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-5">
      <div className="h-2.5 w-16 animate-pulse rounded-full bg-white/10" />
      <div className="h-5 w-1/2 animate-pulse rounded-full bg-white/10" />
      <div className="mt-3 flex flex-1 flex-col gap-2.5 border-t border-white/8 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

function DetailError({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-8 text-center">
      <FileWarning className="h-5 w-5 text-destructive" />
      <p className="text-[12.5px] text-muted-foreground">{message}</p>
    </div>
  );
}

function DetailBody({
  entry,
  statusLabel,
  items,
  canWrite,
  onDelete,
  deleting,
}: {
  entry: EntryRow;
  statusLabel?: string;
  items: ParsedLogItem[];
  canWrite: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header — compact, mono meta line above the title (dev-panel feel) */}
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/8 px-5 py-4 pr-12">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {statusLabel && (
            <span className="font-mono text-[10px] tracking-wide text-primary lowercase">
              {statusLabel}
            </span>
          )}
          <DialogTitle className="text-[14.5px] leading-snug font-semibold break-words text-foreground">
            {entry.title || "Untitled log"}
          </DialogTitle>
        </div>
        {canWrite && (
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            className="shrink-0 rounded-full"
            title="Delete entry"
            disabled={deleting}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Body: a slim changelog-style timeline + a compact properties strip below */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
        {items.length === 0 ? (
          <p className="font-mono text-[12px] text-muted-foreground">No details recorded.</p>
        ) : (
          <ol className="relative ml-1 flex flex-col border-l border-white/[0.08] pl-4">
            {items.map((item, i) => (
              <li key={i} className="relative pb-3.5 last:pb-0">
                <span className="absolute top-[5px] -left-[21px] h-1.5 w-1.5 rounded-full bg-primary ring-4 ring-popover" />
                {item.task && item.whatDone ? (
                  <div>
                    <p className="text-[12.5px] leading-snug font-medium text-foreground">
                      {item.task}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
                      {item.whatDone}
                    </p>
                  </div>
                ) : (
                  <p className="text-[12px] leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
                    {item.raw}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Properties strip — compact key:value row, terminal/inspector style */}
      <div className="flex shrink-0 items-center gap-4 border-t border-white/8 px-5 py-2.5 font-mono text-[10.5px]">
        <MetaField label="date">{formatFullDate(entry.date)}</MetaField>
        <MetaField label="created">{formatTime(entry.createdAt)}</MetaField>
        <MetaField label="updated">{formatTime(entry.updatedAt)}</MetaField>
      </div>
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground">
      {label}
      <span className="text-muted-foreground/70">:</span> <span className="text-foreground/80">{children}</span>
    </span>
  );
}
