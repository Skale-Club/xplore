"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TIER_COLOR: Record<string, string> = {
  bronze: "text-amber-700 dark:text-amber-600",
  silver: "text-slate-400",
  gold: "text-yellow-500",
  platinum: "text-cyan-400",
};

export function TrophyRow({
  trophyId,
  title,
  description,
  tier,
  completed,
  toggleAction,
}: {
  trophyId: string;
  title: string;
  description: string | null;
  tier: string;
  completed: boolean;
  toggleAction: (trophyId: string, completed: boolean) => Promise<void>;
}) {
  const [checked, setChecked] = useState(completed);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      try {
        await toggleAction(trophyId, next);
      } catch {
        setChecked(!next);
      }
    });
  }

  return (
    <div className="flex items-start gap-3.5 py-3.5">
      <Checkbox
        id={`trophy-${trophyId}`}
        checked={checked}
        disabled={isPending}
        onCheckedChange={handleChange}
        className="mt-0.5 size-6 rounded-md sm:size-5"
      />
      <Trophy
        className={cn("mt-0.5 size-6 shrink-0 sm:size-5", TIER_COLOR[tier] ?? TIER_COLOR.bronze)}
      />
      <Label
        htmlFor={`trophy-${trophyId}`}
        className={cn(
          "flex flex-col items-start gap-1 text-base leading-snug font-medium sm:text-[17px]",
          checked && "text-muted-foreground line-through"
        )}
      >
        <span>{title}</span>
        {description && (
          <span className="text-sm leading-relaxed font-normal text-muted-foreground no-underline sm:text-[15px]">
            {description}
          </span>
        )}
      </Label>
    </div>
  );
}
