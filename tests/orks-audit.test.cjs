const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-orks.cjs'),before=require('./fixtures/orks-audit-before.json'),sources=require('./fixtures/orks-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>after.find(r=>r.key==='rule:'+id+'-orks').data;
test.afterEach(()=>C.reset());
test('Orks audit covers every source rule, unit, profile and detachment',()=>{
 assert.equal(result.changes.length,209);assert.deepEqual(result.counts,{structured:148,'needs-summary':59,missing:2});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,60);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),69);for(const u of units)P.validate(P.read(u.data));assert.equal(after.filter(r=>r.kind==='detachment').length,16);
});
test('Orks source, scopes, flags, revisions, guide hints and all nonrules survive unchanged',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){assert.deepEqual(row,original);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','units','id'])assert.deepEqual(row.data[key],original.data[key]);}
});
test('Bomb Squig variants retain distinct allowances and shared movement, range and damage gates',()=>{
 for(const id of ['bomb-squig','bomb-squigs']){const d=get(id);assert.deepEqual(d.phase,[1]);assert.equal(d.turn,'you');assert.equal(d.window,'after');assert.match(d.summary,/Normal move.*visible enemy within 12″.*3\+.*D3 mortal/);assert.equal(M.summaryState(d),'available');}
 assert.match(get('bomb-squig').summary,/Once per battle per unit/);assert.match(get('bomb-squigs').summary,/Twice per battle per unit/);
});
test('Waaagh and button approximations never become confident practice rules',()=>{
 assert.equal(M.summaryState(get('waaagh')),'needs-summary');assert.match(get('waaagh').summary,/Once per battle per army.*start of a Command phase.*end of the next turn.*provisional/);assert.match(get('waaagh').summary,/5\+ invulnerable.*Assault.*charge after Advancing/);
 assert.equal(M.summaryState(get('try-dat-button')),'needs-summary');assert.match(get('try-dat-button').summary,/approximate.*effect table instead.*Hazardous escalation/);
 for(const id of ['waaagh-energy','wurrboy']){assert.equal(M.summaryState(get(id)),'missing');assert.match(get(id).summary,/no-effect/);}
});
test('four pinned source differences remain explicit and their imported payloads are preserved',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id);return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],row.data.importSource.record[k]));}).map(r=>r.data.id).sort();
 assert.deepEqual(differences,['drive-by-bustin-wreckas','more-dakka','paired-krumpas','rokkit-charge'].map(id=>id+'-orks').sort());for(const id of ['drive-by-bustin-wreckas','more-dakka','paired-krumpas','rokkit-charge']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/pinned/);}
});
test('core Stratagem gates preserve damage, hit, model-count and embark eligibility',()=>{
 assert.match(get('goaded-into-action-da-big-hunt').targetText,/not engaged.*damage allocated.*triggering enemy/);assert.match(get('gun-crazy-show-offs-wreckas').targetText,/FLASH GITZ or TANKBUSTAS.*hit by the triggering enemy/);
 assert.match(get('mob-mentality-green-tide').targetText,/at least 13 models/);assert.match(get('keep-it-runnin-blitz-brigade').targetText,/eligible to fight.*wholly.*6″.*eligible to embark/);
 assert.match(get('while-their-backs-are-turned-taktikal-brigade').targetText,/engaged at the start of the phase/);
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.ok(core);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('combat reminders preserve charged-only damage and fight-on-death resolution',()=>{
 assert.match(get('high-speed-carnage').summary,/charged.*melee Strength and Damage/);assert.match(get('fully-loaded-butchery').summary,/2 Attacks per embarked model.*\+22/);
 assert.match(get('ard-as-nails').summary,/3\+.*after that unit fights or at phase end.*Add 1/);assert.match(get('crazed-rampage-dread-mob').summary,/4\+.*add 3.*DEFF DREAD/);assert.match(get('one-last-kill').summary,/2\+.*phase end/);
 assert.equal(get('idol-of-belligerence').window,'before');assert.match(get('idol-of-belligerence').summary,/selected to disembark.*riled-up.*start of your next turn/);
});
test('catalog drift or a saved edit prevents an outdated Orks repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='My saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('61 unresolved Orks records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Orks',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,61);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('Orks timeline filtering retains army rules and the actual unit guide uses audited after-move timing',()=>{
 C.apply(after);const all=T.build(after,{faction:'Orks'});assert.equal(all.index.filter(r=>r.kind==='rule').length,209);assert.equal(all.index.filter(r=>r.kind==='unit').length,60);
 const filtered=T.build(after,{faction:'Orks',detachment:'War Horde'});assert.ok(filtered.index.some(r=>r.key==='rule:close-range-dakka-war-horde-orks'));assert.ok(!filtered.index.some(r=>r.key==='rule:dakkastorm-kult-of-speed-orks'));assert.ok(filtered.index.some(r=>r.key==='rule:waaagh-orks'));
 const s={phase:1,turn:'you',round:1,firstPlayer:'you',army:{faction:'Orks',detachments:['War Horde'],units:[{id:'kommandos',name:'Kommandos',models:10,details:[]}]}};
 assert.ok(A.stages(s,A.units(s.army)[0],'movement').find(s=>s.id==='after').cards.some(c=>c.sourceRuleId==='bomb-squig-orks'));
});
