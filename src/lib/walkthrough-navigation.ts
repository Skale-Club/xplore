import type { ChapterKind } from "./walkthrough";

export type StoryPosition = { chapterId: string; scrollY: number };

/** Ignore stale or malformed device state and return to an available story chapter. */
export function resolveStoryPosition(
  sections: { id: string; kind: ChapterKind }[],
  candidate: unknown,
  fallbackId: string
): StoryPosition | null {
  const story = sections.filter((section) => section.kind === "story");
  if (story.length === 0) return null;
  if (candidate && typeof candidate === "object" && "chapterId" in candidate && "scrollY" in candidate) {
    if (
      typeof candidate.chapterId === "string" &&
      story.some((section) => section.id === candidate.chapterId) &&
      typeof candidate.scrollY === "number" &&
      Number.isFinite(candidate.scrollY) &&
      candidate.scrollY >= 0
    ) {
      return { chapterId: candidate.chapterId, scrollY: candidate.scrollY };
    }
  }
  return { chapterId: story.find((section) => section.id === fallbackId)?.id ?? story[0].id, scrollY: 0 };
}
