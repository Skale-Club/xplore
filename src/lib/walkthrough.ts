// Shared by the game page (server: which chapter to open on entry) and the
// Walkthrough (client: "Next up", auto-advance), so both pick the same step.

type ChapterLike = { id: string; items: { id: string }[] };

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
