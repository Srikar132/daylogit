"use client";

import {
  AlignLeft,
  Calendar,
  List,
  Pencil,
  Plus,
  Target,
  Trash2,
  Type,
} from "lucide-react";
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

function shortSummary(summary: string, max: number): string {
  const clean = summary.replace(/^- /, "").replace(/\n- /g, " · ");
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

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
    <tr className="bg-muted/20 border-b last:border-b-0">
      <td className="text-muted-foreground px-3 py-2 align-top text-xs italic">
        {entry ? "Editing…" : "New entry"}
      </td>
      <td className="px-3 py-2 align-top">
        <Select
          form={formId}
          name="category"
          defaultValue={entry?.category[0] ?? CATEGORIES[0]}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="text-muted-foreground px-3 py-2 align-top text-xs">
        Today
      </td>
      <td className="px-3 py-2 align-top">
        <Select
          form={formId}
          name="project"
          defaultValue={entry?.project ?? PROJECTS[0]}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECTS.map((project) => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 align-top">
        <Textarea
          form={formId}
          name="summary"
          autoFocus
          required
          minLength={10}
          rows={2}
          defaultValue={entry?.summary}
          placeholder="What did you work on?"
          className="resize-none border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        />
      </td>
      <td className="px-3 py-2 text-right align-top">
        <div className="flex justify-end gap-1">
          {entry && (
            <input type="hidden" form={formId} name="id" value={entry.id} />
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="sm">
            {entry ? "Save" : "Log"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function DisplayRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntryRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="group hover:bg-muted/20 border-b last:border-b-0">
      <td className="px-3 py-2 text-sm">
        {entry.project} — {shortSummary(entry.summary, 32)}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {entry.category.map((category) => (
            <CategoryTag key={category} category={category as Category} />
          ))}
        </div>
      </td>
      <td className="text-muted-foreground px-3 py-2 text-sm">
        {formatFullDate(entry.date)}
      </td>
      <td className="px-3 py-2">
        <ProjectTag project={entry.project as Project} />
      </td>
      <td className="text-muted-foreground max-w-[220px] truncate px-3 py-2 text-sm">
        {shortSummary(entry.summary, 60)}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label="Edit entry"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground rounded p-1"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete entry"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive rounded p-1"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

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
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/30 text-muted-foreground border-b text-xs">
              {COLUMNS.map(({ label, icon: Icon }) => (
                <th key={label} className="px-3 py-2 text-left font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="size-3.5" />
                    {label}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-right">
                <button
                  type="button"
                  aria-label="Add entry"
                  onClick={openAdd}
                  className="hover:text-foreground rounded p-1"
                >
                  <Plus className="size-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {addOpen && (
              <EditableRow
                formId="add-entry-form"
                onCancel={() => setAddOpen(false)}
              />
            )}
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
            {entries.length === 0 && !addOpen && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="text-muted-foreground px-3 py-6 text-center text-sm"
                >
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rowError && <p className="text-destructive text-xs">{rowError}</p>}

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
