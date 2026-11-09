import { Fragment } from "react";
import { Clock } from "lucide-react";

/** HowLongToBeat times as one quiet line of text (renders nothing if none). */
export function HltbStats({
  title,
  mainStoryLabel,
  mainExtraLabel,
  completionistLabel,
  mainHours,
  mainExtraHours,
  completionistHours,
}: {
  title: string;
  mainStoryLabel: string;
  mainExtraLabel: string;
  completionistLabel: string;
  mainHours: number | null;
  mainExtraHours: number | null;
  completionistHours: number | null;
}) {
  const stats = [
    { label: mainStoryLabel, hours: mainHours },
    { label: mainExtraLabel, hours: mainExtraHours },
    { label: completionistLabel, hours: completionistHours },
  ].filter((stat): stat is { label: string; hours: number } => stat.hours != null);

  if (stats.length === 0) return null;

  return (
    <p
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"
      title={title}
    >
      <Clock className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{title}:</span>
      {stats.map((stat, i) => (
        <Fragment key={stat.label}>
          {i > 0 && (
            <span aria-hidden className="opacity-40">
              ·
            </span>
          )}
          <span className="whitespace-nowrap">
            <span className="font-semibold text-foreground tabular-nums">{stat.hours}h</span>{" "}
            {stat.label}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
