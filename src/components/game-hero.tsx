import Image from "next/image";
import { PlatformLogo } from "@/components/platform-logo";

/**
 * Compact game header (mobile first): small cover beside the title over a
 * blurred, tinted copy of the cover, plus optional stats and owner actions.
 */
export function GameHero({
  title,
  platform,
  coverUrl,
  stats,
  progress,
  actions,
}: {
  title: string;
  platform: string;
  coverUrl: string | null;
  stats?: React.ReactNode;
  /** Shown on the same line as the title on wider screens, below it on phones. */
  progress?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card">
      {coverUrl && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="scale-125 object-cover opacity-25 blur-3xl saturate-150"
          />
          <div className="absolute inset-0 bg-linear-to-r from-card/40 via-card/80 to-card" />
        </div>
      )}

      <div className="relative flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={title}
            width={80}
            height={80}
            priority
            className="size-14 shrink-0 rounded object-cover shadow-lg ring-1 ring-white/10 sm:size-20"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <PlatformLogo platform={platform} />
            {platform}
          </span>
          <h1 className="font-heading text-base leading-snug font-bold tracking-tight text-balance sm:text-2xl sm:leading-tight">
            {title}
          </h1>
          {stats}
        </div>

        {actions && <div className="shrink-0 self-start sm:self-center">{actions}</div>}
      </div>
      {progress && (
        <div className="border-t border-border/60 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
          {progress}
        </div>
      )}
      </div>
    </section>
  );
}
