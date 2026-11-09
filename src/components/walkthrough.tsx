"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  PartyPopper,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { computeCompletionPercent } from "@/lib/progress";
import { t } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

export type WalkthroughStep = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  completed: boolean;
};

export type WalkthroughChapter = {
  id: string;
  title: string;
  items: WalkthroughStep[];
};

type Labels = Dictionary["gameDetail"];

// ---------------------------------------------------------------------------
// "Hide completed" is a per-device preference. It is read through
// useSyncExternalStore so the server render (always "show everything") and the
// client can't disagree during hydration, and it falls back to memory when
// storage is blocked (private mode, disabled site data).
// ---------------------------------------------------------------------------
const HIDE_KEY = "xplore:walkthrough:hide-completed";
let hideFallback = false;
const hideListeners = new Set<() => void>();

function subscribeHide(onChange: () => void) {
  hideListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    hideListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readHide() {
  try {
    const stored = window.localStorage.getItem(HIDE_KEY);
    return stored === null ? hideFallback : stored === "1";
  } catch {
    return hideFallback;
  }
}

function writeHide(value: boolean) {
  hideFallback = value;
  try {
    window.localStorage.setItem(HIDE_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable: the in-memory fallback still works for this visit.
  }
  hideListeners.forEach((onChange) => onChange());
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** First unfinished step in walkthrough order, or null when everything's done. */
function findNextStep(sections: WalkthroughChapter[], done: Set<string>) {
  for (const section of sections) {
    for (const item of section.items) {
      if (!done.has(item.id)) return { section, item };
    }
  }
  return null;
}

export function Walkthrough({
  sections,
  initialSectionId,
  labels,
  toggleAction,
  bulkAction,
}: {
  sections: WalkthroughChapter[];
  initialSectionId: string;
  labels: Labels;
  toggleAction: (itemId: string, completed: boolean) => Promise<void>;
  bulkAction: (itemIds: string[], completed: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const w = labels.walkthrough;

  // Completion lives here (not in each row) so every counter on the page —
  // ring, sidebar, chapter bar, "next up" — updates the instant a step is
  // ticked, before the server round trip finishes.
  const [done, setDone] = useState<Set<string>>(
    () =>
      new Set(
        sections.flatMap((section) =>
          section.items.filter((item) => item.completed).map((item) => item.id)
        )
      )
  );
  const [activeId, setActiveId] = useState(initialSectionId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Steps ticked while "hide completed" is on stay visible until the reader
  // moves on, so they don't vanish from under the cursor.
  const [lingering, setLingering] = useState<Set<string>>(() => new Set());
  const hideCompleted = useSyncExternalStore(subscribeHide, readHide, () => false);
  const [, startTransition] = useTransition();

  const searchRef = useRef<HTMLInputElement>(null);
  const chapterRef = useRef<HTMLElement>(null);
  const pillRefs = useRef(new Map<string, HTMLButtonElement>());
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId)
  );
  const active = sections[activeIndex];

  const chapterStats = useMemo(
    () =>
      sections.map((section) => ({
        done: section.items.reduce((n, item) => n + (done.has(item.id) ? 1 : 0), 0),
        total: section.items.length,
      })),
    [sections, done]
  );
  const totalSteps = chapterStats.reduce((n, s) => n + s.total, 0);
  const doneSteps = chapterStats.reduce((n, s) => n + s.done, 0);
  const percent = computeCompletionPercent(totalSteps, doneSteps);
  const chaptersDone = chapterStats.filter((s) => s.total > 0 && s.done === s.total).length;

  const nextStep = findNextStep(sections, done);

  const trimmedQuery = query.trim();
  const searchGroups = useMemo(() => {
    if (!trimmedQuery) return null;
    const needle = normalize(trimmedQuery);
    return sections
      .map((section) => ({
        section,
        items: section.items.filter(
          (item) =>
            normalize(item.title).includes(needle) ||
            (item.description ? normalize(item.description).includes(needle) : false)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [sections, trimmedQuery]);

  const select = useCallback(
    (id: string) => {
      setActiveId(id);
      setConfirmClear(false);
      setLingering(new Set());
      // Persist across refresh without moving the scroll position.
      router.replace(`${pathname}?c=${id}`, { scroll: false });
    },
    [router, pathname]
  );

  // Keep the active chapter pill in view on the mobile strip.
  useEffect(() => {
    pillRefs.current
      .get(active.id)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active.id]);

  // "Next up" jumps: scroll the step into view and flash it briefly.
  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`step-${highlightId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlightId(null), 2200);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // Keyboard: ← / → switch chapters, "/" focuses search.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (trimmedQuery) return;
      if (event.key === "ArrowRight" && activeIndex < sections.length - 1) {
        event.preventDefault();
        select(sections[activeIndex + 1].id);
      } else if (event.key === "ArrowLeft" && activeIndex > 0) {
        event.preventDefault();
        select(sections[activeIndex - 1].id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, sections, select, trimmedQuery]);

  function setSteps(ids: string[], completed: boolean) {
    if (ids.length === 0) return;
    const wereDone = ids.filter((id) => done.has(id));

    setDone((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (completed) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    if (completed && hideCompleted) {
      setLingering((prev) => new Set([...prev, ...ids]));
    }
    setError(null);

    startTransition(async () => {
      try {
        if (ids.length === 1) await toggleAction(ids[0], completed);
        else await bulkAction(ids, completed);
      } catch {
        // Put just these steps back the way they were.
        setDone((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          for (const id of wereDone) next.add(id);
          return next;
        });
        setError(w.saveError);
      }
    });
  }

  const activeStats = chapterStats[activeIndex];
  const chapterComplete = activeStats.total > 0 && activeStats.done === activeStats.total;
  const activePercent = computeCompletionPercent(activeStats.total, activeStats.done);

  function onChapterAction() {
    if (!chapterComplete) {
      setSteps(
        active.items.filter((item) => !done.has(item.id)).map((item) => item.id),
        true
      );
      return;
    }
    // Clearing a whole chapter is easy to regret, so it takes a second click.
    if (!confirmClear) {
      setConfirmClear(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setConfirmClear(false);
    setSteps(
      active.items.map((item) => item.id),
      false
    );
  }

  function jumpToNext() {
    if (!nextStep) return;
    setQuery("");
    if (nextStep.section.id !== active.id) select(nextStep.section.id);
    setHighlightId(nextStep.item.id);
  }

  function goToChapter(index: number) {
    const target = sections[index];
    if (!target) return;
    select(target.id);
    chapterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const isVisible = (id: string) => !hideCompleted || !done.has(id) || lingering.has(id);
  const visibleSteps = active.items.filter((item) => isVisible(item.id));
  const visibleGroups = searchGroups
    ?.map((group) => ({ ...group, items: group.items.filter((item) => isVisible(item.id)) }))
    .filter((group) => group.items.length > 0);
  const resultCount = visibleGroups?.reduce((n, group) => n + group.items.length, 0) ?? 0;

  const renderStep = (item: WalkthroughStep) => (
    <StepRow
      key={item.id}
      item={item}
      checked={done.has(item.id)}
      highlighted={highlightId === item.id}
      onToggle={(next) => setSteps([item.id], next)}
    />
  );

  const prevChapter = sections[activeIndex - 1];
  const nextChapter = sections[activeIndex + 1];

  return (
    <div className="flex flex-col gap-5">
      {/* Summary: overall ring + "next up" */}
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex items-center gap-5">
          <ProgressRing percent={percent} size={104} stroke={10}>
            <span className="font-heading text-3xl font-bold tabular-nums">
              {percent}
              <span className="text-base font-semibold text-muted-foreground">%</span>
            </span>
          </ProgressRing>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {labels.overallProgress}
            </p>
            <p className="text-lg font-semibold">
              {t(labels.itemsComplete, { done: doneSteps, total: totalSteps })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(labels.chaptersComplete, { done: chaptersDone, total: sections.length })}
            </p>
          </div>
        </div>

        <div className="sm:ml-auto sm:w-80">
          {nextStep ? (
            <button
              type="button"
              onClick={jumpToNext}
              className="group flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-left outline-none transition-colors hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {w.nextUp}
                </span>
                <span className="truncate text-base font-medium">{nextStep.item.title}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {nextStep.section.title}
                </span>
              </span>
              <ArrowRight
                className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          ) : (
            <p className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 font-medium text-success animate-in fade-in zoom-in-95">
              <PartyPopper className="size-5 shrink-0" aria-hidden />
              {w.allDone}
            </p>
          )}
        </div>
      </div>

      {/* Toolbar: search + hide completed */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
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
            placeholder={w.searchPlaceholder}
            aria-label={w.searchPlaceholder}
            className="h-12 w-full rounded-xl border border-input bg-card pr-12 pl-11 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label={w.clearSearch}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground md:block">
              /
            </kbd>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={hideCompleted}
          onClick={() => {
            setLingering(new Set());
            writeHide(!hideCompleted);
          }}
          className="inline-flex h-12 shrink-0 items-center gap-3 rounded-xl border border-input bg-card px-4 text-base outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span
            aria-hidden
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              hideCompleted ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
                hideCompleted && "translate-x-5"
              )}
            />
          </span>
          {w.hideCompleted}
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

      {visibleGroups ? (
        /* Search results across every chapter */
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
            {resultCount === 0
              ? t(w.noResults, { query: trimmedQuery })
              : t(resultCount === 1 ? w.results_one : w.results_other, {
                  count: resultCount,
                })}
          </p>
          {visibleGroups.map(({ section, items }) => (
            <section key={section.id} className="overflow-hidden rounded-2xl border bg-card">
              <header className="flex items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    select(section.id);
                  }}
                  className="min-w-0 truncate text-left font-heading text-base font-semibold transition-colors hover:text-primary sm:text-lg"
                >
                  {section.title}
                </button>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </header>
              <ul className="divide-y">{items.map(renderStep)}</ul>
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            {/* Desktop: chapter index */}
            <aside className="hidden md:block md:w-72 md:shrink-0">
              <nav
                aria-label={labels.chapters}
                className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-1 overflow-y-auto overscroll-contain pr-1 pb-2 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
              >
                {sections.map((section, index) => {
                  const stats = chapterStats[index];
                  const complete = stats.total > 0 && stats.done === stats.total;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => select(section.id)}
                      aria-current={isActive ? "step" : undefined}
                      className={cn(
                        "flex items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <ChapterBadge index={index} complete={complete} active={isActive} />
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="text-[15px] leading-snug font-medium">
                          {section.title}
                        </span>
                        <span className="flex items-center gap-2">
                          <Bar
                            percent={computeCompletionPercent(stats.total, stats.done)}
                            complete={complete}
                          />
                          <span className="text-xs tabular-nums opacity-80">
                            {stats.done}/{stats.total}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Mobile: horizontal chapter strip */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map((section, index) => {
                const stats = chapterStats[index];
                const complete = stats.total > 0 && stats.done === stats.total;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={section.id}
                    ref={(el) => {
                      if (el) pillRefs.current.set(section.id, el);
                      else pillRefs.current.delete(section.id);
                    }}
                    type="button"
                    onClick={() => select(section.id)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[15px] transition-colors",
                      isActive
                        ? "border-primary/50 bg-accent font-medium text-accent-foreground"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    <ChapterBadge index={index} complete={complete} active={isActive} />
                    {section.title}
                    <span className="text-xs tabular-nums opacity-70">
                      {stats.done}/{stats.total}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active chapter */}
            <section
              ref={chapterRef}
              aria-labelledby="active-chapter-title"
              className="min-w-0 flex-1 scroll-mt-20 overflow-hidden rounded-2xl border bg-card"
            >
              <header className="flex flex-col gap-3 border-b bg-muted/30 px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {t(w.chapterOf, { n: activeIndex + 1, total: sections.length })}
                    </p>
                    <h2
                      id="active-chapter-title"
                      className="font-heading text-xl font-semibold tracking-tight sm:text-2xl"
                    >
                      {active.title}
                    </h2>
                  </div>
                  {active.items.length > 0 && (
                    <button
                      type="button"
                      onClick={onChapterAction}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                        confirmClear
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-input bg-background/60 hover:bg-muted"
                      )}
                    >
                      {chapterComplete ? (
                        <RotateCcw className="size-4" aria-hidden />
                      ) : (
                        <CheckCheck className="size-4" aria-hidden />
                      )}
                      {chapterComplete
                        ? confirmClear
                          ? w.confirmClear
                          : w.clearChapter
                        : w.markChapter}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Bar percent={activePercent} complete={chapterComplete} className="h-2" />
                  <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {activeStats.done}/{activeStats.total}
                  </span>
                </div>
                {chapterComplete && (
                  <p
                    key={active.id}
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success animate-in fade-in zoom-in-90 duration-300"
                  >
                    <PartyPopper className="size-4" aria-hidden />
                    {w.chapterComplete}
                  </p>
                )}
              </header>

              {visibleSteps.length > 0 ? (
                <ul className="divide-y">{visibleSteps.map(renderStep)}</ul>
              ) : (
                <p className="px-6 py-12 text-center text-base text-muted-foreground">
                  {w.allHidden}
                </p>
              )}

              {(prevChapter || nextChapter) && (
                <footer className="grid grid-cols-2 gap-3 border-t p-4 sm:p-5">
                  {prevChapter ? (
                    <ChapterLink
                      direction="prev"
                      label={w.previous}
                      title={prevChapter.title}
                      onClick={() => goToChapter(activeIndex - 1)}
                    />
                  ) : (
                    <span />
                  )}
                  {nextChapter ? (
                    <ChapterLink
                      direction="next"
                      label={w.next}
                      title={nextChapter.title}
                      onClick={() => goToChapter(activeIndex + 1)}
                    />
                  ) : (
                    <span />
                  )}
                </footer>
              )}
            </section>
          </div>
          <p className="hidden text-center text-xs text-muted-foreground md:block">
            {w.shortcuts}
          </p>
        </>
      )}
    </div>
  );
}

function StepRow({
  item,
  checked,
  highlighted,
  onToggle,
}: {
  item: WalkthroughStep;
  checked: boolean;
  highlighted: boolean;
  onToggle: (next: boolean) => void;
}) {
  const checkId = `step-check-${item.id}`;
  const titleId = `step-title-${item.id}`;
  return (
    <li
      id={`step-${item.id}`}
      className={cn(
        "scroll-mt-24 px-5 py-4 transition-colors duration-500 sm:px-6",
        highlighted ? "bg-primary/15" : "hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-4">
        <button
          id={checkId}
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-labelledby={titleId}
          onClick={() => onToggle(!checked)}
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 outline-none transition-all duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90",
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background/40 hover:border-primary/70"
          )}
        >
          {checked && (
            <Check
              className="size-4.5 animate-in fade-in zoom-in-50 duration-200"
              strokeWidth={3}
              aria-hidden
            />
          )}
        </button>
        <label htmlFor={checkId} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1">
          <span
            id={titleId}
            className={cn(
              "text-base leading-snug font-medium transition-colors sm:text-[17px]",
              checked &&
                "text-muted-foreground line-through decoration-muted-foreground/40 decoration-2"
            )}
          >
            {item.title}
          </span>
          {item.description && (
            <span
              className={cn(
                "text-sm leading-relaxed text-muted-foreground sm:text-[15px]",
                checked && "opacity-70"
              )}
            >
              {item.description}
            </span>
          )}
        </label>
      </div>
      {item.imageUrl && (
        <a
          href={item.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-3 ml-11 block aspect-video max-w-lg overflow-hidden rounded-xl border bg-muted"
        >
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 512px"
            className="object-contain"
          />
        </a>
      )}
    </li>
  );
}

function ChapterBadge({
  index,
  complete,
  active,
}: {
  index: number;
  complete: boolean;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors",
        complete
          ? "bg-success text-success-foreground"
          : active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
      )}
    >
      {complete ? <Check className="size-4" strokeWidth={3} aria-hidden /> : index + 1}
    </span>
  );
}

function Bar({
  percent,
  complete,
  className,
}: {
  percent: number;
  complete: boolean;
  className?: string;
}) {
  return (
    <span className={cn("block h-1.5 flex-1 overflow-hidden rounded-full bg-muted", className)}>
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-500 ease-out",
          complete ? "bg-success" : "bg-primary"
        )}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}

function ChapterLink({
  direction,
  label,
  title,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  title: string;
  onClick: () => void;
}) {
  const isNext = direction === "next";
  const Icon = isNext ? ArrowRight : ArrowLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-xl border border-input px-4 py-3 text-left outline-none transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/40",
        isNext && "flex-row-reverse text-right"
      )}
    >
      <Icon
        className={cn(
          "size-5 shrink-0 text-muted-foreground transition-transform group-hover:text-primary",
          isNext ? "group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5"
        )}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-semibold sm:text-base">{title}</span>
      </span>
    </button>
  );
}
