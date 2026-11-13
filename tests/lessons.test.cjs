const test=require('node:test');
const assert=require('node:assert/strict');
const L=require('../dist/lessons.js');
const {sample,next}=require('../dist/core.js');
const state=(phase=0,turn='you',army=sample)=>({phase,turn,army,firstPlayer:'you',round:1});
test('core instruction order uses 11th-edition steps',()=>{
 assert.deepEqual(L.getSteps(state()).map(s=>s.id),['round-start','turn-start','command-start','command-cp','command-shock','command-abilities','command-end']);
 assert.deepEqual(L.getSteps(state(4)).map(s=>s.id),['fight-start','fight-pile','fight-resolve','fight-consolidate','fight-end','turn-end']);
 const fight=L.getSteps(state(4)).find(s=>s.id==='fight-resolve');
 assert.match(fight.body,/active player/);assert.match(fight.body,/player who moves the sequence/);
});
test('Eldrad reminders appear at their exact own-turn windows',()=>{
 const s=state();assert.ok(L.forStep(s,L.getSteps(s).find(s=>s.id==='command-start')).some(a=>a.id==='eldrad-cp'));
 const opponent=state(0,'opponent');assert.ok(!L.forStep(opponent,L.getSteps(opponent).find(s=>s.id==='command-start')).some(a=>a.id==='eldrad-cp'));
 const movement=state(1);assert.ok(L.forStep(movement,L.getSteps(movement).find(s=>s.id==='movement-end')).some(a=>a.id==='doom'));
 assert.ok(!L.forStep(movement,L.getSteps(movement).find(s=>s.id==='movement-start')).some(a=>a.id==='doom'));
});
test('roster, detachment and equipment gate unit-specific guidance',()=>{
 const marines={...sample,faction:'Space Marines'};
 assert.equal(L.forStep(state(2,'you',marines),L.phases[2].steps[2]).length,0);
 const warhost={...sample,detachment:'Warhost'};
 assert.equal(L.matches(L.abilities.find(a=>a.id==='path-warrior'),warhost),false);
 const unequipped={...sample,units:sample.units.map(u=>({...u,details:[]}))};
 assert.equal(L.matches(L.abilities.find(a=>a.id==='murder'),unequipped),false);
 assert.equal(L.matches(L.abilities.find(a=>a.id==='murder'),sample),true);
 const noEldrad={...sample,units:sample.units.filter(u=>u.name!=='Eldrad Ulthran')};
 assert.equal(L.matches(L.abilities.find(a=>a.id==='doom'),noEldrad),false);
});
test('all reminders have provenance and are reachable in a matching window',()=>{
 assert.equal(new Set(L.abilities.map(a=>a.id)).size,L.abilities.length);
 for(const a of L.abilities){
  for(const id of a.sourceIds)assert.ok(L.sources[id]);
  assert.ok(a.conditions.length);assert.ok(['official-checked','community-checked','source-reference'].includes(a.status));
  if(a.expanded)continue; // Expanded rules are scoped to other rosters; tested separately.
  let found=false;for(let p=0;p<5;p++)for(const turn of ['you','opponent']){const s=state(p,turn);for(const step of L.getSteps(s))if(L.forStep(s,step).some(x=>x.id===a.id))found=true;}
  assert.ok(found,'Unreachable reminder: '+a.id);
 }
});
test('corrected token scope and use limit are explicit',()=>{
 const token=L.abilities.find(a=>a.id==='token');assert.match(token.summary,/non-Character/);assert.match(token.summary,/Each token.*once per battle/);
 assert.equal(token.status,'official-checked');assert.deepEqual(token.sourceIds,['pack']);
});
test('rule categories distinguish provenance-independent content types',()=>{
 const expected={walker:'ability','path-warrior':'army','deep-strike':'core',khaines:'stratagem',murder:'enhancement'};
 for(const [id,category] of Object.entries(expected))assert.equal(L.abilities.find(a=>a.id===id).category,category);
 for(const ability of L.abilities)assert.ok(L.categories[ability.category]);
 for(const turn of ['you','opponent'])for(let p=0;p<5;p++)for(const step of L.getSteps(state(p,turn)))assert.equal(step.category,'core');
});
test('setup shooters are prioritized before selection without changing their resolution trigger',()=>{
 const s=state(2);for(const id of ['shooting-start','shooting-select']){
  const reminders=L.forStep(s,L.getSteps(s).find(x=>x.id===id));
  assert.deepEqual(reminders.slice(0,2).map(a=>a.id),['walker','falcon']);
  assert.ok(reminders[0].sequencePreview);assert.equal(reminders[0].window,'after');
  assert.match(reminders[0].sequence.advice,/same target/);
  assert.match(reminders[1].sequence.advice,/disembarked from this Falcon this turn/);
 }
 const actual=L.forStep(s,L.getSteps(s).find(x=>x.id==='shooting-after'));
 assert.ok(actual.some(a=>a.id==='walker'&&!a.sequencePreview));
 assert.equal(L.abilities.find(a=>a.id==='walker').window,'after');
 const noSetup={...sample,units:sample.units.filter(u=>!['War Walkers','Falcon'].includes(u.name))};
 assert.ok(!L.forStep(state(2,'you',noSetup),L.phases[2].steps[0]).some(a=>a.sequencePreview));
 assert.ok(!L.forStep(state(2,'opponent'),L.phases[2].steps[0]).some(a=>a.sequencePreview));
});
test('Battle Focus allocation is a round start, including opponent-first games',()=>{
 assert.equal(L.getSteps(state(0,'opponent')).some(s=>s.id==='round-start'),false);
 const first={...state(0,'opponent'),firstPlayer:'opponent'};
 assert.equal(L.getSteps(first)[0].id,'round-start');
 assert.deepEqual(next({...first,phase:4}),{...first,phase:0,turn:'you'});
 assert.equal(next({...first,phase:4,turn:'you'}).round,2);
});
