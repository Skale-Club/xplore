"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditFormState } from "@/app/games/[slug]/edit/actions";

export function AddItemForm({
  categoryId,
  action,
  labels,
}: {
  categoryId: string;
  action: (
    categoryId: string,
    state: EditFormState,
    formData: FormData
  ) => Promise<EditFormState>;
  labels: {
    titlePlaceholder: string;
    descPlaceholder: string;
    detailsLabel: string;
    detailsPlaceholder: string;
    add: string;
    adding: string;
  };
}) {
  const detailsId = useId();
  const [state, formAction, pending] = useActionState(
    action.bind(null, categoryId),
    { error: null }
  );

  return (
    <form action={formAction} className="flex items-end gap-2" aria-busy={pending}>
      <div className="flex flex-1 flex-col gap-1.5">
        <Input name="title" placeholder={labels.titlePlaceholder} required />
        <Input name="description" placeholder={labels.descPlaceholder} />
        <label htmlFor={detailsId} className="text-sm text-muted-foreground">
          {labels.detailsLabel}
        </label>
        <textarea
          id={detailsId}
          name="details"
          rows={3}
          disabled={pending}
          placeholder={labels.detailsPlaceholder}
          className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {state.error && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? labels.adding : labels.add}
      </Button>
    </form>
  );
}
