// Shared by the game page (server: which chapter to open on entry) and the
// Walkthrough (client: "Next up", auto-advance), so both pick the same step.

type ChapterLike = { id: string; items: { id: string }[] };

/** checklist_categories.kind */
export type ChapterKind = "story" | "side" | "collectible";

export const CHAPTER_KINDS: ChapterKind[] = ["story", "side", "collectible"];

export function asChapterKind(value: string | null | undefined): ChapterKind {
  return value === "side" || value === "collectible" ? value : "story";
}

/**
 * The chapters that drive "Next up", resuming and auto-advance: the story
 * ones. Side quests and collectibles never pull the player off the main path.
 * A game with no story chapters falls back to everything.
 */
export function storyChapters<C extends ChapterLike & { kind?: ChapterKind }>(sections: C[]): C[] {
  const story = sections.filter((section) => (section.kind ?? "story") === "story");
  return story.length > 0 ? story : sections;
}

/**
 * The step the player should do next: the first unfinished step *after* the
 * one they completed most recently, wrapping around to the start. Anchoring on
 * the last thing they did (not the first gap in the list) means a skipped
 * optional step doesn't keep dragging them backwards. Null when all are done.
 */
export function findNextStep<C extends ChapterLike>(
  sections: C[],
  done: Set<string>,
  lastDoneId: string | null
): { section: C; item: C["items"][number] } | null {
  const flat = sections.flatMap((section) =>
    section.items.map((item) => ({ section, item }))
  );
  if (flat.length === 0) return null;
  const start = lastDoneId
    ? flat.findIndex((entry) => entry.item.id === lastDoneId) + 1
    : 0;
  for (let i = 0; i < flat.length; i++) {
    const entry = flat[(start + i) % flat.length];
    if (!done.has(entry.item.id)) return entry;
  }
  return null;
}
