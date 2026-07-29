"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CategoryChip } from "@/components/category-chip";
import { ProjectBadge } from "@/components/project-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
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
import type { EntryRow } from "@/lib/worklog";

const initialState: ActionState = {};

export function EntryCard({ entry }: { entry: EntryRow }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateEntryAction,
    initialState,
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setIsEditing(false);
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Delete this entry? This can't be undone from here.")) {
      event.preventDefault();
    }
  }

  if (isEditing) {
    return (
      <form
        action={formAction}
        className="bg-card flex flex-col gap-3 rounded-2xl border p-5"
      >
        <input type="hidden" name="id" value={entry.id} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select name="project" defaultValue={entry.project}>
            <SelectTrigger className="w-full sm:w-40">
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

          <div className="flex flex-wrap gap-3 pt-1.5">
            {CATEGORIES.map((category) => (
              <label
                key={category}
                htmlFor={`edit-${entry.id}-${category}`}
                className="flex items-center gap-1.5 text-sm"
              >
                <Checkbox
                  id={`edit-${entry.id}-${category}`}
                  name="category"
                  value={category}
                  defaultChecked={(entry.category as Category[]).includes(
                    category,
                  )}
                />
                {category}
              </label>
            ))}
          </div>
        </div>

        <Textarea
          name="summary"
          required
          minLength={10}
          rows={4}
          defaultValue={entry.summary}
        />

        {state.error && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ProjectBadge project={entry.project as Project} />
        {entry.category.map((category) => (
          <CategoryChip key={category} category={category} />
        ))}
      </div>

      <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
        {entry.summary}
      </p>

      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <form action={deleteEntryAction} onSubmit={handleDeleteSubmit}>
          <input type="hidden" name="id" value={entry.id} />
          <Button variant="ghost" size="sm" type="submit">
            Delete
          </Button>
        </form>
      </div>
    </div>
  );
}
