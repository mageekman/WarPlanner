const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js'),Q=require('../dist/practice.js'),S=require('../dist/study-cards.js'),R=require('../dist/rule-reports.js'),I=require('../dist/rules-import.js');
const original=require('./fixtures/armour-timings-before.json');
const timings=[{phase:[2],turn:'opponent',window:'select'},{phase:[4],turn:'either',window:'select'}];
const armour=()=>({...structuredClone(original),data:{...structuredClone(original.data),timings:structuredClone(timings),timingOverride:true}});
const state=(phase,turn='you',membership=original.data.memberships[0])=>({phase,turn,round:1,firstPlayer:'you',army:{faction:membership.faction,detachment:membership.detachments[0],units:[{id:'squad',name:'Test squad',models:5,details:[]}]}});
const cards=(s,step)=>{const deck=A.flashcards(s,step);return [...deck.shared,...deck.unitCards.flatMap(c=>c.items)];};
const visible=s=>A.steps(s).some(step=>cards(s,step).some(c=>c.id===original.data.id));
const slots=m=>m.phases.flatMap(p=>p.lanes.flatMap(l=>l.steps.flatMap(s=>[s,...s.slots].map(slot=>({...slot,phase:p.phase,turn:l.turn})))));
const fd=data=>({get:k=>Array.isArray(data[k])?data[k][0]:data[k]??null,getAll:k=>Array.isArray(data[k])?data[k]:data[k]===undefined?[]:[data[k]],has:k=>k in data});
const form=rows=>Object.assign({'rule-timing':rows.map((_,i)=>String(i))},...rows.map((t,i)=>({['timing-'+i+'-phase']:t.phase.map(String),['timing-'+i+'-turn']:t.turn,['timing-'+i+'-window']:t.window})));
test.afterEach(()=>C.reset());
test('Armour of Contempt is available in both Fight turns and only opponent Shooting for all shared factions',()=>{
 const row=armour();C.apply([row]);C.validate(row);
 for(const membership of row.data.memberships){for(const [phase,turn,expected] of [[2,'you',false],[2,'opponent',true],[4,'you',true],[4,'opponent',true],[1,'you',false]])assert.equal(visible(state(phase,turn,membership)),expected,membership.faction+' '+phase+' '+turn);}
 assert.deepEqual(row.data.memberships,original.data.memberships);assert.deepEqual(row.data.importSource,original.data.importSource);
});
test('timeline uses the same phase/turn pairs and avoids a forbidden own-Shooting placement',()=>{
 const row=armour();C.apply([row]);const s=state(2),model=T.build([row],{faction:s.army.faction,detachment:s.army.detachment});
 const locations=slots(model).filter(s=>s.items.some(x=>x.row.key===row.key));assert.deepEqual(locations.map(s=>[s.phase,s.turn]).sort(),[[2,'opponent'],[4,'opponent'],[4,'you']].sort());
 assert.ok(!slots(T.build([row],{faction:s.army.faction,turn:'you'})).some(s=>s.phase===2&&s.items.some(x=>x.row.key===row.key)));
});
test('different start and end windows in one phase remain independent in Guide and timeline',()=>{
 const row=armour();row.data.timings=[{phase:[0],turn:'you',window:'start'},{phase:[0],turn:'opponent',window:'end'},{phase:[0],turn:'you',window:'end'}];C.apply([row]);
 for(const turn of ['you','opponent']){const s=state(0,turn),steps=A.steps(s);assert.equal(cards(s,steps.find(x=>x.id==='command-start')).some(c=>c.id===row.data.id),turn==='you');assert.ok(cards(s,steps.find(x=>x.id==='command-end')).some(c=>c.id===row.data.id));}
 const model=T.build([row],{faction:state(0).army.faction}),locations=slots(model).filter(s=>s.items.some(x=>x.row.key===row.key));assert.equal(locations.length,3);assert.ok(locations.some(s=>s.id==='command-start'&&s.turn==='you'));assert.ok(!locations.some(s=>s.id==='command-start'&&s.turn==='opponent'));
});
test('activation stages use each matching window without leaking a window from another turn',()=>{
 const row=armour();row.data.timings=[{phase:[2],turn:'you',window:'before'},{phase:[2],turn:'opponent',window:'after'}];C.apply([row]);
 for(const turn of ['you','opponent']){const s=state(2,turn),unit=A.units(s.army)[0],rows=A.stages(s,unit,turn==='you'?'shooting':'response');const locations=rows.filter(r=>r.cards.some(c=>c.id===row.data.id));assert.equal(locations.length,1);assert.equal(locations[0],turn==='you'?rows[0]:rows.at(-1));}
});
test('overlapping alternatives render once per timeline slot and once per Guide deck',()=>{
 const row=armour();row.data.timings=[{phase:[4],turn:'either',window:'react'},{phase:[4],turn:'you',window:'react'}];C.apply([row]);const s=state(4),step=A.steps(s).find(x=>x.activationMode==='fight');assert.equal(cards(s,step).filter(c=>c.id===row.data.id).length,1);
 const model=T.build([row],{faction:s.army.faction});assert.equal(slots(model).filter(s=>s.turn==='you'&&s.items.some(x=>x.row.key===row.key)).length,1);
});
test('timing validation rejects malformed, excessive and duplicate alternatives',()=>{
 for(const value of [[],null,{},[{phase:[2],turn:'mine',window:'select'}],[{phase:[7],turn:'you',window:'select'}],[{phase:[2,2],turn:'you',window:'select'}],[{phase:[2],turn:'you',window:'bad'}],[{phase:[2],turn:'you',window:'select',extra:true}],Array(21).fill(timings[0]),[timings[0],timings[0]]]){const row=armour();row.data.timings=value;assert.throws(()=>C.validate(row),/timing|phase|turn|window/i);}
 const row=armour();row.data.timings=[{phase:[],turn:'either',window:'prebattle'}];C.validate(row);
});
test('editor capture preserves all alternatives and projects only compatibility fields',()=>{
 const data=structuredClone(original.data);C.captureTimings(data,fd(form(timings)));assert.deepEqual(data.timings,timings);assert.deepEqual(data.phase,[2,4]);assert.equal(data.turn,'either');assert.equal(data.window,'select');assert.equal(data.timingOverride,true);
 const row={...structuredClone(original),data};C.validate(row);const snapshot=JSON.stringify(row.data.timings);C.captureTimings(data,fd({phase:['1'],turn:'you',window:'after'}));assert.equal(JSON.stringify(data.timings),snapshot,'a legacy form cannot erase multiple timings');
 C.captureTimings(data,fd(form([{phase:[4],turn:'either',window:'end'}])));assert.equal(data.timings,undefined);assert.deepEqual(data.phase,[4]);assert.equal(data.window,'end');assert.equal(data.timingOverride,true);
});
test('unchanged legacy timing remains in its existing format and keeps implicit placement behavior',()=>{
 const data={phase:[0],turn:'you',window:'act',sourceRuleId:'psychic-guidance-sample'};C.captureTimings(data,fd(form([data])));assert.equal(data.timings,undefined);assert.equal(data.timingOverride,undefined);
 assert.ok(L.timingMatches(data,{phase:0,turn:'you'},{window:'shock'}));assert.ok(!L.timingMatches(data,{phase:0,turn:'you'},{window:'act'}));
});
test('timeline quick edit captures multiple timings without losing sources or shared memberships',()=>{
 const saved=T.capture(original,fd({...form(timings),name:original.name,summary:original.data.summary,targetText:original.data.targetText||'',conditions:original.data.conditions.join('\n'),category:'stratagem',units:'',guideOrder:'normal',guideRank:'20',enabled:'on',referenceOnly:'on'}));assert.deepEqual(saved.data.timings,timings);assert.deepEqual(saved.data.memberships,original.data.memberships);assert.deepEqual(saved.data.importSource,original.data.importSource);assert.equal(saved.revision,original.revision);
});
test('read-only answer cards show complete combinations even for reference-only rules',()=>{
 const row=armour();assert.match(S.reviewCard({kind:'rule',rule:row.data,units:[]}),/Shooting · Opponent’s turn · When selected; Fight · Either turn · When selected/);
 C.apply([row]);const s=state(4);const card=cards(s,A.steps(s).find(x=>x.activationMode==='fight')).find(c=>c.id===row.data.id);assert.match(card.timing,/Shooting · Opponent’s turn.*Fight · Either turn/);
});
test('exports and source-only refreshes preserve editable timing alternatives',()=>{
 const row=armour(),parsed=I.parse([{name:'timings.json',text:I.exportCatalog([row])}],{faction:'Space Marines',group:'Space Marines'});assert.deepEqual(parsed.candidates[0].row.data.timings,timings);
 const source={...structuredClone(row),data:{...structuredClone(row.data),timings:undefined,importSource:{...structuredClone(row.data.importSource),text:'New source reference'}}},plan=I.plan({candidates:[{row:source,source:true}],warnings:[]},[row]);assert.equal(plan.rows[0].action,'source');assert.deepEqual(I.selected(plan)[0].data.timings,timings);
});
test('timing reports cannot flatten multi-timing rules during direct approval',()=>{
 const row=armour(),report={id:'11111111-1111-4111-8111-111111111111',entity_key:row.key,base_revision:row.revision,issue_type:'timing',change_text:'Check this window',status:'pending',faction:'Space Marines',context:{},timing:{phase:[2],turn:'opponent',window:'after'}};
 assert.match(R.directReviewReason(report,[row]),/multiple timings.*Edit/);assert.deepEqual(R.proposal(report,[row]).data.timings,timings);
 C.apply([row]);const s=state(2,'opponent'),step=A.steps(s)[1],deck=A.flashcards(s,step),page=R.pageContext(s,step,deck,[row]);assert.deepEqual(page.options.find(o=>o.key===row.key).timing,timings[0]);assert.deepEqual(page.options.find(o=>o.key===row.key).observed.timings,timings);
});
test('session cache refreshes when a saved catalog revision changes timing combinations',()=>{
 const row=armour();C.apply([row]);const session=A.createSession(),s=state(2),step=A.steps(s)[1];assert.ok(!session.deck(s,step).shared.some(c=>c.id===row.data.id));
 // Node has no global Content binding; the browser uses its generation getter.
 const previous=global.WarPlannerContent;try{global.WarPlannerContent=C;const game=A.createSession();assert.ok(!game.deck(s,step).shared.some(c=>c.id===row.data.id));row.data.timings[0].turn='either';C.apply([row]);assert.ok(game.deck(s,step).shared.some(c=>c.id===row.data.id));}finally{if(previous===undefined)delete global.WarPlannerContent;else global.WarPlannerContent=previous;}
});

test('practice snapshots retain timing alternatives and detect added or removed timing arrays',()=>{
 const row=armour(),others=['Alpha','Beta','Gamma'].map((name,i)=>{const r=structuredClone(row);r.key='rule:timing-choice-'+i;Object.assign(r.data,{id:'timing-choice-'+i,name,summary:name+' has a distinct study effect.',sourceRuleId:'timing-choice-'+i});r.name=name;delete r.data.memberships;delete r.data.sharedRuleIds;r.data.detachment='';return r;});C.apply([row,...others]);
 const bank=Q.buildBank({faction:'Space Marines',rules:L.abilities,units:[],random:()=>0.5}),material=bank.studyRules.find(r=>r.id===row.data.id);const q=material&&{id:'timing-snapshot',mode:'effects',faction:'Space Marines',prompt:'Recall the effect',correct:material.id,options:[{id:material.id,label:material.name}],review:{kind:'rule',rule:material,units:[]},explanation:{summary:material.summary}};assert.ok(q);assert.deepEqual(q.review.rule.timings,timings);assert.equal(R.practiceContext(q,[row],'timing-question').context.snapshotChanged,false);
 const changed=structuredClone(row);delete changed.data.timings;assert.equal(R.practiceContext(q,[changed],'timing-question').context.snapshotChanged,true);
 const legacy=structuredClone(q);delete legacy.review.rule.timings;assert.equal(R.practiceContext(legacy,[row],'legacy-question').context.snapshotChanged,true);
});

test('a prebattle timing remains in reference content alongside the rule’s active Fight timings',()=>{
 const row=armour();row.data.timings=[{phase:[0],turn:'either',window:'prebattle'},timings[1]];C.apply([row]);const model=T.build([row],{faction:state(0).army.faction});assert.ok(model.reference.items.some(x=>x.row.key===row.key));assert.equal(slots(model).filter(s=>s.items.some(x=>x.row.key===row.key)).length,2);assert.equal(model.index.filter(r=>r.key===row.key).length,1);
});
