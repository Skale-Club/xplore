"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ItemDetailsFormState } from "@/app/games/[slug]/edit/actions";

export function ItemDetailsEditor({
  itemId,
  value,
  action,
  labels,
}: {
  itemId: string;
  value: string;
  action: (
    itemId: string,
    previousState: ItemDetailsFormState,
    formData: FormData
  ) => Promise<ItemDetailsFormState>;
  labels: {
    label: string;
    placeholder: string;
    save: string;
    saving: string;
    saved: string;
  };
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [state, formAction, pending] = useActionState(
    action.bind(null, itemId),
    { error: null }
  );

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-fit"
        aria-expanded={open}
        aria-controls={`${inputId}-form`}
        onClick={() => setOpen((previous) => !previous)}
      >
        {labels.label}
      </Button>
      {open && (
        <form
          id={`${inputId}-form`}
          action={formAction}
          className="flex flex-col items-start gap-2"
          aria-busy={pending}
        >
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {labels.label}
          </label>
          <textarea
            id={inputId}
            name="details"
            rows={6}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={labels.placeholder}
            disabled={pending}
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? `${inputId}-error` : undefined}
            className="w-full min-w-0 resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
          />
          {state.error && (
            <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? labels.saving : labels.save}
            </Button>
            {!pending && !state.error && state.savedDetails === draft.trim() && (
              <p role="status" className="text-sm text-muted-foreground">{labels.saved}</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
