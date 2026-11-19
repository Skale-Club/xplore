"use client";

import {
  useCallback,
  useEffect,
  useId,
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
  EyeOff,
  PartyPopper,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { computeCompletionPercent } from "@/lib/progress";
import {
  findNextStep,
  storyChapters,
  type ChapterKind,
} from "@/lib/walkthrough";
import { filterRouteSections, resolveRouteKey } from "@/lib/walkthrough-routes";
import { useWalkthroughProgress } from "@/components/walkthrough-progress";
import { StepMediaThumb } from "@/components/step-media";
import { WalkthroughNavigation } from "@/components/walkthrough-navigation";
import { useGameTabActive } from "@/components/game-tabs";
import { resolveStoryPosition, type StoryPosition } from "@/lib/walkthrough-navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { t } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { cn } from "@/lib/utils";

export type WalkthroughStep = {
  id: string;
  title: string;
  description: string | null;
  details?: string | null;
  imageUrl: string | null;
  completed: boolean;
};

export type WalkthroughChapter = {
  id: string;
  kind: ChapterKind;
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

// How long the "Chapter complete → Next: …" notice stays before moving on.
const ADVANCE_DELAY_MS = 2200;

export function Walkthrough({
  sections: allSections,
  initialSectionId,
  resumeOnMount,
  labels,
  toggleAction,
  bulkAction,
  toolbarLeading,
  saveRouteAction,
}: {
  sections: WalkthroughChapter[];
  initialSectionId: string;
  /** True when the page opened without an explicit chapter — flash the next step. */
  resumeOnMount: boolean;
  labels: Labels;
  toggleAction: (itemId: string, completed: boolean) => Promise<void>;
  bulkAction: (itemIds: string[], completed: boolean) => Promise<void>;
  saveRouteAction?: (key: string | null) => Promise<void>;
  /** Rendered at the start of the search row (the Walkthrough/Trophies switch). */
  toolbarLeading?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isTabActive = useGameTabActive("detonado");
  const w = labels.walkthrough;

  // Completion lives in the shared provider (not in each row) so every counter
  // on the page — header ring, sidebar, chapter bar, "next up" — updates the
  // instant a step is ticked, before the server round trip finishes.
  const { sections: applicableSections, done, setDone, lastDoneId, setLastDoneId, routes, routeKey, setRouteKey } = useWalkthroughProgress();
  // The provider owns applicability; enrich its filtered IDs with the viewer DTO.
  const sections = useMemo(() => {
    const sources = new Map(allSections.map((section) => [section.id, section]));
    return applicableSections.map((section) => {
      const source = sources.get(section.id);
      const ids = new Set(section.items.map((item) => item.id));
      return source ? { ...source, items: source.items.filter((item) => ids.has(item.id)) } : null;
    }).filter((section): section is WalkthroughChapter => section !== null);
  }, [applicableSections, allSections]);
  const [routeSaving, setRouteSaving] = useState(false);
  const routeSaveLock = useRef(false);
  const navigationEpoch = useRef(0);
  const routeSelectId = useId();
  const selectedRoute = routes.find((route) => route.key === routeKey);
  const routeStorageKey = routes.length
    ? `xplore:walkthrough:story:v2:${pathname}:${routeKey ?? "common"}`
    : `xplore:walkthrough:story:v1:${pathname}`;
  const chapterUrl = useCallback((id: string, key: string | null = routeKey) => {
    const params = new URLSearchParams();
    if (id) params.set("c", id);
    if (routes.length) params.set("route", key ?? "common");
    return `${pathname}?${params.toString()}`;
  }, [pathname, routeKey, routes.length]);
  const [activeId, setActiveId] = useState(initialSectionId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  // On a fresh visit (no ?c=), land on the step they left off at.
  const [highlightId, setHighlightId] = useState<string | null>(() =>
    resumeOnMount
      ? (findNextStep(storyChapters(sections), done, lastDoneId)?.item.id ?? null)
      : null
  );
  // Pending "chapter finished → move to the next one" hop; cancellable.
  const [advance, setAdvance] = useState<{ chapterId: string; stepId: string } | null>(
    null
  );
  const [confirmClear, setConfirmClear] = useState(false);
  // Steps ticked while "hide completed" is on stay visible until the reader
  // moves on, so they don't vanish from under the cursor.
  const [lingering, setLingering] = useState<Set<string>>(() => new Set());
  const hideCompleted = useSyncExternalStore(subscribeHide, readHide, () => false);
  const [, startTransition] = useTransition();

  const searchRef = useRef<HTMLInputElement>(null);
  const chapterRef = useRef<HTMLElement>(null);
  const storyPositionRef = useRef<StoryPosition | null>(null);
  const restoreFrame = useRef<number | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId)
  );
  const active = sections[activeIndex] ?? { id: "", kind: "story" as const, title: w.routeNoSteps, items: [] };

  const chapterStats = useMemo(
    () =>
      sections.map((section) => ({
        done: section.items.reduce((n, item) => n + (done.has(item.id) ? 1 : 0), 0),
        total: section.items.length,
      })),
    [sections, done]
  );
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

  const rememberStoryPosition = useCallback(() => {
      if (sections.some((section) => section.id === activeId && section.kind === "story")) {
        const position = { chapterId: activeId, scrollY: window.scrollY };
        storyPositionRef.current = position;
        try {
          window.sessionStorage.setItem(routeStorageKey, JSON.stringify(position));
        } catch {
          // Keep the in-memory return point when device storage is unavailable.
        }
      }
  }, [sections, activeId, routeStorageKey]);

  const select = useCallback(
    (id: string, preserveStoryPosition = false) => {
      if (activeId !== id && !preserveStoryPosition) rememberStoryPosition();
      setActiveId(id);
      setConfirmClear(false);
      setLingering(new Set());
      setAdvance(null);
      // Persist across refresh without moving the scroll position.
      router.replace(chapterUrl(id), { scroll: false });
    },
    [router, chapterUrl, activeId, rememberStoryPosition]
  );

  useEffect(() => () => {
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
  }, []);

  // Resume / "Next up" / auto-advance: flash the target step, scrolling only
  // if it isn't already comfortably on screen.
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`step-${highlightId}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > window.innerHeight - 24) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    const timer = setTimeout(() => setHighlightId(null), 2600);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // Finishing a chapter queues a hop to the chapter holding the next step.
  useEffect(() => {
    if (!advance || !isTabActive) return;
    const epoch = navigationEpoch.current;
    const timer = setTimeout(() => {
      if (epoch !== navigationEpoch.current || !sections.some((section) => section.id === advance.chapterId && section.items.some((item) => item.id === advance.stepId))) return;
      select(advance.chapterId);
      setHighlightId(advance.stepId);
    }, ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [advance, select, sections, isTabActive]);

  function advanceNow() {
    if (!advance) return;
    select(advance.chapterId);
    setHighlightId(advance.stepId);
  }

  // Keyboard: ← / → switch chapters, "/" focuses search.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isTabActive) return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.closest('[role="dialog"]'))
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
  }, [activeIndex, sections, select, trimmedQuery, isTabActive]);

  function setSteps(ids: string[], completed: boolean) {
    if (ids.length === 0) return;
    const wereDone = ids.filter((id) => done.has(id));

    const nextDone = new Set(done);
    for (const id of ids) {
      if (completed) nextDone.add(id);
      else nextDone.delete(id);
    }
    setDone(nextDone);

    const nextLastDone = completed ? ids[ids.length - 1] : lastDoneId;
    if (completed) setLastDoneId(nextLastDone);
    if (completed && hideCompleted) {
      setLingering((prev) => new Set([...prev, ...ids]));
    }
    setError(null);

    // Did this action just finish the open chapter? Then queue the hop to
    // wherever the next step lives (cancellable via "Stay here").
    const wasComplete = active.items.every((item) => done.has(item.id));
    const nowComplete = active.items.every((item) => nextDone.has(item.id));
    if (completed && !wasComplete && nowComplete && !trimmedQuery) {
      // Only story chapters hop onward; finishing a side quest or
      // collectibles page never yanks the player somewhere else.
      const target =
        active.kind === "story"
          ? findNextStep(storyChapters(sections), nextDone, nextLastDone)
          : null;
      setAdvance(
        target && target.section.id !== active.id
          ? { chapterId: target.section.id, stepId: target.item.id }
          : null
      );
    } else if (!completed) {
      setAdvance(null);
    }

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

  const activeStats = chapterStats[activeIndex] ?? { done: 0, total: 0 };
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

  const nextStep = findNextStep(storyChapters(sections), done, lastDoneId);

  // Story chapters are numbered 1..N; side quests and collectibles get an icon.
  const storyIndex = new Map(
    sections.filter((section) => section.kind === "story").map((section, i) => [section.id, i])
  );
  const storyCount = storyIndex.size;
  const chapterNumber = (section: WalkthroughChapter, index: number) =>
    (storyIndex.get(section.id) ?? index) + 1;

  function jumpToNext() {
    if (!nextStep) return;
    setQuery("");
    if (nextStep.section.id !== active.id) select(nextStep.section.id);
    setHighlightId(nextStep.item.id);
  }

  // "Next up" card: top of the chapter index on desktop, above the chapter
  // strip on phones.
  const nextUpCard = nextStep ? (
    <button
      type="button"
      onClick={jumpToNext}
      className="group flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-left outline-none transition-colors hover:bg-primary/15 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
          {w.nextUp}
        </span>
        <span className="truncate text-sm font-medium">{nextStep.item.title}</span>
        <span className="truncate text-xs text-muted-foreground">{nextStep.section.title}</span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  ) : (
    <p className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium", routes.length > 0 && !routeKey ? "text-muted-foreground" : "border-success/30 bg-success/10 text-success animate-in fade-in zoom-in-95")}>
      {routes.length > 0 && !routeKey ? <Info className="size-4 shrink-0" aria-hidden /> : <PartyPopper className="size-4 shrink-0" aria-hidden />}
      {routes.length === 0 ? w.allDone : !routeKey ? w.routeChoosePrompt : sections.every((section) => section.items.every((item) => done.has(item.id))) ? w.routeComplete : w.routeStoryComplete}
    </p>
  );

  // Picking a chapter while scrolled deep into a long one brings its top back
  // into view; otherwise the page stays put.
  function openChapter(id: string, fromDrawer = false, stepId?: string) {
    setQuery("");
    select(id, fromDrawer);
    if (stepId && sections.some((section) => section.id === id && section.items.some((item) => item.id === stepId))) {
      setLingering(new Set([stepId]));
      setHighlightId(stepId);
      return;
    }
    const top = chapterRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) chapterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function returnToStory() {
    let candidate: unknown = storyPositionRef.current;
    if (!candidate) {
      try {
        candidate = JSON.parse(window.sessionStorage.getItem(routeStorageKey) ?? "null");
      } catch {
        candidate = null;
      }
    }
    const position = resolveStoryPosition(sections, candidate, nextStep?.section.id ?? initialSectionId);
    if (!position) return;
    setQuery("");
    setHighlightId(null);
    select(position.chapterId);
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
    restoreFrame.current = requestAnimationFrame(() => {
      restoreFrame.current = requestAnimationFrame(() => {
        window.scrollTo({ top: position.scrollY, behavior: "instant" });
        restoreFrame.current = null;
      });
    });
  }

  async function chooseRoute(requestedKey: string | null) {
    const key = resolveRouteKey(routes, requestedKey);
    if (routeSaveLock.current || key === routeKey) return;
    routeSaveLock.current = true;
    setRouteSaving(true);
    rememberStoryPosition();
    const previous = { key: routeKey, activeId, position: storyPositionRef.current };
    navigationEpoch.current++;
    setAdvance(null);
    setQuery("");
    setHighlightId(null);
    setLingering(new Set());
    setConfirmClear(false);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
    storyPositionRef.current = null;
    setError(null);
    const nextSections = filterRouteSections(allSections, routes, key);
    const target = nextSections.find((section) => section.id === activeId)?.id
      ?? findNextStep(storyChapters(nextSections), done, lastDoneId)?.section.id
      ?? nextSections[0]?.id ?? "";
    setRouteKey(key);
    setActiveId(target);
    router.replace(chapterUrl(target, key), { scroll: false });
    try {
      await saveRouteAction?.(key);
    } catch {
      navigationEpoch.current++;
      setAdvance(null);
      setQuery("");
      setHighlightId(null);
      setLingering(new Set());
      setRouteKey(previous.key);
      setActiveId(previous.activeId);
      storyPositionRef.current = previous.position;
      router.replace(chapterUrl(previous.activeId, previous.key), { scroll: false });
      setError(w.routeSaveError);
    } finally {
      routeSaveLock.current = false;
      setRouteSaving(false);
    }
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
      mediaLabels={w}
      onInspect={() => setAdvance(null)}
    />
  );

  const prevChapter = sections[activeIndex - 1];
  const nextChapter = sections[activeIndex + 1];

  return (
    <div className="flex flex-col gap-5">
      <WalkthroughNavigation key={`mobile:${routeKey ?? "common"}`} mode="mobile" sections={sections} activeId={active.id} stats={chapterStats} labels={w} onChoose={openChapter} onReturn={returnToStory} onBeforeBrowse={() => { rememberStoryPosition(); setAdvance(null); }} onInspect={() => setAdvance(null)} />
      {routes.length > 0 && (
        <section aria-label={w.routeLabel} aria-busy={routeSaving} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <label htmlFor={routeSelectId} className="text-sm font-semibold">{w.routeLabel}</label>
          <select id={routeSelectId} value={routeKey ?? "common"} disabled={routeSaving} onFocus={() => setAdvance(null)} onChange={(event) => void chooseRoute(event.target.value === "common" ? null : event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value="common">{w.routeCommonOption}</option>
            {routes.map((route) => <option key={route.key} value={route.key}>{route.title}</option>)}
          </select>
          <p role="status" className="text-sm text-muted-foreground">{routeSaving ? w.routeSaving : selectedRoute ? t(w.routeSummary, { route: selectedRoute.title, percent: computeCompletionPercent(sections.reduce((sum, section) => sum + section.items.length, 0), sections.reduce((sum, section) => sum + section.items.filter((item) => done.has(item.id)).length, 0)) }) : w.routeChoosePrompt}</p>
          <p className="text-xs text-muted-foreground">{w.routeCoverageNote}</p>
          {selectedRoute && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {selectedRoute.details && <Dialog onOpenChange={(open) => { if (open) setAdvance(null); }}>
                <DialogTrigger render={<button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50" />}><Info className="size-4" aria-hidden />{w.routeDetails}</DialogTrigger>
                <DialogContent closeLabel={w.close} className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
                  <DialogTitle>{selectedRoute.title}</DialogTitle>
                  <DialogDescription className="whitespace-pre-line text-base leading-relaxed">{selectedRoute.details}</DialogDescription>
                </DialogContent>
              </Dialog>}
              {selectedRoute.replayFrom && sections.some((section) => section.id === selectedRoute.replayFrom?.chapterId && section.items.some((item) => item.id === selectedRoute.replayFrom?.itemId)) && <button type="button" disabled={routeSaving} onClick={() => { const checkpoint = selectedRoute.replayFrom; if (checkpoint) openChapter(checkpoint.chapterId, false, checkpoint.itemId); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"><RotateCcw className="size-4" aria-hidden />{w.routeCheckpoint}</button>}
            </div>
          )}
        </section>
      )}
      {/* Toolbar: tab switch + search + hide completed (one row from md up) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {toolbarLeading && (
          <div onFocusCapture={() => setAdvance(null)} onClickCapture={() => setAdvance(null)} onKeyDownCapture={() => setAdvance(null)} className="w-full md:w-auto [&>[role=tablist]]:w-full md:[&>[role=tablist]]:w-auto">
            {toolbarLeading}
          </div>
        )}
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onFocus={() => setAdvance(null)}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
                event.currentTarget.blur();
              }
            }}
            placeholder={w.searchPlaceholder}
            aria-label={w.searchPlaceholder}
            className="h-11 w-full rounded-xl border border-input bg-card pr-12 pl-11 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
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
          aria-label={w.hideCompleted}
          title={w.hideCompleted}
          onClick={() => {
            setLingering(new Set());
            writeHide(!hideCompleted);
          }}
          className="inline-flex h-11 shrink-0 items-center gap-3 rounded-xl border border-input bg-card px-3 text-[15px] outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40 sm:px-4"
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
          <EyeOff className="size-4 text-muted-foreground sm:hidden" aria-hidden />
          <span className="hidden sm:inline">{w.hideCompleted}</span>
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
            <WalkthroughNavigation key={`desktop:${routeKey ?? "common"}`} mode="desktop" sections={sections} activeId={active.id} stats={chapterStats} labels={w} onChoose={openChapter} onReturn={returnToStory} nextUp={nextUpCard} onInspect={() => setAdvance(null)} />
            <div className="md:hidden">{nextUpCard}</div>

            {/* Active chapter */}
            <section
              ref={chapterRef}
              aria-labelledby="active-chapter-title"
              // At least as tall as the sticky chapter index, so the index stays
              // pinned for the whole scroll instead of being pushed up at the end.
              className="min-w-0 flex-1 scroll-mt-20 overflow-hidden rounded-2xl border bg-card md:flex md:min-h-[calc(100dvh-6rem)] md:flex-col"
            >
              <header className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {active.kind === "story"
                        ? t(w.chapterOf, {
                            n: chapterNumber(active, activeIndex),
                            total: storyCount || sections.length,
                          })
                        : active.kind === "side"
                          ? w.sideQuest
                          : w.collectibleChapter}
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
                      aria-label={
                        chapterComplete
                          ? confirmClear
                            ? w.confirmClear
                            : w.clearChapter
                          : w.markChapter
                      }
                      className={cn(
                        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 sm:px-3.5",
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
                      {/* Icon-only on phones, except the confirm prompt, which
                          must be readable before the second click. */}
                      <span className={confirmClear ? "inline" : "hidden sm:inline"}>
                        {chapterComplete
                          ? confirmClear
                            ? w.confirmClear
                            : w.clearChapter
                          : w.markChapter}
                      </span>
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
                {chapterComplete && advance && (
                  <div
                    role="status"
                    className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="min-w-0 text-sm font-medium sm:flex-1">
                      {t(w.advancingTo, {
                        chapter:
                          sections.find((section) => section.id === advance.chapterId)?.title ??
                          "",
                      })}
                    </span>
                    <span className="flex shrink-0 items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAdvance(null)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {w.stayHere}
                      </button>
                      <button
                        type="button"
                        onClick={advanceNow}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        {w.goNow}
                        <ArrowRight className="size-4" aria-hidden />
                      </button>
                    </span>
                    {/* Countdown until the automatic hop. */}
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-primary"
                      style={{ animation: `xplore-countdown ${ADVANCE_DELAY_MS}ms linear forwards` }}
                    />
                  </div>
                )}
              </header>

              {/* Re-keyed per chapter so switching fades the new list in. */}
              <div
                key={active.id}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
              >
                {visibleSteps.length > 0 ? (
                  <ul className="divide-y">{visibleSteps.map(renderStep)}</ul>
                ) : (
                  <p className="px-6 py-12 text-center text-base text-muted-foreground">
                    {w.allHidden}
                  </p>
                )}
              </div>

              {(prevChapter || nextChapter) && (
                <footer className="mt-auto grid grid-cols-2 gap-3 border-t p-4 sm:p-5">
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
  item, checked, highlighted, onToggle, mediaLabels, onInspect,
}: {
  item: WalkthroughStep;
  checked: boolean;
  highlighted: boolean;
  onToggle: (next: boolean) => void;
  mediaLabels: Dictionary["gameDetail"]["walkthrough"];
  onInspect: () => void;
}) {
  const titleId = `step-title-${item.id}`;
  return (
    <li id={`step-${item.id}`} className={cn("scroll-mt-24 px-4 py-4 transition-colors duration-500 sm:px-6", highlighted ? "bg-primary/15" : "hover:bg-muted/30")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button type="button" role="checkbox" aria-checked={checked} aria-labelledby={titleId} onClick={() => onToggle(!checked)} className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span aria-hidden className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors", checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background/40")}>
              {checked && <Check className="size-4.5" strokeWidth={3} />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span id={titleId} className={cn("text-base leading-snug font-medium wrap-break-word sm:text-[17px]", checked && "text-muted-foreground line-through decoration-muted-foreground/40 decoration-2")}>{item.title}</span>
              {item.description && <span className={cn("text-sm leading-relaxed text-muted-foreground wrap-break-word sm:text-[15px]", checked && "opacity-70")}>{item.description}</span>}
            </span>
          </button>
          {item.details?.trim() && (
            <Dialog onOpenChange={(open) => { if (open) onInspect(); }}>
              <DialogTrigger render={<button type="button" aria-label={t(mediaLabels.viewDetails, { title: item.title })} title={mediaLabels.details} className="flex size-11 shrink-0 items-center justify-center rounded-lg border text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50" />}>
                <Info className="size-5" aria-hidden />
              </DialogTrigger>
              <DialogContent closeLabel={mediaLabels.close} className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{mediaLabels.details}</p>
                <DialogTitle className="pr-7 leading-snug">{item.title}</DialogTitle>
                <DialogDescription className="whitespace-pre-line wrap-break-word text-base leading-relaxed">{item.details}</DialogDescription>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {item.imageUrl && <StepMediaThumb url={item.imageUrl} title={item.title} labels={mediaLabels} onOpen={onInspect} />}
      </div>
    </li>
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
