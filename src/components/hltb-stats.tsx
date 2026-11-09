import { Clock } from "lucide-react";

/** HowLongToBeat completion times as compact chips (renders nothing if none). */
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
    <ul className="flex flex-wrap gap-2" aria-label={title} title={title}>
      {stats.map((stat) => (
        <li
          key={stat.label}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-sm backdrop-blur-sm"
        >
          <Clock className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">{stat.label}</span>
          <span className="font-semibold tabular-nums">{stat.hours}h</span>
        </li>
      ))}
    </ul>
  );
}
