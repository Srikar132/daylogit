"use client";

import { useActionState, useEffect, useRef } from "react";
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
  updateEntryAction,
  type ActionState,
} from "@/lib/actions";
import { CATEGORIES, PROJECTS } from "@/lib/constants";
import type { EntryRow } from "@/lib/worklog";

const initialState: ActionState = {};

const chipTrigger = "h-7 rounded-full px-3 text-xs";

export function EntryForm({
  entry,
  onDone,
  onCancel,
}: {
  entry?: EntryRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const action = entry ? updateEntryAction : createEntryAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onDone();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error]);

  return (
    <form
      action={formAction}
      className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3"
    >
      {entry && <input type="hidden" name="id" value={entry.id} />}

      <Textarea
        name="summary"
        autoFocus
        required
        minLength={10}
        rows={2}
        defaultValue={entry?.summary}
        placeholder="What did you work on?"
        className="resize-none border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select name="project" defaultValue={entry?.project ?? PROJECTS[0]}>
          <SelectTrigger className={chipTrigger}>
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

        <Select
          name="category"
          defaultValue={entry?.category[0] ?? CATEGORIES[0]}
        >
          <SelectTrigger className={chipTrigger}>
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

        <div className="ml-auto flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : entry ? "Save" : "Log entry"}
          </Button>
        </div>
      </div>

      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
    </form>
  );
}
