import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateRoutes } from '../scripts/games/routes.mjs';
import { validateGuides } from '../scripts/games/guides.mjs';
import { filterRouteSections, parseRouteDefinitions, resolveWalkthroughRoutes } from '../src/lib/walkthrough-routes.ts';
import { findNextStep } from '../src/lib/walkthrough.ts';

const doc=JSON.parse(readFileSync(new URL('../content/games/detroit-become-human.json',import.meta.url),'utf8'));
const sections=doc.categories.map(c=>({...c,id:c.key,items:c.items.map(i=>({...i,id:`${c.key}/${i.key}`,completed:false}))}));
const routes=resolveWalkthroughRoutes(parseRouteDefinitions(validateRoutes(doc)),sections);
const keys=rows=>rows.flatMap(c=>c.items.map(i=>i.key));
const visible=key=>filterRouteSections(sections,routes,key);
const absentG=['fugitives','on-the-run','zlatko','the-pirates-cove','midnight-train','crossroads','night-of-the-soul','battle-for-detroit'];

test('seven scoped profiles and eight bilingual reference guides validate',()=>{
  assert.deepEqual(routes.map(r=>r.key),[...'abcdefg'].map(k=>`profile-${k}`));
  assert.equal(validateGuides(doc).length,8);
  assert.equal(sections.filter(c=>!c.kind||c.kind==='story').length,32);
});

for(const route of routes)test(`${route.key}: independent completion and only its recorded outcome`,()=>{
  const eligible=visible(route.key);const names=keys(eligible);
  assert.deepEqual(names.filter(k=>/^profile-[a-g]-outcome$/.test(k)),[`${route.key}-outcome`]);
  assert.ok(eligible.some(c=>c.id===route.replayFrom.chapterId&&c.items.some(i=>i.id===route.replayFrom.itemId)));
  assert.equal(findNextStep(eligible,new Set(eligible.flatMap(c=>c.items.map(i=>i.id))),null),null);
  assert.ok(names.length<keys(sections).length);
  if(route.key!=='profile-g')assert.equal(eligible.filter(c=>!c.kind||c.kind==='story').length,32);
});

test('early-ending profile hides every inaccessible character/chapter section',()=>{
  const eligible=visible('profile-g');const names=keys(eligible);
  for(const key of absentG)assert.ok(!eligible.some(c=>c.key===key),key);
  assert.ok(names.includes('profile-g-early-kara-decision'));
  assert.ok(names.includes('profile-g-march-decision'));
  assert.ok(names.includes('profile-g-end-the-investigation'));
  assert.ok(!names.includes('work-through-evidence-room'));
  assert.ok(!names.includes('find-jericho-from-preserved-evidence'));
  assert.equal(eligible.filter(c=>!c.kind||c.kind==='story').length,24);
});

test('Kara capture, river and border outcomes never become simultaneous requirements',()=>{
  for(const k of 'abcdef'){
    const names=keys(visible(`profile-${k}`));
    assert.equal(names.includes('capture-kara-for-camp-route'),'bc'.includes(k));
    assert.equal(names.includes('follow-camp-liberation'),'bc'.includes(k));
    assert.equal(names.includes('escape-kara-from-jericho'),'adef'.includes(k));
    assert.equal(names.includes('reach-the-bus-and-border'),'aef'.includes(k));
    assert.equal(names.includes('profile-d-river-choice'),k==='d');
    assert.equal(names.includes('profile-a-border-choice'),k==='a');
    assert.equal(names.includes('profile-e-border-choice'),k==='e');
  }
});

test('machine, deviant and control choices remain compatible with the selected strategy',()=>{
  for(const k of 'abcdef'){
    const names=keys(visible(`profile-${k}`));
    assert.equal(names.includes('choose-connor-deviant'),'abcde'.includes(k));
    assert.equal(names.includes('complete-cyberlife-conversion'),'abcde'.includes(k));
    assert.equal(names.includes('profile-f-connor-machine'),k==='f');
    assert.equal(names.includes('profile-f-machine-and-border'),k==='f');
    assert.equal(names.includes('choose-demonstration'),'ade'.includes(k));
    assert.equal(names.includes('choose-revolution'),'bcf'.includes(k));
    assert.equal(names.includes('win-the-revolution'),'bc'.includes(k));
    assert.equal(names.includes('resist-the-final-control-attempt'),'abde'.includes(k));
    assert.equal(names.includes('profile-c-final-control'),k==='c');
  }
});

test('common-only view does not claim an ending or force branch chapters',()=>{
  const common=keys(visible(null));
  assert.ok(common.includes('plan-continuous-saved-replay'));
  assert.equal(common.filter(k=>k.endsWith('-outcome')).length,0);
  assert.ok(!common.includes('complete-crossroads-sequences'));
  assert.ok(!common.includes('respond-to-household-crisis'));
});

test('neutral labels and bilingual replay guidance keep outcomes behind explicit Details',()=>{
  for(const route of doc.routes){
    assert.match(route.title,/^Profile [A-G]$/);
    assert.ok(route.details_i18n.en.includes('SAVE'));
    assert.ok(route.details_i18n.pt.includes('SALVAR'));
    assert.ok(route.details_i18n.en.includes('every subsequent chapter continuously'));
    assert.ok(route.details_i18n.en.includes('not independent playthrough saves'));
  }
  const planning=sections[0].items[0];
  assert.equal(planning.key,'plan-continuous-saved-replay');
  assert.ok(planning.details_i18n.en&&planning.details_i18n.pt);
});
