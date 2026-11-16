const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-drukhari.cjs'),before=require('./fixtures/drukhari-audit-before.json'),sources=require('./fixtures/drukhari-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r).concat(result.changes.filter(r=>!before.some(b=>b.key===r.key)));
const get=id=>after.find(r=>r.key==='rule:'+id+'-drukhari').data;
test.afterEach(()=>C.reset());
test('all 164 source rules receive descriptions and four missing datasheets complete the 27-unit catalog',()=>{
 assert.equal(result.changes.length,168);assert.deepEqual(result.counts,{structured:102,'needs-summary':43,missing:19});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of after.filter(r=>r.kind==='rule')){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,27);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),28);for(const u of units)P.validate(P.read(u.data));assert.equal(after.filter(r=>r.kind==='detachment').length,10);
});
test('existing units, faction, detachments, source payloads, review flags and guide hints stay unchanged',()=>{
 const snapshot=structuredClone(before);audit(before);assert.deepEqual(before,snapshot);
 for(const old of before){const row=after.find(r=>r.key===old.key);if(row.kind!=='rule'){assert.deepEqual(row,old);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],old[key]);for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide'])assert.deepEqual(row.data[key],old.data[key]);
 if(!['corsairs-and-travelling-players','power-from-pain'].some(id=>row.data.id===id+'-drukhari'))assert.deepEqual(row.data.units,old.data.units);}
});
test('new datasheets preserve pinned profiles and connect every native ability to its proper unit',()=>{
 const newRows=result.changes.filter(r=>r.kind==='unit');assert.deepEqual(newRows.map(r=>r.data.id).sort(),['coven-of-agonies-cronos','coven-of-agonies-talos','coven-of-agonies-wracks','xatrophos-nuul']);
 const ids=new Set(after.filter(r=>r.kind==='rule').map(r=>r.data.id));for(const row of newRows){C.validate(row);assert.equal(row.revision,0);assert.equal(row.data.importSource.commit,'6ea813f7706bc9a492026d8b4403af99a965162b');assert.ok(row.data.abilities.length);for(const ref of row.data.abilities)assert.ok(ids.has(ref.id));assert.deepEqual(row.data.importSource.record,sources['core-units.json'].find(u=>u.id===row.data.id));}
 const names=new Set(after.filter(r=>r.kind==='unit').map(r=>r.name));for(const r of after.filter(r=>r.kind==='rule'))for(const name of r.data.units)assert.ok(names.has(name),'Unknown rule unit: '+name);
});
test('army rules lose an incorrect datasheet-only gate without inventing Power From Pain mechanics',()=>{
 const faction=sources['core-factions.json'][0];for(const id of faction.faction_rule_ids){const d=after.find(r=>r.data.id===id).data;assert.deepEqual(d.units,[]);assert.ok(d.summaryAudit.previousUnitScope.length);assert.deepEqual(d.summaryAudit.coreSource,faction);}
 assert.equal(M.summaryState(get('power-from-pain')),'missing');assert.match(get('power-from-pain').summary,/Starting Pain-token pools.*not defined/);assert.match(get('corsairs-and-travelling-players').summary,/500 points.*Warlord.*enhancements.*one each/);
});
test('Pain spending, model exclusions and distinct Talos resolution sequences remain explicit',()=>{
 assert.match(get('acrobatic-gladiators').summary,/spend 1 Pain token.*Advanced or Fallen Back/);assert.match(get('experimental-enhancements').summary,/non-CHARACTER.*set.*rather than adding/);
 assert.match(get('brides-of-death').summary,/1 Pain token.*Strength and AP by 1/);assert.match(get('mindless-killing-machines').summary,/2\+.*after the attacking unit finishes/);assert.match(get('mindless-killing-machines-coven-of-agonies-talos').summary,/2\+ when its unit fights.*phase end/);
 assert.equal(M.summaryState(get('pain-engine-coven-of-agonies-cronos')),'missing');assert.equal(M.summaryState(get('pain-engine')),'needs-summary');assert.match(get('pain-engine').summary,/Empower.*no model.*at least one/);
});
test('core target modes retain counts, exclusions, phase gates, charge history and selection limits',()=>{
 assert.match(get('dark-harvest-realspace-raiders').targetText,/Mode A: Up to 2.*Wracks.* OR Mode B: One.*Drukhari/);
 assert.match(get('raid-and-fade-realspace-raiders').targetText,/Mode A: Up to 2.*Kabalite Warriors.*not \(engaged\).* OR Mode B: One.*excluding Aircraft or Scourges/);
 assert.match(get('deadly-debut-spectacle-of-spite').targetText,/made a Charge move this turn.*not \(selected to fight this phase\)/);assert.match(get('skyborne-annihilation-skysplinter-assault').targetText,/not \(selected to shoot this phase\).*disembarked this turn/);
 assert.match(get('prioritised-victim-kabalite-agonysts').targetText,/Blades for Hire or Kabal/);
 for(const row of after.filter(r=>r.kind==='rule'&&r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(r=>r.id===row.data.id);assert.ok(core);assert.deepEqual(row.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.ok(row.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('source conflicts remain visible instead of silently selecting a preferred source version',()=>{
 const changed=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id);return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],row.data.importSource.record[k]));}).map(r=>r.data.id).sort();
 assert.deepEqual(changed,['combat-drugs','experimental-enhancements-coven-of-agonies-wracks','soul-trap'].map(id=>id+'-drukhari').sort());
 for(const id of ['combat-drugs','experimental-enhancements-coven-of-agonies-wracks','soul-trap']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/pinned/);}
 assert.match(get('lithe-agility').summary,/simultaneously.*impossible/);assert.match(get('nowhere-to-run').summary,/Razorwing rather than the selected enemy/);assert.match(get('towering-arrogance-kabalite-agonysts').summary,/worsens.*leading/);
});
test('concurrent edits, missing/added rows and an already-created missing datasheet reject the repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='My saved wording',r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop(),r=>r.push(result.changes.find(x=>x.kind==='unit'))]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 62 unresolved records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Drukhari',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);
 const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,62);for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('restored units and audited abilities work in the real guide and detachment-filtered timeline',()=>{
 C.apply(after);const all=T.build(after,{faction:'Drukhari'});assert.equal(all.index.filter(r=>r.kind==='rule'&&r.faction!=='*').length,164);assert.equal(all.index.filter(r=>r.kind==='unit').length,27);
 const state={phase:4,turn:'you',round:1,firstPlayer:'you',army:{faction:'Drukhari',detachments:['Coven of Agonies'],units:[{id:'new-wracks',name:'Coven of Agonies Wracks',models:5,details:[]}]}};
 const unit=A.units(state.army)[0],cards=A.stages(state,unit,'fight').flatMap(s=>s.cards);assert.ok(cards.some(c=>c.sourceRuleId==='experimental-enhancements-coven-of-agonies-wracks-drukhari'));
 const filtered=T.build(after,{faction:'Drukhari',detachment:'Coven of Agonies'});assert.ok(filtered.index.some(r=>r.key==='rule:agonising-onslaught-coven-of-agonies-drukhari'));assert.ok(!filtered.index.some(r=>r.key==='rule:dark-harvest-realspace-raiders-drukhari'));assert.ok(filtered.index.some(r=>r.key==='rule:power-from-pain-drukhari'));
 assert.equal(get('airborne-evasion').window,'after');assert.equal(get('aerialists').window,'end');assert.equal(get('fade-away').turn,'opponent');assert.equal(get('fear-incarnate-xatrophos-nuul').window,'shock');
});
