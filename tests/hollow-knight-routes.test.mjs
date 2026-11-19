import assert from'node:assert/strict';
import {readFileSync}from'node:fs';
import {test}from'node:test';
import{validateRoutes}from'../scripts/games/routes.mjs';
import{validateGuides}from'../scripts/games/guides.mjs';
import{filterRouteSections,parseRouteDefinitions,resolveWalkthroughRoutes}from'../src/lib/walkthrough-routes.ts';
import{findNextStep}from'../src/lib/walkthrough.ts';
const d=JSON.parse(readFileSync(new URL('../content/games/hollow-knight.json',import.meta.url),'utf8'));
const sections=d.categories.map(c=>({...c,id:c.key,items:c.items.map(i=>({...i,id:`${c.key}/${i.key}`,completed:false}))}));
const routes=resolveWalkthroughRoutes(parseRouteDefinitions(validateRoutes(d)),sections);
const visible=k=>filterRouteSections(sections,routes,k);
const keys=rows=>rows.flatMap(c=>c.items.map(i=>i.key));
const endingKeys=['ending-hollow-knight','ending-sealed-siblings','ending-dream-no-more','ending-embrace-void','ending-delicate-flower'];
test('five endings times two troupe outcomes and fifteen independent articles validate',()=>{
 assert.equal(routes.length,10);assert.equal(validateGuides(d).length,15);
 assert.equal(d.trophies.length,35);
 assert.deepEqual(d.trophies.reduce((a,t)=>(a[t.tier]=(a[t.tier]??0)+1,a),{}),{platinum:1,bronze:18,gold:5,silver:11});
});
for(const route of routes)test(`${route.key} has one ending and one compatible troupe outcome`,()=>{
 const[,e,,t]=route.key.split('-');const rows=visible(route.key);const names=keys(rows);
 assert.deepEqual(names.filter(k=>endingKeys.includes(k)),[endingKeys['abcde'.indexOf(e)]]);
 assert.equal(names.includes('obtain-void-heart'),e!=='a');
 assert.equal(names.includes('visit-birthplace'),e!=='a');
 assert.equal(names.includes('offer-flower-godseeker'),e==='e');
 assert.equal(names.includes('unlock-pantheon-hallownest'),'de'.includes(e));
 assert.equal(names.includes('grimm-ritual'),t==='a');assert.equal(names.includes('grimm-banish'),t==='b');
 for(const k of ['complete-pantheon-master','complete-pantheon-artist','complete-pantheon-sage','complete-pantheon-knight'])assert.ok(names.includes(k),'112% remains feasible without fifth Pantheon');
 assert.ok(names.includes('rescue-zote-before-mantis-claw'));assert.ok(names.includes('rescue-bretta'));
 assert.ok(rows.some(c=>c.id===route.replayFrom.chapterId&&c.items.some(i=>i.id===route.replayFrom.itemId)));
 assert.equal(findNextStep(rows,new Set(rows.flatMap(c=>c.items.map(i=>i.id))),null),null);
});
test('common-only view excludes every ending, irreversible upgrade and troupe resolution',()=>{
 const names=keys(visible(null));
 for(const k of [...endingKeys,'obtain-void-heart','visit-birthplace','offer-flower-godseeker','grimm-ritual','grimm-banish'])assert.ok(!names.includes(k),k);
 assert.ok(names.includes('plan-exploration-and-ending-order'));
});
test('hidden bilingual guidance preserves order, same-save continuation and separate histories',()=>{
 for(const r of d.routes){assert.match(r.title,/^Ending [A-E] \/ Troupe [A-B]$/);assert.match(r.details,/not independent playthrough saves/);assert.match(r.details,/A before Void Heart/);assert.match(r.details,/D before Godseeker's flower/);assert.ok(r.details_i18n.pt);}
 const guide=d.guides.find(g=>g.key==='kingsoul-without-permanent-change');assert.match(guide.body,/Stop before the Birthplace/);
 const flower=d.categories.find(c=>c.key==='advanced-ending-preparation').items.find(i=>i.key==='offer-flower-godseeker');assert.match(flower.details,/finish the first four Pantheons/);
});
