import assert from "node:assert/strict";
import { test } from "node:test";
import { filterRouteSections, parseRouteDefinitions, resolveWalkthroughRoutes, resolveRouteKey } from "../src/lib/walkthrough-routes.ts";
import { validateRoutes } from "../scripts/games/routes.mjs";
import { findNextStep } from "../src/lib/walkthrough.ts";

const ref = (item_key) => ({ category_key: "finale", item_key });
const sections = [{ id: "chapter", key: "finale", items: [
  { id: "shared", key: "decision", completed: true },
  { id: "a", key: "ending-a", completed: false },
  { id: "b", key: "ending-b", completed: false },
] }, { id: "extras", key: "extras", items: [{ id: "extra", key: "extra", completed: false }] }];
const definition = (key) => ({ key, title: key, title_i18n: { en: key, pt: key }, details: "Replay continuously", details_i18n: { en: "Replay continuously", pt: "Rejogue sem saltar capítulos" }, item_refs: [ref(key)], replay_from: ref("decision") });
const definitions = [definition("ending-a"), definition("ending-b")];
const routes = resolveWalkthroughRoutes(definitions, sections);
const doc = { categories: sections.map((c) => ({ key: c.key, items: c.items.map((i) => ({ key: i.key })) })), routes: definitions };

test("legacy games retain their exact section array", () => {
  assert.equal(filterRouteSections(sections, [], null), sections);
  assert.deepEqual(parseRouteDefinitions(undefined), []);
});
test("no selection shows only common tasks, never all mutually exclusive goals", () => {
  assert.deepEqual(filterRouteSections(sections, routes, null).flatMap((c) => c.items.map((i) => i.id)), ["shared", "extra"]);
});
test("each alternative can reach 100% independently while preserving other completions", () => {
  const snapshot = JSON.stringify(sections);
  const done = new Set(["shared", "extra", "a"]);
  for (const [key, expected] of [["ending-a", ["shared", "a", "extra"]], ["ending-b", ["shared", "b", "extra"]]]) {
    const eligible = filterRouteSections(sections, routes, key);
    assert.deepEqual(eligible.flatMap((c) => c.items.map((i) => i.id)), expected);
    assert.equal(findNextStep(eligible, new Set([...done, "b"]), null), null);
  }
  assert.equal(findNextStep(filterRouteSections(sections, routes, "ending-b"), done, "a").item.id, "b");
  assert.ok(done.has("a"));
  assert.equal(JSON.stringify(sections), snapshot);
});
test("references resolve by parent and key, preserving localizations and checkpoint IDs", () => {
  const resolved = resolveWalkthroughRoutes(definitions, sections, (map, fallback) => map?.pt ?? fallback);
  assert.equal(resolved[0].details, "Rejogue sem saltar capítulos");
  assert.deepEqual(resolved[0].replayFrom, { chapterId: "chapter", itemId: "shared" });
  const repeated = [...sections, { id: "other", key: "other", items: [{ id: "other-a", key: "ending-a" }] }];
  assert.deepEqual(resolveWalkthroughRoutes(definitions, repeated)[0].itemIds, ["a"]);
});
test("invalid/stale route choices fall back to common without mutating completion", () => {
  for (const value of [undefined, null, "removed", "common", {}, ["ending-a"]]) assert.equal(resolveRouteKey(routes, value), null);
  assert.equal(resolveRouteKey(routes, "ending-a"), "ending-a");
});
test("empty branch-only sections are omitted until a route is chosen", () => {
  const only = [{ id: "only", items: [{ id: "a" }] }];
  assert.deepEqual(filterRouteSections(only, routes, null), []);
  assert.equal(filterRouteSections(only, routes, "ending-a")[0].items[0].id, "a");
});
test("import absence preserves metadata; explicit null clears it", () => {
  assert.equal(validateRoutes({ categories: [] }), undefined);
  assert.deepEqual(validateRoutes({ categories: [], routes: null }), []);
  assert.deepEqual(validateRoutes(doc), definitions);
});
test("import rejects dangling references before writes, including inaccessible checkpoints", () => {
  for (const changed of [
    [{ ...definition("ending-a"), item_refs: [ref("missing")] }],
    [{ ...definition("ending-a"), replay_from: ref("missing") }],
    [{ ...definition("ending-a"), replay_from: ref("ending-b") }, definition("ending-b")],
  ]) assert.throws(() => validateRoutes({ ...doc, routes: changed }));
});
test("curated schemas reject duplicate/reserved keys, missing guidance and bad translations", () => {
  for (const changed of [
    [definition("common")], [definition("ending-a"), definition("ending-a")],
    [{ ...definition("ending-a"), details_i18n: { en: "Replay continuously" } }],
    [{ ...definition("ending-a"), item_refs: [ref("ending-a"), ref("ending-a")] }],
  ]) assert.throws(() => validateRoutes({ ...doc, routes: changed }));
});
test("malformed stored definitions and unresolved keys fail rather than exposing another branch", () => {
  assert.throws(() => parseRouteDefinitions([{ key: "bad" }]));
  assert.throws(() => resolveWalkthroughRoutes([{ ...definition("ending-a"), item_refs: [ref("gone")] }], sections));
});
