import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = fileURLToPath(new URL("../", import.meta.url));
const tick = () => new Promise(setImmediate);
const components = new Proxy({}, { get: (_, key) => key });

// Execute the real page functions, replacing only I/O and leaf components.
function loader(db) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (name) => {
      if (name === "@/lib/supabase/server") return { createClient: async () => db.client };
      if (name === "@/i18n/get-locale") return { getLocale: async () => "pt" };
      if (name === "next/navigation") return { notFound() { throw new Error("NOT_FOUND"); } };
      if (name === "next/link" || name === "next/image") return { __esModule: true, default: name };
      if (name === "./actions") return new Proxy({}, { get: () => async () => {} });
      if (name.startsWith("@/components/") || name === "lucide-react") return components;
      if (name.startsWith("@/") || name.startsWith(".")) {
        const base = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(file), name);
        const resolved = [base, base + ".ts", base + ".tsx"].find((candidate) => existsSync(candidate));
        if (!resolved) throw new Error("Unresolved import: " + name);
        return load(resolved);
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return (file) => load(path.join(root, file));
}

const fixture = () => ({
  auth: { claims: { sub: "player-1" } },
  games: { id: "game-1", slug: "sample", title: "Sample", title_i18n: {}, platform: "PS5", created_by: "player-1", guides: [], walkthrough_routes: [] },
  checklist_categories: [{ id: "chapter-1", key: "opening", kind: "story", title: "Opening", title_i18n: {}, game_id: "game-1" }],
  checklist_items: [{ id: "task-1", key: "first", category_id: "chapter-1", title: "First", title_i18n: {}, description: null, details: null, details_i18n: {}, image_url: null }],
  user_game_progress: { selected_route_key: null },
  user_item_progress: [{ item_id: "task-1", completed: true, completed_at: "2026-11-10T15:00:00Z" }],
  trophies: [{ id: "trophy-1", title: "Win", title_i18n: {}, description: null, tier: "bronze" }],
  user_trophy_progress: [{ trophy_id: "trophy-1", completed: true }],
});

function database(rows, controlled = false) {
  const started = new Set();
  const queries = [];
  const releases = new Map();
  function request(name) {
    started.add(name);
    if (!controlled) return Promise.resolve({ data: rows[name] ?? null, error: null });
    return new Promise((resolve) => releases.set(name, () => resolve({ data: rows[name] ?? null, error: null })));
  }
  return {
    started, queries,
    release(name) { assert.ok(releases.has(name), `${name} has started`); releases.get(name)(); },
    client: {
      auth: { getClaims: () => request("auth") },
      from(table) {
        const filters = [];
        queries.push({ table, filters });
        let response;
        const query = {
          select() { return query; },
          eq(...args) { filters.push(["eq", ...args]); return query; },
          in(...args) { filters.push(["in", ...args]); return query; },
          order() { return query; },
          maybeSingle() { return query; },
          then(resolve, reject) { response ??= request(table); return response.then(resolve, reject); },
        };
        return query;
      },
    },
  };
}

function find(node, type) {
  if (!node || typeof node !== "object") return undefined;
  if (node.type === type) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const result = find(child, type);
    if (result) return result;
  }
}

test("game requests overlap while dependent IDs and personalized progress are preserved", async () => {
  const db = database(fixture(), true);
  const Page = loader(db)("src/app/games/[slug]/page.tsx").default;
  const pending = Page({ params: Promise.resolve({ slug: "sample" }), searchParams: Promise.resolve({}) });
  await tick();
  assert.deepEqual([...db.started].sort(), ["auth", "games"]);
  db.release("auth"); db.release("games"); await tick();
  for (const table of ["checklist_categories", "user_game_progress", "trophies"]) assert.ok(db.started.has(table));
  assert.ok(!db.started.has("checklist_items"));
  for (const table of ["checklist_categories", "user_game_progress", "trophies"]) db.release(table);
  await tick();
  assert.ok(db.started.has("checklist_items")); assert.ok(db.started.has("user_trophy_progress"));
  assert.ok(!db.started.has("user_item_progress"));
  db.release("checklist_items"); db.release("user_trophy_progress"); await tick();
  db.release("user_item_progress");
  const tree = await pending;
  const walkthrough = find(tree, "Walkthrough");
  assert.equal(walkthrough.props.sections[0].items[0].completed, true);
  assert.equal(find(tree, "TrophyList").props.trophies[0].completed, true);
  for (const table of ["user_game_progress", "user_item_progress", "user_trophy_progress"]) {
    assert.ok(db.queries.find((q) => q.table === table).filters.some((f) => f[0] === "eq" && f[1] === "user_id" && f[2] === "player-1"));
  }
  assert.deepEqual(db.queries.find((q) => q.table === "checklist_items").filters, [["in", "category_id", ["chapter-1"]]]);
});

test("missing games stop before dependent requests", async () => {
  const rows = fixture(); rows.games = null;
  const db = database(rows);
  await assert.rejects(loader(db)("src/app/games/[slug]/page.tsx").default({ params: Promise.resolve({ slug: "missing" }), searchParams: Promise.resolve({}) }), /NOT_FOUND/);
  assert.deepEqual([...db.started].sort(), ["auth", "games"]);
});

test("empty games skip item and trophy progress queries", async () => {
  const rows = fixture(); rows.checklist_categories = []; rows.trophies = [];
  const db = database(rows);
  await loader(db)("src/app/games/[slug]/page.tsx").default({ params: Promise.resolve({ slug: "sample" }), searchParams: Promise.resolve({}) });
  for (const table of ["checklist_items", "user_item_progress", "user_trophy_progress"]) assert.ok(!db.started.has(table));
});

test("dashboard overlaps game/category requests and keeps the completed percentage", async () => {
  const rows = fixture(); rows.games = [rows.games]; rows.user_game_progress = [{ game_id: "game-1", selected_route_key: null }];
  const db = database(rows, true);
  const pending = loader(db)("src/app/dashboard/page.tsx").default();
  await tick(); db.release("auth"); await tick(); db.release("user_game_progress"); await tick();
  assert.ok(db.started.has("games")); assert.ok(db.started.has("checklist_categories"));
  db.release("games"); db.release("checklist_categories"); await tick();
  db.release("checklist_items"); await tick(); db.release("user_item_progress");
  const card = find(await pending, "GameCard");
  assert.equal(card.props.percent, 100);
  assert.equal(card.props.loadingLabel, "Aguarde…");
});

test("an empty library avoids catalog/progress fan-out", async () => {
  const rows = fixture(); rows.user_game_progress = [];
  const db = database(rows);
  await loader(db)("src/app/dashboard/page.tsx").default();
  assert.deepEqual([...db.started].sort(), ["auth", "user_game_progress"]);
});
