import { TrophyRow } from "@/components/trophy-row";
import { ProgressBar } from "@/components/progress-bar";
import { computeCompletionPercent } from "@/lib/progress";

type Trophy = {
  id: string;
  title: string;
  description: string | null;
  tier: string;
  completed: boolean;
};

export function TrophyList({
  trophies,
  toggleAction,
  progressLabel,
}: {
  trophies: Trophy[];
  toggleAction: (trophyId: string, completed: boolean) => Promise<void>;
  progressLabel: string;
}) {
  const done = trophies.filter((trophy) => trophy.completed).length;
  const percent = computeCompletionPercent(trophies.length, done);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-col gap-3 border-b bg-muted/30 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {progressLabel}
          </h2>
          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-sm font-medium tabular-nums text-muted-foreground">
            {done}/{trophies.length}
          </span>
        </div>
        <ProgressBar percent={percent} />
      </div>
      <div className="flex flex-col divide-y px-5 sm:px-6">
        {trophies.map((trophy) => (
          <TrophyRow
            key={trophy.id}
            trophyId={trophy.id}
            title={trophy.title}
            description={trophy.description}
            tier={trophy.tier}
            completed={trophy.completed}
            toggleAction={toggleAction}
          />
        ))}
      </div>
    </section>
  );
}
