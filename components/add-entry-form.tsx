"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEntryAction, type ActionState } from "@/lib/actions";
import { CATEGORIES, PROJECTS } from "@/lib/constants";

const initialState: ActionState = {};

export function AddEntryForm() {
  const [state, formAction, isPending] = useActionState(
    createEntryAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-card flex flex-col gap-4 rounded-2xl border p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="project">Project</Label>
          <Select name="project" defaultValue={PROJECTS[0]}>
            <SelectTrigger id="project" className="w-full">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              {PROJECTS.map((project) => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-3 pt-1.5">
            {CATEGORIES.map((category) => (
              <label
                key={category}
                htmlFor={`category-${category}`}
                className="flex items-center gap-1.5 text-sm"
              >
                <Checkbox
                  id={`category-${category}`}
                  name="category"
                  value={category}
                />
                {category}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          name="summary"
          required
          minLength={10}
          rows={3}
          placeholder="What did you work on? Be specific — this gets appended if you log again today."
        />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Logging…" : "Log entry"}
        </Button>
      </div>
    </form>
  );
}
