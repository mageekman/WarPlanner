const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-tau.cjs'),before=require('./fixtures/tau-audit-before.json'),sources=require('./fixtures/tau-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>after.find(r=>r.key==='rule:'+id+'-tau-empire').data;
test.afterEach(()=>C.reset());
test('T’au audit covers all 166 abilities, 47 units, 48 profiles and eight detachments',()=>{
 assert.equal(result.changes.length,166);assert.deepEqual(result.counts,{structured:82,'needs-summary':81,missing:3});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,47);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),48);for(const u of units)P.validate(P.read(u.data));assert.equal(after.filter(r=>r.kind==='detachment').length,8);
});
test('T’au audit preserves original mechanics, memberships, review flags, guide hints and nonrules',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){assert.deepEqual(row,original);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','units','id'])assert.deepEqual(row.data[key],original.data[key]);}
});
test('incomplete Greater Good and three no-effect records remain outside confident summaries',()=>{
 assert.equal(M.summaryState(get('for-the-greater-good')),'needs-summary');assert.match(get('for-the-greater-good').summary,/\+1 Hit.*Ballistic Skill.*Observer\/Guided.*MARKERLIGHT/);
 for(const id of ['battlesuit-support-system','for-the-greater-good-sudden-dawn-cadre','rapid-disembark']){assert.equal(M.summaryState(get(id)),'missing');assert.match(get(id).summary,/no-effect/);}
 assert.match(get('puretides-teachings').summary,/my-will-be-done-necrons.*unrelated Necron/);assert.equal(M.summaryState(get('puretides-teachings')),'needs-summary');
});
test('Focused Fire preserves two distinct friendly targets and a third enemy target',()=>{
 const d=get('focused-fire-montka');assert.equal(d.window,'start');assert.deepEqual(d.phase,[2]);assert.equal(d.turn,'you');assert.match(d.summary,/rounds 1–3.*two different.*one enemy.*only that enemy.*AP by 1/);
 assert.match(d.targetText,/first target: One friendly.*not \(selected to shoot.*second target: One friendly.*not \(same unit as first target\).*third target: One enemy/);
 const pulse=get('pulse-onslaught-montka');assert.match(pulse.targetText,/first target: One friendly.*excluding Kroot.*second target: One enemy.*excluding Monster or Vehicle.*hit by the triggering unit/);assert.match(pulse.summary,/opponent’s next turn.*2″ Move.*Advance and Charge/);
});
test('all core Stratagem costs, phases, turn and eligibility survive in the audit',()=>{
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.ok(core);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
 assert.match(get('swift-embarkation-sudden-dawn-cadre').targetText,/not engaged.*eligible to fight.*wholly.*6″.*SUDDEN DAWN CADRE \+ TRANSPORT/);assert.match(get('the-shortened-blade-retaliation-cadre').targetText,/set up this phase.*used Deep Strike this phase/);assert.match(get('emp-grenades-kroot-hunting-pack').targetText,/Grenades.*Kroot.*8″/);
});
test('T’au variants retain exact defensive usage limits and shooting weapon scope',()=>{
 assert.match(get('stealth-drones').summary,/Twice per battle per unit.*Damage to 0/);assert.match(get('nova-charge').summary,/Once per battle per unit.*one ranged weapon.*Devastating Wounds/);assert.match(get('oversight-drone').summary,/Once per battle per unit.*Ignores Cover/);
 assert.match(get('prototype-weapon-system-retaliation-cadre').summary,/Each time.*choose Lethal Hits or Sustained Hits 1.*until those attacks finish/);
 assert.match(get('fireknife').summary,/below Starting Strength.*not below Starting Strength/);assert.match(get('weapon-support-system-riptide-battlesuit').summary,/does not also ignore Ballistic Skill/);
});
test('two differing source snapshots, provisional detachment rules and contradictory recipients stay flagged',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id);return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],row.data.importSource.record[k]));}).map(r=>r.data.id).sort();
 assert.deepEqual(differences,['a-tempting-trap-kauyon','targeting-array'].map(id=>id+'-tau-empire').sort());for(const id of ['a-tempting-trap-kauyon','targeting-array']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/pinned/);}
 for(const id of ['killing-blow','patient-hunter','grav-inhibitor-drone','neocapacitor-shields','retro-thrusters','drones'])assert.equal(M.summaryState(get(id)),'needs-summary');
 assert.match(get('killing-blow').summary,/rounds 1–3.*Assault.*Lethal Hits while Guided/);assert.match(get('patient-hunter').summary,/rounds 3–5.*Sustained Hits 1/);
});
test('changed text, timing, source, stats, revisions and added/deleted rows reject a stale repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='My saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 84 unresolved T’au records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:"T'au Empire",units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,84);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('filtered T’au timeline retains army rules and actual guide places Fieldcraft at Command end',()=>{
 C.apply(after);const all=T.build(after,{faction:"T'au Empire"});assert.equal(all.index.filter(r=>r.kind==='rule'&&r.faction!=='*').length,166);assert.equal(all.index.filter(r=>r.kind==='unit').length,47);
 const filtered=T.build(after,{faction:"T'au Empire",detachment:'Mont’ka'});assert.ok(filtered.index.some(r=>r.key==='rule:focused-fire-montka-tau-empire'));assert.ok(!filtered.index.some(r=>r.key==='rule:point-blank-ambush-kauyon-tau-empire'));assert.ok(filtered.index.some(r=>r.key==='rule:for-the-greater-good-tau-empire'));
 const s={phase:0,turn:'you',round:1,firstPlayer:'you',army:{faction:"T'au Empire",detachments:['Kroot Hunting Pack'],units:[{id:'kroot',name:'Kroot Carnivores',models:10,details:[]}]}};const cards=A.flashcards(s,A.steps(s).at(-1)).unitCards.flatMap(c=>c.items);assert.ok(cards.some(c=>c.id==='fieldcraft-tau-empire'));
});
