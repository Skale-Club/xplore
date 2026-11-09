"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, EyeOff, Search, Trophy, X } from "lucide-react";
import { computeCompletionPercent } from "@/lib/progress";
import { t } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

type TrophyItem = {
  id: string;
  title: string;
  description: string | null;
  tier: string;
  completed: boolean;
};

type Tier = "bronze" | "silver" | "gold" | "platinum";
const TIERS: Tier[] = ["platinum", "gold", "silver", "bronze"];

// Per-tier colors: icon, tinted circle behind it, and the earned accent.
const TIER_STYLE: Record<Tier, { icon: string; circle: string; ring: string }> = {
  bronze: {
    icon: "text-amber-600 dark:text-amber-500",
    circle: "bg-amber-600/15",
    ring: "ring-amber-600/40",
  },
  silver: { icon: "text-slate-400 dark:text-slate-300", circle: "bg-slate-400/15", ring: "ring-slate-400/40" },
  gold: { icon: "text-yellow-500 dark:text-yellow-400", circle: "bg-yellow-500/15", ring: "ring-yellow-500/40" },
  platinum: { icon: "text-cyan-500 dark:text-cyan-300", circle: "bg-cyan-500/15", ring: "ring-cyan-500/40" },
};

const asTier = (tier: string): Tier =>
  (TIERS as string[]).includes(tier) ? (tier as Tier) : "bronze";

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function TrophyList({
  trophies,
  toggleAction,
  labels,
}: {
  trophies: TrophyItem[];
  toggleAction: (trophyId: string, completed: boolean) => Promise<void>;
  labels: Dictionary["trophies"];
}) {
  // Earned state lives here so every count updates the instant you tick.
  const [earned, setEarned] = useState<Set<string>>(
    () => new Set(trophies.filter((tr) => tr.completed).map((tr) => tr.id))
  );
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const [query, setQuery] = useState("");
  const [hideEarned, setHideEarned] = useState(false);
  // Trophies ticked while "hide earned" is on stay until the filter changes.
  const [lingering, setLingering] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const tierStats = useMemo(() => {
    const stats = Object.fromEntries(
      TIERS.map((tier) => [tier, { done: 0, total: 0 }])
    ) as Record<Tier, { done: number; total: number }>;
    for (const trophy of trophies) {
      const s = stats[asTier(trophy.tier)];
      s.total++;
      if (earned.has(trophy.id)) s.done++;
    }
    return stats;
  }, [trophies, earned]);

  const doneCount = trophies.filter((tr) => earned.has(tr.id)).length;
  const percent = computeCompletionPercent(trophies.length, doneCount);

  const needle = normalize(query.trim());
  const visible = trophies.filter((trophy) => {
    if (tierFilter && asTier(trophy.tier) !== tierFilter) return false;
    if (hideEarned && earned.has(trophy.id) && !lingering.has(trophy.id)) return false;
    if (!needle) return true;
    return (
      normalize(trophy.title).includes(needle) ||
      (trophy.description ? normalize(trophy.description).includes(needle) : false)
    );
  });

  function resetLingering() {
    setLingering(new Set());
  }

  function toggle(trophyId: string, next: boolean) {
    setEarned((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(trophyId);
      else copy.delete(trophyId);
      return copy;
    });
    if (next && hideEarned) setLingering((prev) => new Set(prev).add(trophyId));
    setError(null);
    startTransition(async () => {
      try {
        await toggleAction(trophyId, next);
      } catch {
        setEarned((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(trophyId);
          else copy.add(trophyId);
          return copy;
        });
        setError(labels.saveError);
      }
    });
  }

  const allEarnedInView =
    visible.length === 0 && !needle && trophies.some((tr) => earned.has(tr.id));

  return (
    <div className="flex flex-col gap-4">
      {/* Summary + tier filters */}
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
              {labels.progress}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(labels.earnedCount, { done: doneCount, total: trophies.length })}
            </p>
          </div>
          <span className="font-heading text-2xl font-bold tabular-nums">
            {percent}
            <span className="text-sm font-semibold text-muted-foreground">%</span>
          </span>
        </div>
        <span className="block h-2 overflow-hidden rounded-full bg-muted">
          <span
            className={cn(
              "block h-full rounded-full transition-[width] duration-500 ease-out",
              percent === 100 ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${percent}%` }}
          />
        </span>

        <div role="group" aria-label={labels.filterByTier} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIERS.filter((tier) => tierStats[tier].total > 0).map((tier) => {
            const s = tierStats[tier];
            const active = tierFilter === tier;
            const complete = s.done === s.total;
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTierFilter(active ? null : tier);
                  resetLingering();
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                  active
                    ? "border-primary/50 bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    TIER_STYLE[tier].circle
                  )}
                >
                  <Trophy className={cn("size-4", TIER_STYLE[tier].icon)} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{labels.tiers[tier]}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    {s.done}/{s.total}
                    {complete && <Check className="size-3 text-success" aria-hidden />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Toolbar: search + hide earned */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
                event.currentTarget.blur();
              }
            }}
            placeholder={labels.search}
            aria-label={labels.search}
            className="h-11 w-full rounded-xl border border-input bg-card pr-11 pl-11 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label={labels.clearSearch}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hideEarned}
          aria-label={labels.hideEarned}
          title={labels.hideEarned}
          onClick={() => {
            setHideEarned((v) => !v);
            resetLingering();
          }}
          className="inline-flex h-11 shrink-0 items-center gap-3 rounded-xl border border-input bg-card px-3 text-[15px] outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40 sm:px-4"
        >
          <span
            aria-hidden
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              hideEarned ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
                hideEarned && "translate-x-5"
              )}
            />
          </span>
          <EyeOff className="size-4 text-muted-foreground sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{labels.hideEarned}</span>
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* List */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        {visible.length > 0 ? (
          <ul className="divide-y">
            {visible.map((trophy) => (
              <TrophyRow
                key={trophy.id}
                trophy={trophy}
                tierLabel={labels.tiers[asTier(trophy.tier)]}
                earnedLabel={labels.earned}
                earned={earned.has(trophy.id)}
                onToggle={(next) => toggle(trophy.id, next)}
              />
            ))}
          </ul>
        ) : (
          <p className="px-6 py-12 text-center text-base text-muted-foreground">
            {allEarnedInView ? labels.allEarned : labels.noResults}
          </p>
        )}
      </section>
    </div>
  );
}

function TrophyRow({
  trophy,
  tierLabel,
  earnedLabel,
  earned,
  onToggle,
}: {
  trophy: TrophyItem;
  tierLabel: string;
  earnedLabel: string;
  earned: boolean;
  onToggle: (next: boolean) => void;
}) {
  const tier = asTier(trophy.tier);
  const style = TIER_STYLE[tier];
  const checkId = `trophy-check-${trophy.id}`;
  const titleId = `trophy-title-${trophy.id}`;

  return (
    <li className={cn("px-4 py-3.5 transition-colors sm:px-5", earned ? "bg-muted/20" : "hover:bg-muted/30")}>
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          id={checkId}
          type="button"
          role="checkbox"
          aria-checked={earned}
          aria-labelledby={titleId}
          onClick={() => onToggle(!earned)}
          className={cn(
            "mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 outline-none transition-all duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90",
            earned
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background/40 hover:border-primary/70"
          )}
        >
          {earned && (
            <Check className="size-4.5 animate-in fade-in zoom-in-50 duration-200" strokeWidth={3} aria-hidden />
          )}
        </button>

        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full transition-all",
            style.circle,
            earned && cn("ring-2", style.ring)
          )}
          aria-hidden
        >
          <Trophy className={cn("size-[18px]", style.icon)} />
        </span>

        {/* pt lines the title's first line up with the centre of the
            checkbox and trophy circle (both centred at 1.125rem). */}
        <label
          htmlFor={checkId}
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 pt-[0.42rem]"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              id={titleId}
              className={cn(
                "text-base leading-snug font-medium sm:text-[17px]",
                earned && "text-muted-foreground"
              )}
            >
              {trophy.title}
            </span>
            <span className={cn("text-[11px] font-semibold tracking-wider uppercase", style.icon)}>
              {tierLabel}
            </span>
            {earned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success animate-in fade-in zoom-in-95">
                <Check className="size-3" aria-hidden />
                {earnedLabel}
              </span>
            )}
          </span>
          {trophy.description && (
            <span
              className={cn(
                "text-sm leading-relaxed text-muted-foreground sm:text-[15px]",
                earned && "opacity-70"
              )}
            >
              {trophy.description}
            </span>
          )}
        </label>
      </div>
    </li>
  );
}
