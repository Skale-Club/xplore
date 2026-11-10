import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {validateRoutes} from '../scripts/games/routes.mjs';
import {validateGuides} from '../scripts/games/guides.mjs';
import {filterRouteSections,parseRouteDefinitions,resolveWalkthroughRoutes} from '../src/lib/walkthrough-routes.ts';
import {findNextStep} from '../src/lib/walkthrough.ts';

const doc=JSON.parse(readFileSync(new URL('../content/games/fallout-4.json',import.meta.url),'utf8'));
const sections=doc.categories.map(c=>({...c,id:c.key,items:c.items.map(i=>({...i,id:`${c.key}/${i.key}`,completed:false}))}));
const routes=resolveWalkthroughRoutes(parseRouteDefinitions(validateRoutes(doc)),sections);
const view=key=>filterRouteSections(sections,routes,key);
const keys=rows=>rows.flatMap(c=>c.items.map(i=>i.key));
const endings=['nuclear-option-minutemen','nuclear-option-brotherhood','nuclear-option-railroad','nuclear-family'];

test('sixteen selected combinations, fifteen independent guides and native trophy totals',()=>{
 assert.equal(routes.length,16);assert.equal(validateGuides(doc).length,15);
 assert.equal(doc.trophies.length,85);
 assert.deepEqual(doc.trophies.reduce((a,t)=>(a[t.tier]=(a[t.tier]??0)+1,a),{}),{platinum:1,bronze:66,silver:17,gold:1});
 assert.equal(new Set(routes.map(r=>r.key)).size,16);
});
for(const route of routes)test(`${route.key}: compatible faction and DLC requirements can finish`,()=>{
 const [,b,,h,,n]=route.key.split('-');const rows=view(route.key);const names=keys(rows);
 assert.deepEqual(names.filter(k=>endings.includes(k)),[endings['abcd'.indexOf(b)]]);
 assert.equal(names.includes('tactical-thinking'),b==='b');
 assert.equal(names.includes('spoils-of-war'),b==='b');
 assert.equal(names.includes('underground-undercover'),b==='c');
 for(const k of ['synth-retention','the-battle-of-bunker-hill','mankind-redefined','mass-fusion','pinned','powering-up'])assert.equal(names.includes(k),'cd'.includes(b),k);
 assert.equal(names.includes('end-of-the-line'),b==='d');
 assert.equal(names.includes('airship-down'),b==='d');
 assert.equal(names.includes('reformation'),h==='a');
 assert.equal(names.includes('island-b-resolution'),h==='b');
 assert.ok(names.includes('cleansing-the-land'));
 assert.ok(names.indexOf(h==='a'?'reformation':'island-b-resolution')<names.indexOf('close-to-home'));
 for(const k of ['star-control','high-noon-at-the-gulch','a-world-of-refreshment','a-magical-kingdom','safari-adventure','the-grand-tour','home-sweet-home','power-play','amoral-combat','raider-jobs-twelve','raider-camps-eight'])assert.equal(names.includes(k),n==='a',k);
 for(const k of ['open-season','restore-park-power-after-open-season'])assert.equal(names.includes(k),n==='b',k);
 assert.ok(rows.some(c=>c.id===route.replayFrom.chapterId&&c.items.some(i=>i.id===route.replayFrom.itemId)));
 assert.equal(findNextStep(rows,new Set(rows.flatMap(c=>c.items.map(i=>i.id))),null),null);
});
test('common-only mode never claims a faction or DLC resolution',()=>{
 const names=keys(view(null));assert.ok(names.includes('prepare-character-and-saves'));
 for(const k of [...endings,'reformation','island-b-resolution','open-season','power-play'])assert.ok(!names.includes(k),k);
 assert.ok(names.includes('restoring-order'));
});
test('neutral bilingual labels retain explicit save and compatibility instructions behind Details',()=>{
 for(const r of doc.routes){
  assert.match(r.title,/^Base [A-D] \/ Island [A-B] \/ Park [A-B]$/);
  assert.match(r.details,/Survival does not offer ordinary manual branch saves/);
  assert.match(r.details,/BASE ending BEFORE Nuka-World/);
  assert.match(r.details,/not independent playthrough saves/);
  assert.ok(r.details_i18n.pt.includes('salvamento'));
 }
 const marrow=sections.find(c=>c.key==='far-harbor-extras').items.find(i=>i.key==='hull-breach');
 assert.match(marrow.details,/leave him alive/);
});
