const test=require('node:test'),assert=require('node:assert/strict'),C=require('../dist/content.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js');
const reviewed=require('../scripts/audit-core.cjs').audit(require('./fixtures/core-audit-before.json')).changes;
const ids=['firing-deck','feel-no-pain','damaged'];
function rules(shared=false){return reviewed.filter(r=>ids.includes(r.data.sourceRuleId)).map(r=>({...structuredClone(r),data:{...structuredClone(r.data),guideShared:shared,phase:[2],turn:'either',window:'act',timings:[{phase:[2],turn:'either',window:'act'}],referenceOnly:false}}));}
function state(names){return {army:{faction:'Aeldari',detachment:'Aspect Host',units:names.map((name,i)=>({id:'u'+i,name,group:'',details:[]}))},phase:2,turn:'you',round:1};}
function targets(deck,id){return [...new Set([...deck.shared.filter(r=>r.sourceRuleId===id).flatMap(r=>r.appliesTo.flatMap(u=>u.members.map(m=>m.name))),...deck.unitCards.flatMap(c=>c.items.filter(r=>r.sourceRuleId===id).flatMap(r=>r.targetUnits.map(u=>u.name)))])].sort();}
test.afterEach(()=>C.reset());
test('core reminders use actual datasheet abilities, including shared Applies to labels',()=>{
 for(const shared of [false,true]){
  C.apply(rules(shared));const s=state(['Shroud Runners','Falcon','Wave Serpent','Starweaver','Wraithguard']);
  for(const step of [{id:'core-test',window:'act'},A.steps(s).find(x=>x.activationMode)]){
   const deck=A.flashcards(s,step);
   assert.deepEqual(targets(deck,'firing-deck'),['Starweaver']);assert.deepEqual(targets(deck,'damaged'),['Falcon','Wave Serpent']);assert.deepEqual(targets(deck,'feel-no-pain'),[]);
  }
 }
});
test('an attached bearer never grants its model-only core ability to its bodyguard',()=>{
 const unit=structuredClone(C.seed().find(r=>r.kind==='unit'&&r.data.name==='Autarch'));unit.data.abilities.push({id:'feel-no-pain',value:5});
 C.apply([...rules(true),unit]);const s=state(['Autarch','Shroud Runners']);s.army.units[0].role='leader';s.army.units[1].role='bodyguard';for(const u of s.army.units)u.group='joined';
 const deck=A.flashcards(s,{id:'core-test',window:'act'});assert.deepEqual(targets(deck,'feel-no-pain'),['Autarch']);
 const card=deck.shared.find(c=>c.sourceRuleId==='feel-no-pain');assert.deepEqual(card.battlefieldUnits[0].members.map(m=>m.name),['Autarch']);
});
test('unknown units do not acquire core abilities from their names or Vehicle keywords',()=>{
 C.apply(rules(true));const deck=A.flashcards(state(['Unmatched Transport','Unmatched Vehicle','Shroud Runners']),{id:'core-test',window:'act'});for(const id of ids)assert.deepEqual(targets(deck,id),[]);
});

test('Fights First is shown on eligible units rather than as a standalone guide rule',()=>{
 for(const guideMode of ['quick','learn'])for(const turn of ['you','opponent']){
  const s={...state(['Howling Banshees','Shroud Runners','Autarch']),phase:4,turn,guideMode,firstPlayer:'you'};
  const session=A.createSession(),decks=[session.anyTime(s),...A.steps(s).map(step=>session.stepDeck(s,step))];
  for(const deck of decks){assert.ok(!deck.shared.some(r=>r.id==='fights-first'||r.sourceRuleId==='fights-first'));for(const card of deck.unitCards){assert.ok(!card.items.some(r=>r.id==='fights-first'||r.sourceRuleId==='fights-first'));if(['Shroud Runners','Autarch'].includes(card.unit.body.name))assert.equal(card.fightsFirst,false);}}
  assert.ok(decks.some(deck=>deck.unitCards.some(card=>card.unit.body.name==='Howling Banshees'&&card.fightsFirst)));
 }
});
test('canonical and imported Fights First cards are hidden without deleting their source records',()=>{
 const s=state(['Howling Banshees']);for(const rule of [{id:'fights-first',category:'core'},{id:'imported-first',sourceRuleId:'fights-first',category:'core'},{id:'core-fights-first',category:'core'},{id:'core-imported-123',name:'Fights First',category:'core'}])assert.equal(L.guideRule(rule,s),null);
 assert.ok(L.abilities.some(r=>r.id==='fights-first'));
});
