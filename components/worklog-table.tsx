"use client";

import {
  AlignLeft,
  Calendar,
  Code2,
  List,
  Pencil,
  Plus,
  Target,
  Trash2,
  Type,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { CategoryTag } from "@/components/category-tag";
import { ProjectTag } from "@/components/project-tag";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createEntryAction,
  deleteEntryAction,
  updateEntryAction,
  type ActionState,
} from "@/lib/actions";
import {
  CATEGORIES,
  PROJECTS,
  type Category,
  type Project,
} from "@/lib/constants";
import { formatFullDate } from "@/lib/date";
import type { EntryRow } from "@/lib/worklog";

const initialState: ActionState = {};

const COLUMNS = [
  { label: "Name", icon: Type },
  { label: "Category", icon: List },
  { label: "Date", icon: Calendar },
  { label: "Project", icon: Target },
  { label: "Summary", icon: AlignLeft },
] as const;

/** Strip leading bullet, collapse newline-bullets into dots */
function shortSummary(summary: string, max: number): string {
  const clean = summary.replace(/^- /, "").replace(/\n- /g, " · ");
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Format summary for full popover display */
function formatFullSummary(summary: string): string {
  // Keep bullet points but make them readable
  return summary.replace(/^- /gm, "• ").trim();
}

/* ── Summary Popover ──────────────────────────────────────── */
function SummaryCell({ summary }: { summary: string }) {
  const short = shortSummary(summary, 55);
  const isTruncated = summary.replace(/^- /, "").replace(/\n- /g, " · ").length > 55;
  const full = formatFullSummary(summary);

  if (!isTruncated) {
    return (
      <span className="text-[13px] text-[#9aa0a6]">{short}</span>
    );
  }

  return (
    <div className="summary-cell">
      <span className="text-[13px] text-[#9aa0a6]">{short}</span>
      {/* Popover */}
      <div className="summary-popover" role="tooltip">
        {/* Arrow indicator */}
        <div className="mb-2 flex items-center gap-1.5 border-b border-white/8 pb-2">
          <AlignLeft className="h-3 w-3 text-[#8ab4f8]" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5f6368]">
            Full Summary
          </span>
        </div>
        <div className="summary-popover-scroll">
          <p className="summary-popover-text">{full}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Row Form (hidden, handles server action lifecycle) ───── */
function RowForm({
  formId,
  action,
  onSettled,
}: {
  formId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  onSettled: (state: ActionState) => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending) onSettled(state);
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  return <form id={formId} action={formAction} className="hidden" />;
}

/* ── Editable Row ─────────────────────────────────────────── */
function EditableRow({
  formId,
  entry,
  onCancel,
}: {
  formId: string;
  entry?: EntryRow;
  onCancel: () => void;
}) {
  return (
    <tr className="editing-row border-b border-white/5">
      {/* Name / status label */}
      <td className="px-4 py-3 align-top">
        <span className="text-[11.5px] italic text-[#5f6368]">
          {entry ? "Editing…" : "New entry"}
        </span>
      </td>

      {/* Category select */}
      <td className="px-4 py-3 align-top">
        <Select
          form={formId}
          name="category"
          defaultValue={entry?.category[0] ?? CATEGORIES[0]}
        >
          <SelectTrigger className="h-7 w-[120px] border-white/10 bg-white/5 text-[12px] text-[#c4c7c5]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#2d2d2d] text-[#c4c7c5]">
            {CATEGORIES.map((category) => (
              <SelectItem
                key={category}
                value={category}
                className="text-[12px] focus:bg-[#8ab4f8]/10 focus:text-[#8ab4f8]"
              >
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Date — always Today */}
      <td className="px-4 py-3 align-top">
        <span className="text-[12px] text-[#5f6368]">Today</span>
      </td>

      {/* Project select */}
      <td className="px-4 py-3 align-top">
        <Select
          form={formId}
          name="project"
          defaultValue={entry?.project ?? PROJECTS[0]}
        >
          <SelectTrigger className="h-7 w-[130px] border-white/10 bg-white/5 text-[12px] text-[#c4c7c5]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#2d2d2d] text-[#c4c7c5]">
            {PROJECTS.map((project) => (
              <SelectItem
                key={project}
                value={project}
                className="text-[12px] focus:bg-[#8ab4f8]/10 focus:text-[#8ab4f8]"
              >
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Summary textarea */}
      <td className="px-4 py-3 align-top">
        <Textarea
          form={formId}
          name="summary"
          autoFocus
          required
          minLength={10}
          rows={2}
          defaultValue={entry?.summary}
          placeholder="What did you work on?"
          className="resize-none border-none bg-transparent px-0 text-[13px] text-[#c4c7c5] shadow-none placeholder:text-[#5f6368] focus-visible:ring-0"
        />
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right align-top">
        <div className="flex justify-end gap-1.5">
          {entry && (
            <input type="hidden" form={formId} name="id" value={entry.id} />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 px-3 text-[12px] text-[#9aa0a6] hover:bg-white/5 hover:text-[#c4c7c5]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            size="sm"
            className="h-7 bg-[#8ab4f8] px-3 text-[12px] text-[#202124] hover:bg-[#93bbf9]"
          >
            {entry ? "Save" : "Log"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

/* ── Display Row ──────────────────────────────────────────── */
function DisplayRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntryRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Derive a "name" — project + first meaningful words of summary
  const namePart = shortSummary(entry.summary, 28);

  return (
    <tr className="worklog-row group border-b border-white/5 last:border-b-0">
      {/* Name */}
      <td className="px-4 py-3">
        <span className="text-[13px] font-medium text-[#e8eaed]">
          {entry.project} — {namePart}
        </span>
      </td>

      {/* Category chips */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {entry.category.map((cat) => (
            <CategoryTag key={cat} category={cat as Category} />
          ))}
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-3">
        <span className="text-[12.5px] tabular-nums text-[#5f6368]">
          {formatFullDate(entry.date)}
        </span>
      </td>

      {/* Project chip */}
      <td className="px-4 py-3">
        <ProjectTag project={entry.project as Project} />
      </td>

      {/* Summary — truncated + hover popover */}
      <td className="max-w-[240px] px-4 py-3">
        <SummaryCell summary={entry.summary} />
      </td>

      {/* Row actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            type="button"
            aria-label="Edit entry"
            onClick={onEdit}
            className="rounded-md p-1.5 text-[#5f6368] transition-colors hover:bg-[#8ab4f8]/10 hover:text-[#8ab4f8]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete entry"
            onClick={onDelete}
            className="rounded-md p-1.5 text-[#5f6368] transition-colors hover:bg-[#f28b82]/10 hover:text-[#f28b82]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Empty State ──────────────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <tr>
      <td colSpan={COLUMNS.length + 1}>
        <div className="flex flex-col items-center justify-center gap-5 py-16">
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-[#8ab4f8]/10 blur-xl" />
            <Image
              src="/empty-state.png"
              alt="No entries yet"
              width={140}
              height={105}
              className="relative opacity-80"
              priority={false}
            />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[14px] font-medium text-[#c4c7c5]">
              Nothing logged yet
            </p>
            <p className="max-w-[240px] text-[12px] leading-relaxed text-[#5f6368]">
              Start tracking your work — click the{" "}
              <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-mono text-[#8ab4f8]">
                +
              </kbd>{" "}
              button to add your first entry.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="add-btn flex items-center gap-2 rounded-full border border-[#8ab4f8]/20 px-4 py-2 text-[12.5px] font-medium text-[#8ab4f8]"
          >
            <Plus className="h-3.5 w-3.5" />
            Log first entry
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Main Table ───────────────────────────────────────────── */
export function WorklogTable({ entries }: { entries: EntryRow[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setRowError(null);
    setAddOpen(true);
  }

  function openEdit(id: string) {
    setAddOpen(false);
    setRowError(null);
    setEditingId(id);
  }

  function settle(close: () => void) {
    return (state: ActionState) => {
      if (state.error) setRowError(state.error);
      else {
        setRowError(null);
        close();
      }
    };
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    const formData = new FormData();
    formData.set("id", id);
    void deleteEntryAction(formData);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Table container ── */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          background: "#1e1e1e",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        <table className="w-full border-collapse">
          {/* ── Header ── */}
          <thead>
            <tr
              style={{
                background: "#141414",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {COLUMNS.map(({ label, icon: Icon }) => (
                <th key={label} className="col-header px-4 py-3 text-left">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-3 w-3 opacity-60" />
                    {label}
                  </span>
                </th>
              ))}
              {/* Add button in header */}
              <th className="col-header px-4 py-3 text-right">
                <button
                  type="button"
                  aria-label="Add entry"
                  onClick={openAdd}
                  className="add-btn inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#5f6368]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {/* New entry row */}
            {addOpen && (
              <EditableRow
                formId="add-entry-form"
                onCancel={() => setAddOpen(false)}
              />
            )}

            {/* Existing entries */}
            {entries.map((entry) =>
              editingId === entry.id ? (
                <EditableRow
                  key={entry.id}
                  formId={`edit-entry-form-${entry.id}`}
                  entry={entry}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <DisplayRow
                  key={entry.id}
                  entry={entry}
                  onEdit={() => openEdit(entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ),
            )}

            {/* Empty state */}
            {entries.length === 0 && !addOpen && (
              <EmptyState onAdd={openAdd} />
            )}
          </tbody>
        </table>
      </div>

      {/* ── Error banner ── */}
      {rowError && (
        <div className="flex items-center gap-2 rounded-lg border border-[#f28b82]/20 bg-[#f28b82]/8 px-4 py-2.5">
          <Zap className="h-3.5 w-3.5 flex-shrink-0 text-[#f28b82]" />
          <p className="text-[12.5px] text-[#f28b82]">{rowError}</p>
        </div>
      )}

      {/* ── Hidden forms ── */}
      {addOpen && (
        <RowForm
          formId="add-entry-form"
          action={createEntryAction}
          onSettled={settle(() => setAddOpen(false))}
        />
      )}
      {editingId && (
        <RowForm
          formId={`edit-entry-form-${editingId}`}
          action={updateEntryAction}
          onSettled={settle(() => setEditingId(null))}
        />
      )}
    </div>
  );
}
