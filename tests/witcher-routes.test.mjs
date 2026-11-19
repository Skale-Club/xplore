import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateRoutes } from '../scripts/games/routes.mjs';
import { filterRouteSections, parseRouteDefinitions, resolveWalkthroughRoutes } from '../src/lib/walkthrough-routes.ts';
import { findNextStep } from '../src/lib/walkthrough.ts';

const doc = JSON.parse(readFileSync(new URL('../content/games/the-witcher-3-wild-hunt-remastered.json', import.meta.url), 'utf8'));
const sections = doc.categories.map(c => ({ ...c, id: c.key,
  items: c.items.map(i => ({ ...i, id: `${c.key}/${i.key}`, completed: false })) }));
const routes = resolveWalkthroughRoutes(parseRouteDefinitions(validateRoutes(doc)), sections);
const conditional = ['beyond-hill-and-dale', 'blood-simple', 'what-lies-unseen', 'pomp-and-strange-circumstance', 'burlap-is-the-new-stripe'];
const keys = list => list.flatMap(c => c.items.map(i => i.key));

test('all eighteen simultaneous campaign/expansion combinations are defined', () => {
  const expected = [];
  for (const main of 'abc') for (const hos of 'ab') for (const baw of 'abc') expected.push(`main-${main}-hos-${hos}-baw-${baw}`);
  assert.deepEqual(routes.map(r => r.key), expected);
});

for (const route of routes) test(`${route.key}: only compatible outcomes and quest branches count`, () => {
  const [, main, , hos, , baw] = route.key.split('-');
  const visible = filterRouteSections(sections, routes, route.key);
  const eligible = keys(visible);
  for (const [prefix, letter, choices] of [['main', main, 'abc'], ['hos', hos, 'ab'], ['baw', baw, 'abc']]) {
    for (const choice of choices) assert.equal(eligible.includes(`${prefix}-${choice}-ending-recorded`), choice === letter);
    assert.ok(eligible.some(k => k.startsWith(`${prefix}-${letter}-`) && !k.endsWith('ending-recorded')));
  }
  const expectedBranches = {
    a: ['beyond-hill-and-dale', 'pomp-and-strange-circumstance'],
    b: ['blood-simple', 'what-lies-unseen', 'pomp-and-strange-circumstance'],
    c: ['beyond-hill-and-dale', 'burlap-is-the-new-stripe'],
  }[baw];
  assert.deepEqual(eligible.filter(k => conditional.includes(k)).sort(), expectedBranches.sort());
  for (const shared of ['the-night-of-long-fangs', 'tesham-mutna', 'be-it-ever-so-humble', 'preserve-early-route-saves']) assert.ok(eligible.includes(shared));
  assert.ok(visible.some(c => c.id === route.replayFrom.chapterId && c.items.some(i => i.id === route.replayFrom.itemId)));
  const completed = new Set(visible.flatMap(c => c.items.map(i => i.id)));
  assert.equal(findNextStep(visible, completed, null), null);
  assert.ok(completed.size < sections.flatMap(c => c.items).length);
});

test('common-only view excludes endings and all five conditional expansion quests', () => {
  const common = keys(filterRouteSections(sections, routes, null));
  assert.equal(common.filter(k => k.endsWith('ending-recorded')).length, 0);
  assert.equal(common.filter(k => conditional.includes(k)).length, 0);
  assert.ok(common.includes('preserve-early-route-saves'));
});

test('decision instructions appear before committing their quests', () => {
  const ordered = keys(sections);
  for (const letter of 'abc') {
    for (const [goal, quest] of [['battlefield-choices', 'blood-on-the-battlefield'], ['lodge-choice', 'final-preparations'], ['late-choices', 'child-of-the-elder-blood']]) {
      assert.ok(ordered.indexOf(`main-${letter}-${goal}`) < ordered.indexOf(quest));
    }
  }
  assert.ok(ordered.indexOf('main-b-political-preparation') < ordered.indexOf('pyres-of-novigrad'));
  assert.ok(ordered.indexOf('main-b-political-resolution') < ordered.indexOf('blindingly-obvious'));
});

test('spoiler outcomes remain in optional bilingual Details, with neutral route labels', () => {
  for (const route of doc.routes) {
    assert.match(route.title, /^Main [ABC] \/ HoS [AB] \/ BaW [ABC]$/);
    assert.ok(route.details_i18n.en && route.details_i18n.pt);
    for (const ref of route.item_refs) {
      const item = doc.categories.find(c => c.key === ref.category_key).items.find(i => i.key === ref.item_key);
      if (/^(main|hos|baw)-[abc]-/.test(item.key)) {
        assert.ok(item.details_i18n.en && item.details_i18n.pt);
        assert.doesNotMatch(item.description, /dies|dead|soul|empress|reconcile/i);
      }
    }
  }
});
