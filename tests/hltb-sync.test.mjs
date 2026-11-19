import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHltbTitle, hltbCacheFields, shouldLookupHltb, mergeHltbCache, matchHltbCandidate, lookupHltb } from "../scripts/games/hltb.mjs";

const cached = { hltb_id: "42", hltb_main_hours: 12 };
const candidate = (overrides = {}) => ({ id: "42", name: "Game", platforms: "PC, PlayStation 3", completionTimes: { main: 12 }, ...overrides });

test("missing/null/zero caches retry; usable IDs stay cached unless refreshed", () => {
  for (const doc of [{}, { hltb_id: null }, { hltb_id: "42", hltb_main_hours: 0 }, { hltb_id: "42", hltb_main_hours: NaN }]) assert.equal(shouldLookupHltb(doc), true);
  assert.equal(shouldLookupHltb(cached), false);
  assert.equal(shouldLookupHltb(cached, true), true);
});

test("normalization handles accents, punctuation and Delta, preserving editions", () => {
  assert.equal(normalizeHltbTitle("Métal Gear Solid Δ: Snake Eater"), normalizeHltbTitle("metal gear solid delta - snake eater"));
  assert.notEqual(normalizeHltbTitle("Game Remake"), normalizeHltbTitle("Game"));
});

test("matching rejects fuzzy titles and disambiguates platform", () => {
  assert.equal(matchHltbCandidate([candidate({ name: "Game Remake" })], "Game", "PS3"), null);
  const games = [candidate({ id: "5909", platforms: "Game Boy Color" }), candidate({ id: "5908", platforms: "PlayStation" })];
  assert.equal(matchHltbCandidate(games, "Game", "PlayStation").hltb_id, "5908");
  assert.equal(matchHltbCandidate(games, "Game"), null);
  assert.equal(matchHltbCandidate(games, "Game", "PS3"), null);
  assert.equal(matchHltbCandidate([candidate({ platforms: "Nintendo GameCube" })], "Game", "GameCube").hltb_id, "42");
  assert.equal(matchHltbCandidate([candidate({ platforms: undefined })], "Game", "PS3"), null);
  assert.equal(matchHltbCandidate([candidate(), candidate({ id: "43" })], "Game", "PS3"), null);
});

test("invalid IDs and zero/nonfinite times cannot become cache", () => {
  for (const id of [null, "", "0", "abc", -1]) assert.equal(hltbCacheFields({ hltb_id: id, hltb_main_hours: 12 }), null);
  assert.equal(matchHltbCandidate([candidate({ completionTimes: { main: 0, mainExtra: NaN, completionist: Infinity } })], "Game"), null);
  assert.deepEqual(hltbCacheFields({ hltb_id: "42", hltb_main_hours: 0, hltb_main_extra_hours: 20 }), { hltb_id: "42", hltb_main_hours: null, hltb_main_extra_hours: 20, hltb_completionist_hours: null });
});

test("lookup searches candidates and passes a bounded result limit", async () => {
  const calls = [];
  const result = await lookupHltb({ search: async (...args) => { calls.push(args); return [candidate({ name: "Other" }), candidate()]; } }, "Game", { platform: "PS3" });
  assert.equal(result.hltb_id, "42");
  assert.deepEqual(calls, [["Game", { limit: 5 }]]);
});

test("failed refresh preserves good cache and omission preserves DB fields", async (t) => {
  t.mock.method(console, "warn", () => {});
  const result = await lookupHltb({ search: async () => { throw new Error("offline"); } }, "Game");
  assert.equal(result, null);
  assert.equal(mergeHltbCache(cached, result), cached);
  assert.equal(mergeHltbCache(cached, { hltb_id: "42", hltb_main_hours: 0 }), cached);
  assert.deepEqual({ ...(hltbCacheFields({ hltb_id: null }) ?? {}) }, {});
});

test("lookup returns after its finite deadline", async (t) => {
  t.mock.method(console, "warn", () => {});
  const start = Date.now();
  assert.equal(await lookupHltb({ search: () => new Promise(() => {}) }, "Game", { timeoutMs: 10 }), null);
  assert.ok(Date.now() - start < 1000);
});
