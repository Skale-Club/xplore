"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ProgressRing } from "@/components/progress-ring";
import { computeCompletionPercent } from "@/lib/progress";
import { t } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Chapter = { id: string; items: { id: string; completed: boolean }[] };

type WalkthroughProgressValue = {
  sections: Chapter[];
  done: Set<string>;
  setDone: Dispatch<SetStateAction<Set<string>>>;
  lastDoneId: string | null;
  setLastDoneId: Dispatch<SetStateAction<string | null>>;
};

const WalkthroughProgressContext = createContext<WalkthroughProgressValue | null>(null);

/**
 * Holds walkthrough completion so it can be shown outside the checklist
 * itself — the game header's ring — while every counter stays live.
 */
export function WalkthroughProgressProvider({
  sections,
  lastCompletedId,
  children,
}: {
  sections: Chapter[];
  lastCompletedId: string | null;
  children: React.ReactNode;
}) {
  const [done, setDone] = useState<Set<string>>(
    () =>
      new Set(
        sections.flatMap((section) =>
          section.items.filter((item) => item.completed).map((item) => item.id)
        )
      )
  );
  const [lastDoneId, setLastDoneId] = useState(lastCompletedId);

  const value = useMemo(
    () => ({ sections, done, setDone, lastDoneId, setLastDoneId }),
    [sections, done, lastDoneId]
  );

  return (
    <WalkthroughProgressContext.Provider value={value}>
      {children}
    </WalkthroughProgressContext.Provider>
  );
}

export function useWalkthroughProgress() {
  const value = useContext(WalkthroughProgressContext);
  if (!value) throw new Error("useWalkthroughProgress needs <WalkthroughProgressProvider>");
  return value;
}

/** Overall ring + counts, sized to sit beside the title in the game header. */
export function WalkthroughSummary({ labels }: { labels: Dictionary["gameDetail"] }) {
  const { sections, done } = useWalkthroughProgress();

  let totalSteps = 0;
  let doneSteps = 0;
  let chaptersDone = 0;
  for (const section of sections) {
    const sectionDone = section.items.filter((item) => done.has(item.id)).length;
    totalSteps += section.items.length;
    doneSteps += sectionDone;
    if (section.items.length > 0 && sectionDone === section.items.length) chaptersDone++;
  }
  const percent = computeCompletionPercent(totalSteps, doneSteps);

  return (
    <div className="flex shrink-0 items-center gap-3" aria-label={labels.overallProgress}>
      <ProgressRing percent={percent} size={52} stroke={5}>
        <span className="font-heading text-sm font-bold tabular-nums">
          {percent}
          <span className="text-[9px] font-semibold text-muted-foreground">%</span>
        </span>
      </ProgressRing>
      <div className="flex min-w-0 flex-col">
        <p className="text-sm font-semibold whitespace-nowrap">
          {t(labels.itemsComplete, { done: doneSteps, total: totalSteps })}
        </p>
        <p className="text-xs whitespace-nowrap text-muted-foreground">
          {t(labels.chaptersComplete, { done: chaptersDone, total: sections.length })}
        </p>
      </div>
    </div>
  );
}
