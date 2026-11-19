import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
import{validateRoutes}from'../scripts/games/routes.mjs';
import{validateGuides}from'../scripts/games/guides.mjs';
import{filterRouteSections,parseRouteDefinitions,resolveWalkthroughRoutes}from'../src/lib/walkthrough-routes.ts';
import{findNextStep}from'../src/lib/walkthrough.ts';
const d=JSON.parse(readFileSync(new URL('../content/games/hollow-knight-silksong.json',import.meta.url),'utf8'));
const sections=d.categories.map(c=>({...c,id:c.key,items:c.items.map(i=>({...i,id:`${c.key}/${i.key}`,completed:false}))}));
const routes=resolveWalkthroughRoutes(parseRouteDefinitions(validateRoutes(d)),sections);
const visible=k=>filterRouteSections(sections,routes,k);const keys=rows=>rows.flatMap(c=>c.items.map(i=>i.key));
const hearts=['claim-pollen-heart','claim-hunters-heart','claim-encrusted-heart','claim-conjoined-heart'];
const sets={a:hearts.slice(0,3),b:[hearts[0],hearts[1],hearts[3]],c:[hearts[0],hearts[2],hearts[3]],d:hearts.slice(1)};
test('eleven scoped profiles and seventeen separate articles validate with native34 tiers',()=>{
 assert.equal(routes.length,11);assert.equal(validateGuides(d).length,17);assert.equal(d.trophies.length,34);
 assert.deepEqual(d.trophies.reduce((a,t)=>(a[t.tier]=(a[t.tier]??0)+1,a),{}),{platinum:1,bronze:16,silver:12,gold:5});
 assert.ok(d.trophies.some(t=>t.title==='Speedrunner'&&t.tier==='silver'));
 assert.ok(d.trophies.some(t=>t.title==='Speed Completion'&&t.tier==='silver'));
 assert.ok(!d.trophies.some(t=>t.title==='Steel Soul'));
});
for(const route of routes)test(`${route.key}: compatible act/curse/hearts and independent completion`,()=>{
 const[,e,,h]=route.key.split('-');const rows=visible(route.key);const names=keys(rows);const advanced='de'.includes(e);
 assert.equal(names.includes('ending-weaver-queen'),e==='a');assert.equal(names.includes('ending-twisted-child'),e==='b');
 assert.equal(names.includes('ending-snared-silk'),'cde'.includes(e));assert.equal(names.includes('ending-sister-void'),advanced);
 assert.equal(names.includes('accept-twisted-bud'),'bde'.includes(e));assert.equal(names.includes('infestation-operation'),'cde'.includes(e));
 assert.equal(names.includes('resume-after-snared-silk'),advanced);assert.equal(names.includes('obtain-everbloom'),advanced);
 assert.equal(names.includes('complete-passing-of-age'),e==='e');assert.equal(names.includes('ending-herald-epilogue'),e==='e');
 for(const k of ['finish-at-one-hundred-percent','complete-hundred-under-thirty','claim-shaman-crest','fully-upgrade-crafting-kit','fully-upgrade-tool-pouch','complete-fatal-resolve','obtain-sylphsong'])assert.equal(names.includes(k),advanced,k);
 assert.ok(names.includes('complete-under-five-hours'));
 if(advanced){
  assert.deepEqual(names.filter(k=>hearts.includes(k)),sets[h]);
  assert.equal(names.includes('prepare-green-prince-memory'),h!=='a');
  assert.ok(names.indexOf('ending-snared-silk')<names.indexOf('resume-after-snared-silk'));
  assert.ok(names.indexOf('claim-three-old-hearts')<names.indexOf('obtain-everbloom'));
  assert.ok(names.indexOf('infestation-operation')<names.indexOf('ending-snared-silk'));
  if(e==='e'){assert.ok(names.indexOf('complete-passing-of-age')<names.indexOf('return-to-abyss-with-ward'));assert.ok(names.indexOf('ending-sister-void')<names.indexOf('ending-herald-epilogue'));}
 }else assert.equal(names.filter(k=>hearts.includes(k)).length,0);
 assert.ok(rows.some(c=>c.id===route.replayFrom.chapterId&&c.items.some(i=>i.id===route.replayFrom.itemId)));
 assert.equal(findNextStep(rows,new Set(rows.flatMap(c=>c.items.map(i=>i.id))),null),null);
});
test('common-only view cannot imply a main ending, cursed state, cure or late completion',()=>{
 const names=keys(visible(null));for(const k of ['ending-weaver-queen','ending-twisted-child','ending-snared-silk','ending-sister-void','ending-herald-epilogue','accept-twisted-bud','infestation-operation','obtain-everbloom','finish-at-one-hundred-percent'])assert.ok(!names.includes(k),k);
 assert.ok(names.includes('plan-act-transitions-and-ending-order'));
});
test('seventeen one-point wishes form a concrete path without replacing fixed gates',()=>{
 const wishes=d.categories.find(c=>c.key==='selected-wishes');assert.equal(wishes.items.length,17);
 assert.ok(wishes.items.some(i=>i.key==='complete-rite-pollip'));assert.ok(wishes.items.some(i=>i.key==='complete-pinmasters-oil'));
 const names=keys(visible('ending-c'));for(const k of ['complete-flexile-spines','complete-lifesaving-bridge','complete-crawbug-clearing','complete-strengthening-songclave','complete-trails-end','complete-balm-wounded','obtain-faydown-cloak','obtain-bellhome-key','move-caravan-fleatopia','defeat-lace-cradle'])assert.ok(names.includes(k),k);
});
test('neutral labels and bilingual instructions separate ending flags from guide coverage',()=>{
 for(const r of d.routes){assert.match(r.title,/^Ending [A-C]$|^Ending [DE] \/ Hearts [A-D]$/);assert.match(r.details,/not independent playthrough saves/);assert.match(r.details,/timer includes ending cutscenes/);assert.ok(r.details_i18n.pt);}
 const cure=d.categories.find(c=>c.key==='curse-branch').items.find(i=>i.key==='infestation-operation');assert.match(cure.details,/condition is already satisfied/);
});
