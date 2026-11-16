const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-necrons.cjs'),before=require('./fixtures/necrons-audit-before.json'),sources=require('./fixtures/necrons-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>after.find(r=>r.key==='rule:'+id+'-necrons').data;
test.afterEach(()=>C.reset());
test('all 230 source rules, 57 units, 58 profiles and 13 detachments are covered',()=>{
 assert.equal(result.changes.length,230);assert.deepEqual(result.counts,{structured:158,'needs-summary':57,missing:15});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,57);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),58);for(const u of units)P.validate(P.read(u.data));assert.equal(after.filter(r=>r.kind==='detachment').length,13);
});
test('existing non-rules, imported mechanics, scopes, flags, IDs and guide hints are preserved',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){assert.deepEqual(row,original);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','units','id'])assert.deepEqual(row.data[key],original.data[key]);}
});
test('Reanimation records preserve their recovery amounts, version IDs, end timing and explicit missing procedure',()=>{
 for(const id of ['reanimation-protocols','reanimation-protocols-amonhotekhs-guard']){const d=get(id);assert.deepEqual(d.phase,[0]);assert.equal(d.turn,'you');assert.equal(d.window,'end');assert.equal(M.summaryState(d),'needs-summary');assert.match(d.summary,/D3 wounds/);assert.match(d.summary,/procedure/);}
 assert.match(get('protocol-of-the-undying-legions-awakened-dynasty').summary,/D3 wounds.*D3\+1.*double-count/);
 assert.equal(M.summaryState(get('resurrection-orb-catacomb-command-barge')),'missing');assert.equal(M.summaryState(get('resurrection-orb')),'needs-summary');assert.match(get('resurrection-orb').summary,/D6.*once/);
 assert.match(get('their-number-is-legion-amonhotekhs-guard-necron-warriors').summary,/ordinary Reanimation ability ID/);assert.deepEqual(get('nanoscarab-reanimation-beam').phase,[0,1,2,3,4]);assert.equal(get('nanoscarab-reanimation-beam').turn,'either');
});
test('Power Matrix phase snapshots, every-model gate and replacing re-roll branch stay explicit',()=>{
 const d=get('power-matrix');assert.equal(d.window,'start');assert.deepEqual(d.phase,[0,1,2,3,4]);for(const text of ['phase start','snapshot','at least half','every model','wholly','replaces'])assert.ok(d.summary.includes(text));assert.match(get('hyperphasic-fulcrum-canoptek-court').summary,/bearer leads.*every model.*wholly.*Power Matrix/);
});
test('Hyperphasing, dimensions and movement reminders retain battle sizes, no-charge and setup gates',()=>{
 assert.match(get('hyperphasing').summary,/one.*Incursion.*two.*Strike Force.*three.*Onslaught.*unengaged/);assert.equal(get('hyperphasing').window,'turn-end');assert.equal(get('hyperphasing').turn,'opponent');
 assert.match(get('chronometron').summary,/5″ Normal move.*cannot declare a charge/);assert.match(get('tunnelling-horrors').summary,/opponent’s turn.*unengaged.*round 1/);assert.match(get('veil-of-darkness-awakened-dynasty').summary,/Once per battle per army.*next Shooting phase/);
 assert.match(get('chronoshift-starshatter-arsenal').summary,/starts an Advance.*6″/);assert.equal(M.summaryState(get('hyperspatial-transfer-node-hypercrypt-legion')),'needs-summary');
});
test('core targets include two required recall targets, casualty binding, Warlord and Power Matrix gates',()=>{
 const recall=get('hyperphasic-recall-hypercrypt-legion').targetText;assert.match(recall,/first target: One.*Infantry.*Necrons.*destroyed by the triggering enemy.* AND second target: One.*Monolith.*not \(same unit as first target\)/);
 assert.match(get('reanimation-crypts-hypercrypt-legion').targetText,/your Warlord/);assert.match(get('your-time-is-nigh-obeisance-phalanx').targetText,/your Warlord/);
 assert.ok(result.changes.some(r=>/Power Matrix/.test(r.data.targetText)));assert.match(get('unnatural-aggression-cursed-legion').targetText,/eligible to declare a charge/);
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.id===r.data.id);assert.ok(core);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('three differing source versions remain preserved and excluded from confident summaries',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id);return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],row.data.importSource.record[k]));}).map(r=>r.data.id).sort();
 assert.deepEqual(differences,['cold-fervour','plasmacyte-amonhotekhs-guard-skorpekh-destroyers','transdimensional-deployment'].map(id=>id+'-necrons').sort());for(const id of ['cold-fervour','plasmacyte-amonhotekhs-guard-skorpekh-destroyers','transdimensional-deployment']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/pinned/);}
 assert.match(get('subsurface-quantumweave-the-phaerons-armoury').summary,/setting AP to 1/);assert.match(get('triarchal-menhirs').summary,/does not restrict.*Silent King/);
});
test('changed text, timing, sources, stats, revisions, missing and new native rows reject the repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='My saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 72 unresolved records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Necrons',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,72);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('actual guide and filtered timeline place ordinary Reanimation at Command end and Chronometron after shooting',()=>{
 C.apply(after);const all=T.build(after,{faction:'Necrons'});assert.equal(all.index.filter(r=>r.kind==='rule'&&r.faction!=='*').length,230);assert.equal(all.index.filter(r=>r.kind==='unit').length,57);
 const s={phase:0,turn:'you',round:1,firstPlayer:'you',army:{faction:'Necrons',detachments:['Awakened Dynasty'],units:[{id:'warriors',name:'Necron Warriors',models:10,details:[]}]}};const shared=A.flashcards(s,A.steps(s).at(-1)).shared;assert.ok(shared.some(c=>c.id==='reanimation-protocols-necrons'));assert.ok(!shared.some(c=>c.id==='reanimation-protocols-amonhotekhs-guard-necrons'));
 const shooting={...s,phase:2,army:{...s.army,units:[{id:'chrono',name:'Chronomancer',models:1,details:[]}]}};assert.ok(A.stages(shooting,A.units(shooting.army)[0],'shooting').find(s=>s.id==='after').cards.some(c=>c.sourceRuleId==='chronometron-necrons'));
 const filtered=T.build(after,{faction:'Necrons',detachment:'Hypercrypt Legion'});assert.ok(filtered.index.some(r=>r.key==='rule:hyperphasing-necrons'));assert.ok(!filtered.index.some(r=>r.key==='rule:protocol-of-the-sudden-storm-awakened-dynasty-necrons'));assert.ok(filtered.index.some(r=>r.key==='rule:reanimation-protocols-necrons'));
});
