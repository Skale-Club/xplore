import assert from "node:assert/strict";
import { test } from "node:test";
import { validateGuideArray, validateGuides } from "../scripts/games/guides.mjs";
import { GUIDE_TOPICS, parseGameGuides, localizeGameGuides, searchGameGuides } from "../src/lib/game-guides.ts";

const guide = () => ({ key: "alchemy-basics", topic: "alchemy",
  title: "Alchemy basics", title_i18n: { en: "Alchemy basics", pt: "Fundamentos da alquimia" },
  summary: "Prepare potions safely.", summary_i18n: { en: "Prepare potions safely.", pt: "Prepare poções com segurança." },
  body: "SECRET SOLUTION\n<script>alert('text only')</script>", body_i18n: { en: "SECRET SOLUTION\n<script>alert('text only')</script>", pt: "SOLUÇÃO OCULTA\n<script>alert('somente texto')</script>" },
});

test("absence preserves guides while null and [] explicitly clear", () => {
  assert.equal(validateGuides({}), undefined);
  assert.deepEqual(validateGuides({ guides: null }), []);
  assert.deepEqual(validateGuides({ guides: [] }), []);
});
test("bilingual import/export preserves curator keys and order", () => {
  const rows = [guide(), { ...guide(), key: "different-stable-key", title: "Renamed guide", title_i18n: { en: "Renamed guide", pt: "Guia renomeado" } }];
  assert.deepEqual(validateGuideArray(rows), rows);
  assert.deepEqual(parseGameGuides(rows), rows);
  assert.deepEqual(validateGuideArray(JSON.parse(JSON.stringify(rows))).map((row) => row.key), ["alchemy-basics", "different-stable-key"]);
});
test("every topic is accepted consistently", () => {
  for (const topic of GUIDE_TOPICS) {
    const value = [{ ...guide(), topic }];
    assert.equal(validateGuideArray(value)[0].topic, topic);
    assert.equal(parseGameGuides(value)[0].topic, topic);
  }
});
test("invalid content is rejected by importer and ignored safely by reader", () => {
  const mutations = [
    (g) => { g.key = "Bad Key"; }, (g) => { g.topic = "unknown"; },
    (g) => { delete g.title_i18n.pt; }, (g) => { g.summary_i18n.pt = " "; },
    (g) => { g.body_i18n.en = "Different fallback"; }, (g) => { g.body = null; },
    (g) => { g.title_i18n = []; }, (g) => { g.body_i18n.extra = 42; },
  ];
  for (const mutate of mutations) {
    const g = guide(); mutate(g);
    assert.throws(() => validateGuideArray([g]));
    assert.deepEqual(parseGameGuides([g]), []);
  }
  assert.throws(() => validateGuides({ guides: {} }));
  for (const value of [null, undefined, {}, "invalid", [null]]) assert.deepEqual(parseGameGuides(value), []);
});
test("duplicate keys fail writes and cannot duplicate reader entries", () => {
  assert.throws(() => validateGuideArray([guide(), guide()]));
  assert.equal(parseGameGuides([guide(), guide()]).length, 1);
});
test("localization uses PT with English fallback for an unavailable locale", () => {
  assert.equal(localizeGameGuides([guide()], "pt")[0].summary, "Prepare poções com segurança.");
  assert.equal(localizeGameGuides([guide()], "fr")[0].body, guide().body);
});
test("search is accent/case insensitive and never reads hidden bodies", () => {
  const rows = localizeGameGuides([guide()], "pt");
  assert.equal(searchGameGuides(rows, "POCOES").length, 1);
  assert.equal(searchGameGuides(rows, "fundamentos").length, 1);
  assert.equal(searchGameGuides(rows, "SOLUCAO OCULTA").length, 0);
  assert.equal(searchGameGuides(rows, "alert").length, 0);
});
test("topic filter combines with search without changing source content", () => {
  const rows = localizeGameGuides([guide(), { ...guide(), key: "combat", topic: "combat" }], "en");
  assert.deepEqual(searchGameGuides(rows, "potions", "combat").map((g) => g.key), ["combat"]);
  assert.deepEqual(searchGameGuides(rows, "", "exploration"), []);
  assert.equal(rows.length, 2);
});
