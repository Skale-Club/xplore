"use client";

import { useId, useMemo, useRef, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GUIDE_TOPICS, searchGameGuides, type GuideTopic, type LocalizedGameGuide } from "@/lib/game-guides";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function GameGuides({ guides, labels, toolbarLeading }: {
  guides: LocalizedGameGuide[];
  labels: Dictionary["gameDetail"]["guides"];
  toolbarLeading?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<GuideTopic | "all">("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const searchId = useId();
  const topicId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchGameGuides(guides, query, topic), [guides, query, topic]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {toolbarLeading}
        <div className="min-w-0 flex-1">
          <label htmlFor={searchId} className="mb-1 block text-sm font-medium">{labels.searchLabel}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input ref={searchRef} id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.searchPlaceholder} className="min-h-11 w-full rounded-xl border bg-card pr-12 pl-9 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:appearance-none" />
            {query && <button type="button" aria-label={labels.clearSearch} onClick={() => { setQuery(""); searchRef.current?.focus(); }} className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-xl outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"><X className="size-4" aria-hidden /></button>}
          </div>
        </div>
        <div className="min-w-0 md:w-48">
          <label htmlFor={topicId} className="mb-1 block text-sm font-medium">{labels.topicLabel}</label>
          <select id={topicId} value={topic} onChange={(event) => setTopic(event.target.value as GuideTopic | "all")} className="min-h-11 w-full rounded-xl border bg-card px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value="all">{labels.allTopics}</option>
            {GUIDE_TOPICS.map((value) => <option key={value} value={value}>{labels.topics[value]}</option>)}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{labels.description}</p>
      {results.length === 0 ? <p role="status" className="rounded-xl border px-4 py-8 text-center text-muted-foreground">{labels.noResults}</p> : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {results.map((guide) => <li key={guide.key} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
            <p className="text-xs font-semibold text-muted-foreground">{labels.topics[guide.topic]}</p>
            <h2 className="font-heading text-lg font-semibold">{guide.title}</h2>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{guide.summary}</p>
            <Dialog open={openKey === guide.key} onOpenChange={(open) => setOpenKey(open ? guide.key : null)}>
              <DialogTrigger render={<button type="button" aria-label={`${labels.open}: ${guide.title}`} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50" />}><BookOpen className="size-4" aria-hidden />{labels.open}</DialogTrigger>
              {openKey === guide.key && <DialogContent closeLabel={labels.close} className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle className="pr-8 text-xl leading-snug">{guide.title}</DialogTitle>
                <DialogDescription className="whitespace-pre-line wrap-break-word text-base leading-relaxed">{guide.body}</DialogDescription>
              </DialogContent>}
            </Dialog>
          </li>)}
        </ul>
      )}
    </div>
  );
}
