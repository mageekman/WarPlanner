const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../dist/lessons.js'),A=require('../dist/activations.js'),C=require('../dist/content.js'),source=require('./fixtures/core-review-source.json');
const rows=source.abilities.filter(r=>r.ability_type==='stratagem'||r.ability_id==='deep-strike').map(raw=>{
 const stratagem=source.stratagems.find(s=>s.ability_id===raw.ability_id),id='core-'+raw.ability_id;
 return {key:'rule:'+id,kind:'rule',faction:'*',name:raw.name,enabled:true,revision:1,data:{id,name:raw.name,faction:'*',category:stratagem?'core-stratagem':'core',units:[],phase:[],turn:'either',window:'prebattle',summary:raw.community_notes||'Source reminder',conditions:[],sourceIds:[],sourceRuleId:raw.ability_id,referenceOnly:true,expanded:true,adminManaged:true,importSource:{sourceId:raw.ability_id,record:raw,...(stratagem?{stratagem}:{})}}};
});
const roster=(name='Swooping Hawks',faction='Aeldari')=>({faction,units:[{id:'test',name,modelCount:5,details:[]}]});
const state=(phase=1,turn='you',options={})=>({army:roster(),round:2,firstPlayer:'you',phase,turn,...options});
const cards=(s,window)=>{const d=A.flashcards(s,{id:'test',window});return [...d.shared,...d.unitCards.flatMap(c=>c.items)];};
test.afterEach(()=>C.reset());
test('Core Stratagems are optional and reference timing projection leaves catalog data unchanged',()=>{
 C.apply(rows);const before=structuredClone(L.abilities);
 assert.equal(rows.filter(r=>r.data.category==='core-stratagem').length,10);
 for(let phase=0;phase<5;phase++)for(const turn of ['you','opponent'])assert.ok(!cards(state(phase,turn),'act').some(c=>c.category==='core-stratagem'));
 assert.ok(cards(state(1,'opponent',{guideShowCoreStratagems:true}),'end').some(c=>c.id==='core-rapid-ingress'));
 assert.ok(!cards(state(1,'you',{guideShowCoreStratagems:true}),'end').some(c=>c.id==='core-rapid-ingress'));
 assert.ok(cards(state(0,'you',{guideShowCoreStratagems:true}),'shock').some(c=>c.id==='core-insane-bravery'));
 assert.ok(cards(state(2,'opponent',{guideShowCoreStratagems:true}),'start').some(c=>c.id==='core-smokescreen'));
 assert.deepEqual(L.abilities,before);
});
test('optional Core Stratagems also appear in unit activation pages and hide immediately when disabled',()=>{
 C.apply(rows);const s=state(2,'you',{guideShowCoreStratagems:true}),step=A.steps(s).find(s=>s.activationMode==='shooting');
 assert.ok(A.flashcards(s,step).shared.some(c=>c.id==='core-explosives'));
 assert.ok(!A.flashcards({...s,guideShowCoreStratagems:false},step).shared.some(c=>c.category==='core-stratagem'));
});
test('Deep Strike defaults on, uses the editable core record once and respects every attached model',()=>{
 C.apply(rows);const s=state();assert.deepEqual(cards(s,'arrivals').filter(L.isDeepStrike).map(c=>c.id),['core-deep-strike']);
 assert.ok(!cards({...s,guideShowDeepStrike:false},'arrivals').some(L.isDeepStrike));
 assert.ok(!cards(state(1,'opponent'),'arrivals').some(L.isDeepStrike));
 assert.ok(!cards({...s,army:roster('Dire Avengers')},'arrivals').some(L.isDeepStrike));
 const mixed={faction:'Aeldari',units:[{id:'leader',name:'Autarch',role:'leader',group:'1',details:[]},{id:'body',name:'Swooping Hawks',role:'bodyguard',group:'1',details:[]}]};
 assert.ok(!cards({...s,army:mixed},'arrivals').some(L.isDeepStrike));
});
test('Deep Strike works for other factions, not just the original Aeldari roster',()=>{
 const units=require('./fixtures/grey-knights-audit-before.json').filter(r=>r.kind==='unit');C.apply([...units,...rows]);
 assert.ok(cards({...state(),army:roster('Strike Squad','Grey Knights')},'arrivals').some(L.isDeepStrike));
});
test('fallback Deep Strike works when the shared core import is absent',()=>{
 C.reset();assert.deepEqual(cards(state(),'arrivals').filter(L.isDeepStrike).map(c=>c.id),['deep-strike']);
});
test('authored core timings and saved restrictions are respected when enabling optional reminders',()=>{
 const row=structuredClone(rows.find(r=>r.key==='rule:core-rapid-ingress'));row.data.phase=[1];row.data.turn='opponent';row.data.window='before';row.data.summary='Saved custom wording';row.data.conditions=['Saved restriction'];C.apply([row]);
 const s=state(1,'opponent',{guideShowCoreStratagems:true}),card=cards(s,'before').find(c=>c.id===row.data.id);assert.equal(card.summary,'Saved custom wording');assert.deepEqual(card.conditions,['Saved restriction']);
 assert.ok(!cards(s,'end').some(c=>c.id===row.data.id));
});
test('Guide caches invalidate for either preference while ordinary step revisits remain cached',()=>{
 C.apply(rows);const session=A.createSession(),s=state(1,'opponent'),step={id:'movement-end',window:'end'},first=session.deck(s,step);assert.equal(session.deck(s,step),first);
 const on=session.deck({...s,guideShowCoreStratagems:true},step);assert.notEqual(on,first);assert.ok(on.shared.some(c=>c.id==='core-rapid-ingress'));
 const hidden=session.deck({...s,guideShowCoreStratagems:true,guideShowDeepStrike:false},step);assert.notEqual(hidden,on);
 assert.notEqual(session.coverage(s),session.coverage({...s,guideShowCoreStratagems:true}));
});
test('Draw secondaries is one shared editable reminder at own Command start for every faction',()=>{
 const seed=C.seed().find(r=>r.key==='rule:draw-secondaries');C.validate(seed);assert.equal(seed.faction,'*');assert.match(A.targeting(seed.data,state(0)).text,/You, when using Tactical Secondary Missions/);
 for(const faction of ['Aeldari','Grey Knights','Orks']){const s={...state(0),army:roster('Test unit',faction)},deck=A.flashcards(s,{id:'command-start',window:'start'});
  assert.equal(deck.shared.filter(c=>c.id==='draw-secondaries').length,1);assert.ok(!cards({...s,turn:'opponent'},'start').some(c=>c.id==='draw-secondaries'));assert.ok(!cards({...s,phase:1},'start').some(c=>c.id==='draw-secondaries'));
 }
 const row=structuredClone(seed);row.data.summary='Saved mission-specific reminder';C.apply([row]);assert.equal(cards(state(0),'start').find(c=>c.id==='draw-secondaries').summary,row.data.summary);
});

test('Benefit of Cover and Deadly Demise remain in the catalog but never appear as guide reminders',()=>{
 const core=require('../scripts/audit-core.cjs').audit(require('./fixtures/core-audit-before.json')).changes.filter(r=>['benefit-of-cover','deadly-demise'].includes(r.data.sourceRuleId)).map(r=>({...r,data:{...r.data,phase:[2],turn:'either',window:'act',timings:[{phase:[2],turn:'either',window:'act'}],referenceOnly:false,guideShared:true}}));
 C.apply(core);const s=state(2,'you');s.army=roster('Falcon');
 for(const id of ['benefit-of-cover','deadly-demise']){
  const imported=L.abilities.find(r=>r.sourceRuleId===id);assert.ok(imported);assert.equal(L.guideRule(imported,s),null);
  assert.ok(L.catalog.rules.some(r=>r.id===id));
 }
 const native=L.abilities.find(r=>r.id==='deadly-demise');assert.ok(native);assert.equal(L.guideRule(native,s),null);
 for(const step of A.steps(s)){
  const deck=A.createSession().deck(s,step),all=[...deck.shared,...deck.unitCards.flatMap(c=>c.items)];
  assert.ok(!all.some(c=>['core-benefit-of-cover','core-deadly-demise','deadly-demise'].includes(c.id)));
 }
 assert.ok(L.guideRule(L.abilities.find(r=>r.id==='deep-strike'),s));
});
