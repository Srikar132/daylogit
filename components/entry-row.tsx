"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EntryForm } from "@/components/entry-form";
import { ProjectDot } from "@/components/project-dot";
import { deleteEntryAction } from "@/lib/actions";
import { formatDateLabel } from "@/lib/date";
import type { Project } from "@/lib/constants";
import type { EntryRow as EntryRowData } from "@/lib/worklog";

export function EntryRow({ entry }: { entry: EntryRowData }) {
  const [isEditing, setIsEditing] = useState(false);

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Delete this entry?")) {
      event.preventDefault();
    }
  }

  if (isEditing) {
    return (
      <EntryForm
        entry={entry}
        onDone={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="group flex items-start gap-3 py-2">
      <ProjectDot project={entry.project as Project} />

      <div className="flex-1">
        <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
          {entry.summary}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {entry.project} · {entry.category.join(", ")} ·{" "}
          {formatDateLabel(entry.date)}
        </p>
      </div>

      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Edit entry"
          onClick={() => setIsEditing(true)}
          className="text-muted-foreground hover:text-foreground rounded p-1"
        >
          <Pencil className="size-3.5" />
        </button>
        <form action={deleteEntryAction} onSubmit={handleDeleteSubmit}>
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit"
            aria-label="Delete entry"
            className="text-muted-foreground hover:text-destructive rounded p-1"
          >
            <Trash2 className="size-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
