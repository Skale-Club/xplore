"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Compass, Gem, Menu, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CHAPTER_KINDS } from "@/lib/walkthrough";
import { cn } from "@/lib/utils";
import { searchWalkthroughChapters } from "@/lib/walkthrough-search";
import type { WalkthroughChapter } from "@/components/walkthrough";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Props = {
  mode: "desktop" | "mobile";
  sections: WalkthroughChapter[];
  activeId: string;
  stats: { done: number; total: number }[];
  labels: Dictionary["gameDetail"]["walkthrough"];
  onChoose: (id: string, fromDrawer?: boolean, stepId?: string) => void;
  onBeforeBrowse?: () => void;
  onInspect?: () => void;
  onReturn: () => void;
  nextUp?: React.ReactNode;
};

export function WalkthroughNavigation({ mode, sections, activeId, stats, labels, onChoose, onReturn, onBeforeBrowse, onInspect, nextUp }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const active = sections.find((section) => section.id === activeId);
  const canReturn = active?.kind !== "story" && sections.some((section) => section.kind === "story");
  const choose = (id: string, stepId?: string) => { setOpen(false); onChoose(id, mode === "mobile", stepId); };
  const returnToStory = () => { setOpen(false); setQuery(""); onReturn(); };
  const returnButton = canReturn ? (
    <button type="button" onClick={returnToStory} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
      <ArrowLeft className="size-4" aria-hidden />{labels.backToStory}
    </button>
  ) : null;

  const index = <ChapterIndex sections={sections} activeId={activeId} stats={stats} labels={labels} onChoose={choose} query={query} resultId={`${searchId}-results`} />;
  const search = (
    <div className="relative min-w-0">
      <label htmlFor={searchId} className="sr-only">{labels.navigationSearchLabel}</label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={searchRef}
        id={searchId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => onInspect?.()}
        placeholder={labels.navigationSearch}
        aria-controls={`${searchId}-results`}
        className="h-11 w-full min-w-0 rounded-xl border border-input bg-card pr-11 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {query && (
        <button
          type="button"
          aria-label={labels.clearSearch}
          onClick={() => { setQuery(""); searchRef.current?.focus(); }}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );

  if (mode === "desktop") {
    return (
      <aside className="hidden md:sticky md:top-20 md:flex md:w-72 md:shrink-0 md:flex-col md:gap-2 md:self-start">
        {nextUp}{returnButton}{search}
        <div className="max-h-[calc(100dvh-16rem)] overflow-y-auto overscroll-contain pr-1 pb-6 [scrollbar-width:thin]">{index}</div>
      </aside>
    );
  }

  return (
    <div className="sticky top-16 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2 shadow-sm backdrop-blur md:hidden">
      <Dialog open={open} onOpenChange={(next) => { if (next && !open) onBeforeBrowse?.(); setOpen(next); }}>
        <DialogTrigger render={<button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />}>
          <Menu className="size-4" aria-hidden />{labels.navigate}
        </DialogTrigger>
        <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium">{active?.title}</span>
        <DialogContent closeLabel={labels.close} className="top-0 left-0 flex h-dvh max-h-dvh w-[min(90vw,24rem)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-r p-0 sm:max-w-sm">
          <div className="shrink-0 border-b p-4 pr-12">
            <DialogTitle>{labels.navigationTitle}</DialogTitle>
            <DialogDescription className="mt-2">{labels.navigationDescription}</DialogDescription>
          </div>
          <div className="shrink-0 border-b p-3">{search}</div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {canReturn && <div className="mb-3">{returnButton}</div>}
            {index}
          </div>
        </DialogContent>
      </Dialog>
      {returnButton}
    </div>
  );
}

function ChapterIndex({ sections, activeId, stats, labels, onChoose, query, resultId }: {
  sections: Props["sections"];
  activeId: string;
  stats: Props["stats"];
  labels: Props["labels"];
  onChoose: (chapterId: string, stepId?: string) => void;
  query: string;
  resultId: string;
}) {
  const story = sections.filter((section) => section.kind === "story");
  const matches = useMemo(() => searchWalkthroughChapters(sections, query), [sections, query]);
  return (
    <nav id={resultId} aria-label={labels.navigationTitle} className="flex flex-col gap-4">
      {matches.length === 0 && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">{labels.navigationNoResults}</p>}
      {CHAPTER_KINDS.map((kind) => {
        const chapters = matches.filter(({ section }) => section.kind === kind);
        if (!chapters.length) return null;
        return (
          <div key={kind} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{labels.kinds[kind]}</p>
            {chapters.map(({ section, index, items }) => {
              const count = stats[index];
              const complete = count.total > 0 && count.done === count.total;
              const Icon = complete ? Check : kind === "side" ? Compass : kind === "collectible" ? Gem : null;
              return (
                <div key={section.id} className="flex flex-col gap-1">
                <button type="button" onClick={() => onChoose(section.id)} aria-current={activeId === section.id ? "step" : undefined} className={cn("flex min-h-14 items-start gap-3 rounded-xl px-3 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50", activeId === section.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/60")}>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold", complete && "bg-success text-success-foreground")}>{Icon ? <Icon className="size-4" aria-hidden /> : story.findIndex((chapter) => chapter.id === section.id) + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[15px] leading-snug font-medium">{section.title}</span><span className="mt-1 block text-xs tabular-nums opacity-80">{count.done}/{count.total}</span></span>
                </button>
                {items.length > 0 && (
                  <ul className="ml-6 flex flex-col gap-1 border-l pl-2">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => onChoose(section.id, item.id)} className="flex min-h-11 w-full flex-col justify-center gap-1 rounded-lg px-3 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50">
                          <span className="text-sm leading-snug font-medium text-foreground">{item.title}</span>
                          <span className="text-xs leading-snug text-muted-foreground">{section.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
