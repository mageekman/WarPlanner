const test=require('node:test'),assert=require('node:assert/strict');
const {repair,notes,digest,payload}=require('../scripts/repair-army-foundations.cjs');
const before=require('./fixtures/army-foundations-before.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),Q=require('../dist/practice.js');
const changed=repair(before),byKey=new Map(changed.map(r=>[r.key,r])),after=before.map(r=>byKey.get(r.key)||r);
const get=id=>byKey.get('rule:'+id).data;
const army=(faction,names,detachment='')=>({faction,detachment,units:names.map((name,i)=>({id:'u'+i,name,modelCount:1,details:[]}))});
const state=(army,phase,turn='you')=>({army,phase,turn,round:2,firstPlayer:'you'});
const cards=(s,step)=>{const d=A.flashcards(s,step);return [...d.shared,...d.unitCards.flatMap(c=>c.items)];};
test.afterEach(()=>C.reset());
test('ten reviewed corrections preserve identities, original mechanics, scopes and untouched variants',()=>{
 const original=structuredClone(before);repair(before);assert.deepEqual(before,original);assert.equal(changed.length,10);
 for(const r of changed){const old=before.find(x=>x.key===r.key);C.validate(r);assert.equal(M.summaryState(r.data),'available');
  for(const k of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(r[k],old[k]);
  for(const k of ['id','units','memberships','detachment','enhancement','bearerKeywords','bearerRestrictions','importSource','guide'])assert.deepEqual(r.data[k],old.data[k]);
  assert.equal(r.data.summaryAudit.sourceHash,digest(old.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));assert.equal(r.data.summaryAudit.previousSummaryHash,digest(old.data.summary));assert.deepEqual(r.data.summaryAudit.previousAudit,old.data.summaryAudit);
  assert.equal(r.data.referenceOnly,false);assert.ok(!r.data.conditions.some(c=>/^Needs source review:|^Source marked pre-launch/.test(c)));
 }
 for(const r of before.filter(r=>!byKey.has(r.key)))assert.deepEqual(after.find(x=>x.key===r.key),r);
 const p=payload(changed);assert.equal(p.length,10);assert.ok(p.every(r=>r.expectedRevision>0&&!Object.hasOwn(r,'revision')));
});
test('stale edits, changed mechanics, revisions and missing rules block the repair',()=>{
 for(const mutate of [r=>r.data.summary+=' saved edit',r=>r.revision++,r=>r.data.importSource.record.effect={type:'changed-effect'}]){
  const b=structuredClone(before);mutate(b.find(r=>r.key===notes[0].key));assert.throws(()=>repair(b),/Entry changed/);
 }
 assert.throws(()=>repair(before.filter(r=>r.key!==notes[0].key)),/Missing reviewed rule/);
});
test('Pain tokens keep the saved generation triggers and use individual Pain costs and attached-unit scope',()=>{
 const r=get('power-from-pain-drukhari');assert.equal(before.find(r=>r.key==='rule:power-from-pain-drukhari').revision,3);
 assert.match(r.summary,/start of your Command.*enemy unit is destroyed.*enemy unit fails a Battle-shock/s);
 assert.match(r.summary,/stated cost.*stated timing.*phase ends.*Leader and Bodyguard.*without paying separately/s);
 assert.deepEqual(r.timings,[{phase:[0],turn:'you',window:'start'},{phase:[0,1,2,3,4],turn:'either',window:'react'}]);
});
test('Knight Oaths use simultaneous bonuses, correct thresholds, CP reward and Bondsman recipients',()=>{
 const code=get('code-chivalric-imperial-knights'),b=get('bondsman-imperial-knights');
 assert.match(code.summary,/one Hit AND one Wound.*\+2″ Move AND \+1 Advance\/Charge.*\+2 OC AND improve Leadership/s);
 assert.match(code.summary,/exceed the round number.*later returned.*2CP.*3CP.*either part was random/s);
 assert.match(code.summary,/1–2 \/ 3–4 \/ 5–6/);assert.match(b.summary,/ARMIGER.*12″.*not already affected.*next Command.*does not also receive/s);
 assert.match(get('valours-reward-imperial-knights').summary,/Whenever you fulfil an Oath.*clear.*not an Oath of Moment/s);
});
test('T’au selects Observers at phase start and uses BS and conditional cover without shooter pairing',()=>{
 const r=get('for-the-greater-good-tau-empire');assert.match(r.summary,/start of your Shooting.*eligible to shoot.*not been selected.*visible.*only once per phase/s);
 assert.match(r.summary,/Non-Observer.*Ballistic Skill by 1.*Ignores Cover only.*MARKERLIGHT/s);assert.match(r.summary,/not a one-Observer\/one-shooter pairing/);
 assert.match(get('puretides-teachings-tau-empire').summary,/Once per battle round.*Farsight’s unit.*1CP.*does not require.*Necron/s);
});
test('Acts generates in both turns and replaces one die with a stored value, retaining re-roll consumption',()=>{
 const r=get('acts-of-faith-adepta-sororitas');assert.match(r.summary,/one Act per phase.*each player’s turn.*friendly ADEPTA SORORITAS unit is destroyed/s);
 assert.match(r.summary,/Advance, Battle-shock, Charge, Damage, Hit, Save and Wound/);assert.match(r.summary,/replace only one die.*not an automatic 6.*spent die stays lost/s);
 assert.ok(r.conditions.some(c=>c.includes('does not add Hazardous, Desperate Escape')));
});
test('Grey Knights teleports have ordinary all-model eligibility, optional first-turn ingress and one-slot modifiers',()=>{
 const gate=get('gate-of-infinity-grey-knights');assert.match(gate.summary,/every model.*Strategic Reserves.*may make an ingress move.*first turn/s);
 assert.match(gate.targetText,/ordinary Gate of Infinity.*outside enemy Engagement Range.*2\/3\/4/s);
 assert.match(get('prescient-redeployment-grey-knights').summary,/round 2.*fewer than your maximum.*one extra pickup, not one per unused slot/s);
 assert.match(get('tome-of-forbidden-ways-brotherhood-strike-grey-knights').summary,/battlefield or in Strategic Reserves.*3\/4\/5.*not unit eligibility/s);
});
test('actual Guide places corrected cards at start, turn boundaries and arrivals without wrong-turn activations',()=>{
 C.apply(after);
 const pain=get('power-from-pain-drukhari').id,tau=get('for-the-greater-good-tau-empire').id,gate=get('gate-of-infinity-grey-knights').id;
 const d=army('Drukhari',['Kabalite Warriors']),t=army('T’au Empire',['Strike Team']),g=army('Grey Knights',['Strike Squad']);
 assert.ok(cards(state(d,0),{id:'command-start',window:'start'}).some(c=>c.id===pain));
 assert.ok(!cards(state(d,0,'opponent'),{id:'command-start',window:'start'}).some(c=>c.id===pain));
 assert.ok(cards(state(t,2),{id:'shooting-start',window:'start'}).some(c=>c.id===tau));
 assert.ok(!cards(state(t,2,'opponent'),{id:'shooting-start',window:'start'}).some(c=>c.id===tau));
 assert.ok(cards(state(g,4,'opponent'),{id:'fight-end',window:'end'}).some(c=>c.id===gate));
 assert.ok(cards(state(g,1),{id:'movement-arrivals',window:'arrivals'}).some(c=>c.id===gate));
 assert.ok(!cards(state(g,4),{id:'fight-end',window:'end'}).some(c=>c.id===gate));
 const knights=army('Imperial Knights',['Knight Paladin']);
 for(const phase of [1,2,4])assert.ok(cards(state(knights,phase),{id:'phase-act',window:'act'}).some(c=>c.id==='code-chivalric-imperial-knights'));
 const acts=get('acts-of-faith-adepta-sororitas'),s=army('Adepta Sororitas',['Battle Sisters Squad']);
 for(const turn of ['you','opponent'])assert.ok(cards(state(s,0,turn),{id:'turn-start',window:'turn-start'}).some(c=>c.id===acts.id));
});
test('only reviewed ordinary variants enter practice; missing Combat Patrol versions remain excluded',()=>{
 const full=[...require('../scripts/audit-sororitas.cjs').audit(require('./fixtures/sororitas-audit-before.json')).changes,...require('../scripts/audit-tau.cjs').audit(require('./fixtures/tau-audit-before.json')).changes];
 C.apply(full.map(r=>byKey.get(r.key)||r));
 const excluded=new Set(['acts-of-faith-sanctuary-guardians-adepta-sororitas','for-the-greater-good-sudden-dawn-cadre-tau-empire']);
 for(const faction of ['Adepta Sororitas','T’au Empire']){const bank=Q.buildBank({faction,rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);for(const q of bank.questions){assert.ok(!excluded.has(q.review?.rule?.id));for(const choice of q.options)assert.ok(!excluded.has(choice.id));}}
});
