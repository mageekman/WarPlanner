const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../dist/timeline.js'),C=require('../dist/content.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js');
const seed=C.seed(),base=seed.find(r=>r.kind==='rule'&&r.data.category==='ability');
function rule(id,extra={}){return {...structuredClone(base),key:'rule:'+id,faction:'Aeldari',name:id,revision:8,data:{...structuredClone(base.data),id,name:id,faction:'Aeldari',summary:'A checked reminder.',units:['Unlisted squad'],detachment:'Any detachment',category:'ability',phase:[2],turn:'you',window:'before',adminManaged:true,...extra}};}
function slots(model){return model.phases.flatMap(p=>p.lanes.flatMap(l=>l.steps.flatMap(s=>[{...s,phase:p.phase,turn:l.turn},...s.slots.map(slot=>({...slot,phase:p.phase,turn:l.turn}))])));}
const fd=values=>({get:k=>Array.isArray(values[k])?values[k][0]:values[k]??null,getAll:k=>Array.isArray(values[k])?values[k]:values[k]===undefined?[]:[values[k]],has:k=>k in values});
test.afterEach(()=>C.reset());
test('timeline core steps and activation stages come from the guide for all five phases and both turns',()=>{
 C.apply([]);const model=T.build(seed,{faction:'Aeldari'});assert.equal(model.phases.length,5);
 for(const p of model.phases)for(const lane of p.lanes){const state={phase:p.phase,turn:lane.turn,firstPlayer:'you',army:{faction:'Aeldari',units:[]}},expected=A.steps(state);assert.deepEqual(lane.steps.filter(s=>s.row).map(s=>s.id),expected.map(s=>s.id));for(const step of lane.steps.filter(s=>s.step?.activationMode)){const dummy={members:[],leaders:[],body:{name:'',details:[]},attached:false};assert.deepEqual(step.slots.map(s=>s.title),A.stages(state,dummy,step.step.activationMode).map(s=>s.title));}}
});
test('all faction rule conditions are visible regardless of roster, equipment or detachment',()=>{
 const rows=[rule('all-material',{enhancement:'Unavailable enhancement',leadingUnitRequired:true}),rule('opponent-after',{turn:'opponent',window:'after'}),{...rule('foreign'),faction:'Space Marines',data:{...rule('foreign').data,faction:'Space Marines'}}];C.apply(rows);const model=T.build(rows,{faction:'Aeldari'}),all=slots(model);
 assert.ok(all.some(s=>s.phase===2&&s.turn==='you'&&s.id==='before'&&s.items.some(x=>x.row.key==='rule:all-material')));
 assert.ok(all.some(s=>s.phase===2&&s.turn==='opponent'&&s.id==='after'&&s.items.some(x=>x.row.key==='rule:opponent-after')));assert.ok(!model.index.some(r=>r.key==='rule:foreign'));
});
test('type filters include linked units and detachments even when ability cards are hidden',()=>{
 const ability=rule('linked'),unit={...structuredClone(seed.find(r=>r.kind==='unit')),key:'unit:timeline-unit',name:'Unlisted squad',faction:'Aeldari',data:{...structuredClone(seed.find(r=>r.kind==='unit').data),id:'timeline-unit',name:'Unlisted squad',abilities:[{id:'linked'}]}},det={...structuredClone(seed.find(r=>r.kind==='detachment')),key:'detachment:timeline-det',name:'Any detachment',faction:'Aeldari',data:{...structuredClone(seed.find(r=>r.kind==='detachment').data),id:'timeline-det',name:'Any detachment',rules:['linked']}};
 C.apply([ability,unit,det]);const model=T.build([ability,unit,det],{faction:'Aeldari',selectedTypes:['unit','detachment']});const entry=slots(model).find(s=>s.id==='before'&&s.phase===2&&s.turn==='you');assert.ok(entry.items.some(x=>x.row.key===unit.key));assert.ok(entry.items.some(x=>x.row.key===det.key));assert.ok(entry.items.every(x=>['unit','detachment'].includes(x.type)));assert.ok(!model.index.some(r=>r.kind==='rule'));
});
test('unplaced references remain editable, aliases are hidden, and disabled content is opt-in',()=>{
 const reference=rule('reference',{phase:[],window:'prebattle'}),disabled={...rule('disabled'),enabled:false},alias=rule('alias',{sharedRuleId:'reference'});C.apply([reference,disabled,alias]);
 const model=T.build([reference,disabled,alias],{faction:'Aeldari'});assert.ok(model.reference.items.some(x=>x.row.key===reference.key));assert.ok(!model.index.some(r=>r.key===disabled.key||r.key===alias.key));assert.ok(T.build([disabled],{faction:'Aeldari',showDisabled:true}).index.some(r=>r.key===disabled.key));
});
test('shared rules appear once per timing window in an assigned chapter and not in foreign factions',()=>{
 const shared=rule('shared',{detachment:'',memberships:[{faction:'Aeldari',detachments:['Aspect Host']},{faction:'Space Marines',detachments:['Gladius Task Force']}]}),foreign={...rule('foreign'),faction:'Tyranids',data:{...rule('foreign').data,faction:'Tyranids'}};C.apply([shared,foreign]);
 const model=T.build([shared,foreign],{faction:'Space Marines'});assert.equal(slots(model).filter(s=>s.items.some(x=>x.row.key===shared.key)).length,1);assert.ok(!model.index.some(r=>r.key===foreign.key));
});
test('quick edits move rules to their saved timing while preserving identity, revision, memberships and sources',()=>{
 const original=rule('editable'),data={name:'Edited reminder',summary:'New checked text.',targetText:'One friendly unit',conditions:'Keep this restriction.',phase:['1','2'],turn:'either',window:'after',category:'stratagem',units:'Unlisted squad',enabled:'on',guideOrder:'early',guideRank:'15',guideNote:'Resolve before later units.'};
 const saved=T.capture(original,fd(data));assert.equal(saved.key,original.key);assert.equal(saved.revision,8);assert.deepEqual(saved.data.importSource,original.data.importSource);assert.deepEqual(saved.data.phase,[1,2]);assert.equal(saved.data.window,'after');C.apply([saved]);const model=T.build([saved],{faction:'Aeldari'});assert.equal(slots(model).filter(s=>s.items.some(x=>x.row.key===saved.key)).length,4);
 assert.throws(()=>T.capture(original,fd({...data,phase:['99']})),/valid phases/);
});
test('core edits use the same step override read by the guide',()=>{
 const core=seed.find(r=>r.key==='step:shooting-activations'),saved=T.capture(core,fd({name:'Edited shooting step',body:'New shooting instructions',why:'Study this sequence.'}));C.apply([saved]);const state={phase:2,turn:'you',firstPlayer:'you',army:{faction:'Aeldari',units:[]}};assert.equal(A.steps(state).find(s=>s.id==='shooting-activations').title,'Edited shooting step');
});
test('turn filters do not move opponent-only rules into the reference lane',()=>{
 const row=rule('other-turn',{turn:'opponent'});C.apply([row]);assert.ok(!T.build([row],{faction:'Aeldari',turn:'you'}).index.some(r=>r.key===row.key));
});
test('legacy guide timing and explicit timing edits use one matcher in both the map and guide',()=>{
 const row=rule('legacy-psychic',{phase:[0],window:'act',sourceRuleId:'psychic-guidance-example'});C.apply([row]);let model=T.build([row],{faction:'Aeldari'});assert.ok(slots(model).some(s=>s.id==='command-shock'&&s.items.some(x=>x.row.key===row.key)));
 const saved=T.capture(row,fd({name:row.name,summary:'Checked timing.',targetText:'This unit',phase:['0'],turn:'you',window:'end',category:'ability',units:'Unlisted squad',guideOrder:'normal',guideRank:'20',guideNote:'',enabled:'on'}));C.apply([saved]);model=T.build([saved],{faction:'Aeldari'});assert.ok(!slots(model).some(s=>s.id==='command-shock'&&s.items.some(x=>x.row.key===row.key)));assert.ok(slots(model).some(s=>s.id==='command-end'&&s.items.some(x=>x.row.key===row.key)));
});
test('editing an imported ability without a sourceRuleId makes its saved placement appear in actual activation cards',()=>{
 const row=rule('timeline-native',{units:['Autarch'],detachment:'',referenceOnly:false});delete row.data.sourceRuleId;
 const saved=T.capture(row,fd({name:row.name,summary:'A checked after-shooting reminder.',targetText:'This unit',phase:['2'],turn:'you',window:'after',category:'ability',units:'Autarch',guideOrder:'normal',guideRank:'20',guideNote:'',enabled:'on'}));C.apply([saved]);
 const army={faction:'Aeldari',detachments:['Warhost'],units:[{id:'autarch-one',name:'Autarch',details:[],role:'',group:''}]},state={phase:2,turn:'you',firstPlayer:'you',army},unit=A.units(army)[0];
 assert.ok(A.stages(state,unit,'shooting').find(s=>s.id==='after').cards.some(a=>a.id===saved.data.id));const deck=A.flashcards(state,A.steps(state).find(s=>s.activationMode==='shooting'));assert.ok(deck.unitCards.some(c=>c.items.some(a=>a.id===saved.data.id)));
});

test('detachment selection narrows timed and reference rules while retaining army-wide content and units',()=>{
 const rows=[rule('army-wide',{detachment:'',phase:[2]}),rule('only-alpha',{detachment:'Alpha'}),rule('only-beta',{detachment:'Beta'}),rule('beta-reference',{detachment:'Beta',phase:[],window:'prebattle'}),rule('alpha-reference',{detachment:'Alpha',phase:[],window:'prebattle'}),...['Alpha','Beta'].map(name=>({...structuredClone(seed.find(r=>r.kind==='detachment')),key:'detachment:timeline-'+name,name,faction:'Aeldari',data:{...structuredClone(seed.find(r=>r.kind==='detachment').data),id:'timeline-'+name,name,rules:[],stratagems:[],enhancements:[]}}))];
 C.apply(rows);const full=T.build(rows,{faction:'Aeldari'}),filtered=T.build(rows,{faction:'Aeldari',detachment:'Alpha'}),ids=new Set(filtered.index.map(r=>r.key));
 assert.ok(full.index.some(r=>r.key==='rule:only-beta'));assert.equal(full.detachment,'');assert.equal(filtered.detachment,'Alpha');assert.ok(filtered.detachments.includes('Alpha'));assert.ok(filtered.detachments.includes('Beta'));
 for(const key of ['rule:army-wide','rule:only-alpha','rule:alpha-reference','detachment:timeline-Alpha'])assert.ok(ids.has(key),key);
 for(const key of ['rule:only-beta','rule:beta-reference','detachment:timeline-Beta'])assert.ok(!ids.has(key),key);
 assert.ok(filtered.index.some(r=>r.kind==='unit'));assert.ok(slots(filtered).every(s=>s.items.every(x=>x.row.key!=='rule:only-beta')));assert.ok(!filtered.reference.items.some(x=>x.row.key==='rule:beta-reference'));
});
test('shared detachment memberships use the selected faction and retain unrestricted memberships',()=>{
 const rows=[rule('shared-scope',{detachment:'',memberships:[{faction:'Aeldari',detachments:['Alpha','Beta']},{faction:'Space Marines',detachments:['Gamma']}]}),rule('unrestricted-scope',{detachment:'',memberships:[{faction:'Aeldari',detachments:[]},{faction:'Space Marines',detachments:['Gamma']}]})];
 C.apply(rows);const options=T.build(rows,{faction:'Aeldari',query:'unmatched',selectedTypes:[]}).detachments;assert.ok(options.includes('Alpha')&&options.includes('Beta'));assert.ok(!options.includes('Gamma'));
 assert.ok(T.build(rows,{faction:'Aeldari',detachment:'Beta'}).index.some(r=>r.key==='rule:shared-scope'));
 const alpha=rule('alpha-anchor',{detachment:'Other'});rows.push(alpha);C.apply(rows);const other=T.build(rows,{faction:'Aeldari',detachment:'Other'});assert.ok(!other.index.some(r=>r.key==='rule:shared-scope'));assert.ok(other.index.some(r=>r.key==='rule:unrestricted-scope'));
 const marines=T.build(rows,{faction:'Space Marines',detachment:'Gamma'});assert.ok(marines.index.some(r=>r.key==='rule:shared-scope'));assert.ok(!marines.detachments.includes('Alpha'));
});
test('detachment options include scoped rules without a folder and reset stale choices safely',()=>{
 const rows=[rule('orphan-detachment',{detachment:'Unlisted detachment'})];C.apply(rows);
 assert.ok(T.build(rows,{faction:'Aeldari',query:'missing',selectedTypes:['unit']}).detachments.includes('Unlisted detachment'));
 const unknown=T.build(rows,{faction:'Aeldari',detachment:'Deleted detachment'});assert.equal(unknown.detachment,'');assert.ok(unknown.index.some(r=>r.key===rows[0].key));
 const disabled={...rule('disabled-scope',{detachment:'Disabled detachment'}),enabled:false};assert.ok(!T.build([disabled],{faction:'Aeldari'}).detachments.includes('Disabled detachment'));assert.ok(T.build([disabled],{faction:'Aeldari',showDisabled:true}).detachments.includes('Disabled detachment'));
});
