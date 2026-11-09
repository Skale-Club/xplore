import Image from "next/image";

/**
 * Game page header: large cover art over a blurred, tinted copy of itself,
 * with the platform, title and any extra slots (HLTB chips, owner actions).
 */
export function GameHero({
  title,
  platform,
  coverUrl,
  stats,
  actions,
}: {
  title: string;
  platform: string;
  coverUrl: string | null;
  stats?: React.ReactNode;
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
            className="scale-125 object-cover opacity-30 blur-3xl saturate-150"
          />
          <div className="absolute inset-0 bg-linear-to-b from-card/30 via-card/70 to-card" />
        </div>
      )}

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:gap-7 sm:p-7">
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={title}
            width={176}
            height={176}
            priority
            className="size-32 shrink-0 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 sm:size-44"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="inline-flex w-fit items-center rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            {platform}
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          {stats}
        </div>

        {actions && <div className="shrink-0 sm:self-start">{actions}</div>}
      </div>
    </section>
  );
}
