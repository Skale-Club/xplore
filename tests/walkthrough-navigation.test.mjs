import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveStoryPosition } from "../src/lib/walkthrough-navigation.ts";
import { searchWalkthroughChapters } from "../src/lib/walkthrough-search.ts";

const chapters = [
  { id: "story-a", kind: "story", title: "Opening", items: [{ id: "a", title: "Leave home" }] },
  { id: "extras", kind: "side", title: "Selected side quests", items: [{ id: "b", title: "A missão do coração" }] },
  { id: "story-b", kind: "story", title: "The final journey", items: [{ id: "c", title: "Cross the bridge" }] },
];

test("return keeps the visited story chapter and reading position", () => {
  assert.deepEqual(resolveStoryPosition(chapters, { chapterId: "story-a", scrollY: 1280 }, "story-b"), { chapterId: "story-a", scrollY: 1280 });
});

test("stale and side-chapter return points fall back to the next story chapter", () => {
  for (const chapterId of ["removed", "extras"]) {
    assert.deepEqual(resolveStoryPosition(chapters, { chapterId, scrollY: 500 }, "story-b"), { chapterId: "story-b", scrollY: 0 });
  }
});

test("malformed device state never creates an invalid scroll target", () => {
  for (const candidate of [null, "bad JSON", {}, { chapterId: "story-a", scrollY: -1 }, { chapterId: "story-a", scrollY: Infinity }, { chapterId: "story-a", scrollY: "200" }]) {
    assert.deepEqual(resolveStoryPosition(chapters, candidate, "story-b"), { chapterId: "story-b", scrollY: 0 });
  }
});

test("invalid fallback uses the first story; games without story have no return action", () => {
  assert.equal(resolveStoryPosition(chapters, null, "missing").chapterId, "story-a");
  assert.equal(resolveStoryPosition([chapters[1]], null, "extras"), null);
});

test("empty search remains a compact chapter list", () => {
  const matches = searchWalkthroughChapters(chapters, "  ");
  assert.equal(matches.length, 3);
  assert.ok(matches.every((match) => match.items.length === 0));
});

test("quest search ignores case, accents and surrounding spaces", () => {
  const [match] = searchWalkthroughChapters(chapters, "  CORACAO  ");
  assert.equal(match.section.id, "extras");
  assert.equal(match.items[0].id, "b");
  assert.equal(match.index, 1);
});

test("chapter-title matches open the chapter without listing every unrelated task", () => {
  const [match] = searchWalkthroughChapters(chapters, "final journey");
  assert.equal(match.section.id, "story-b");
  assert.deepEqual(match.items, []);
});

test("no matches are empty and filtering preserves source order and data", () => {
  const snapshot = JSON.stringify(chapters);
  assert.deepEqual(searchWalkthroughChapters(chapters, "nonexistent quest"), []);
  assert.deepEqual(searchWalkthroughChapters(chapters, "the").map((match) => match.index), [2]);
  assert.equal(JSON.stringify(chapters), snapshot);
});
