const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-astra.cjs'),before=require('./fixtures/astra-audit-before.json'),sources=require('./fixtures/astra-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>after.find(r=>r.key==='rule:'+id+'-astra-militarum').data;
test.afterEach(()=>C.reset());
test('Astra audit covers 251 abilities, 75 units, 84 profiles and 12 detachments',()=>{
 assert.equal(result.changes.length,251);assert.deepEqual(result.counts,{structured:132,'needs-summary':105,missing:14});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,75);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),84);for(const u of units){P.validate(P.read(u.data));const source=sources['core-units.json'].find(s=>s.id===u.data.importSource.sourceId);assert.deepEqual(P.read(u.data),P.read({profiles:source.profiles}));}assert.equal(after.filter(r=>r.kind==='detachment').length,12);
});
test('saved Astra faction edit, Enginseer identity, nonrules and original rule memberships survive',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){assert.deepEqual(row,original);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','units','id'])assert.deepEqual(row.data[key],original.data[key]);}
 const faction=after.find(r=>r.kind==='faction');assert.equal(faction.revision,2);assert.equal(faction.name,'Astra Militarum');
 const enginseer=after.find(r=>r.key==='unit:tech-priest-enginseer-astra-militarum');assert.equal(enginseer.data.importSource.sourceId,'tech-priest-enginseer');assert.equal(enginseer.data.id,'tech-priest-enginseer-astra-militarum');
});
test('Voice of Command retains all six benefits, limits and explicit source timing ambiguity',()=>{
 const d=get('voice-of-command');for(const phrase of ['Default range is 6″','per-battle-round allowance','Battle-shocked','One Order','next Command phase','+3″ Move','improve melee Weapon Skill by 1','improve ranged Ballistic Skill by 1','Rapid Fire','never better than 3+','improve Leadership by 1 and add 1 Objective Control'])assert.ok(d.summary.includes(phrase),phrase);
 assert.match(d.summary,/issuing OFFICER disembarked.*Source review.*does not bind.*phase-start/);assert.equal(M.summaryState(d),'needs-summary');assert.deepEqual(d.phase,[0]);assert.equal(d.window,'act');
 assert.match(get('orders-lord-solar-leontus').summary,/three Orders per battle round.*REGIMENT, SQUADRON or TITANIC/);assert.match(get('orders-leman-russ-commander').summary,/two Orders per battle round to SQUADRON/);assert.match(get('orders-commissar').summary,/one Order per battle round.*only Duty and Honour or Fix Bayonets/);assert.match(get('orders-commissar-graves').summary,/REGIMENT or SQUADRON.*Move! Move! Move!/);
});
test('all 14 empty mechanics remain missing without borrowing similarly named variants',()=>{
 const missing=before.filter(r=>r.kind==='rule'&&r.data.importSource.record.effect.type==='no-effect');assert.equal(missing.length,14);
 for(const r of missing){const d=updated.get(r.key).data;assert.equal(M.summaryState(d),'missing');assert.match(d.summary,/Missing source mechanics.*no-effect/);}
 assert.equal(M.summaryState(get('loyal-protector-ogryn-bodyguard')),'missing');assert.equal(M.summaryState(get('loyal-protector')),'available');assert.match(get('reinforcements-combined-arms').summary,/replacement unit, exclusions.*usage limit/);
});
test('Stratagem targets preserve distinct Regiment and Squadron, active Orders and selection counts',()=>{
 assert.match(get('fields-of-fire-combined-arms').targetText,/first target: One friendly Regiment.*not \(selected to shoot.*second target: One friendly Squadron.*not \(same unit as first target\)/);
 assert.match(get('flexible-command-combined-arms').targetText,/One or more friendly Astra Militarum \+ Officer units/);assert.match(get('mordian-minute-grizzled-company').targetText,/affected by FIRST RANK, FIRE! SECOND RANK, FIRE/);assert.match(get('no-retreat-grizzled-company').targetText,/affected by DUTY AND HONOUR/);
 assert.match(get('final-hour-hammer-of-the-emperor').targetText,/excluding Officer.*below Half-strength/);assert.match(get('burst-of-speed-armoured-infantry').targetText,/Remained Stationary this turn.*set up from Strategic Reserves this phase/);assert.match(get('rapid-dispersal-mechanised-assault').targetText,/disembarked this phase/);
});
test('all core Stratagem costs, phase gates and turn metadata drive audited reminders',()=>{
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.ok(core);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.equal(r.data.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
 assert.deepEqual(get('inspired-command-combined-arms').phase,[0]);assert.equal(get('inspired-command-combined-arms').turn,'opponent');
});
test('three differing imported snapshots, wrong-side and conflicting duration rules stay flagged',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id);return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],row.data.importSource.record[k]));}).map(r=>r.data.id).sort();
 assert.deepEqual(differences,['called-shots','ceaseless-cannonade','fire-zone-purge'].map(id=>id+'-astra-militarum').sort());for(const id of ['called-shots','ceaseless-cannonade','fire-zone-purge']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/pin/);}
 assert.match(get('masters-of-camouflage').summary,/Stealth.*instead describes \+1 Save/);assert.match(get('trench-fighters-siege-regiment').summary,/triggering enemy rather than the defending unit/);assert.match(get('tanglefoot-grenades-recon-element').summary,/rather than the charging enemy/);assert.match(get('move-out-mechanised-assault').summary,/Fight phase.*end of their turn/);
});
test('defensive and explosive abilities preserve per-model/per-unit uses, thresholds and distinct versions',()=>{
 assert.match(get('ablative-plating').summary,/Once per battle per model.*Damage to 0/);assert.match(get('melta-mine').summary,/Once per battle per unit.*3″.*2\+.*D3.*2D3/);assert.equal(M.summaryState(get('melta-mine-draydens-lance-kasrkin')),'needs-summary');assert.match(get('remote-mine').summary,/Once per battle per unit.*visible enemy within 9″.*3\+.*FORTIFICATION or VEHICLE/);
 assert.match(get('psychic-barrier').summary,/on 1 suffer D3.*2–6.*4\+ invulnerable/);assert.match(get('slabshield').summary,/Wounds characteristic to 4/);assert.match(get('slabshield-ogryn-bodyguard').summary,/Wounds characteristic to 7/);
});
test('saved edits, source/stat drift, revisions and added/deleted records reject the repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='faction').data.name='My saved faction',r=>r.find(x=>x.kind==='rule').data.summary='My saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 119 unresolved Astra records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'astra militarum',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,119);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('Astra guide and timeline use audited Command-end Shock Troops and detachment isolation',()=>{
 C.apply(after);const all=T.build(after,{faction:'astra militarum'});assert.equal(all.index.filter(r=>r.kind==='rule').length,251);assert.equal(all.index.filter(r=>r.kind==='unit').length,75);
 const filtered=T.build(after,{faction:'astra militarum',detachment:'Combined Arms'});assert.ok(filtered.index.some(r=>r.key==='rule:fields-of-fire-combined-arms-astra-militarum'));assert.ok(!filtered.index.some(r=>r.key==='rule:blazing-advance-hammer-of-the-emperor-astra-militarum'));assert.ok(filtered.index.some(r=>r.key==='rule:voice-of-command-astra-militarum'));
 const s={phase:0,turn:'you',round:1,firstPlayer:'you',army:{faction:'astra militarum',detachments:['Combined Arms'],units:[{id:'cadians',name:'Cadian Shock Troops',models:10,details:[]}]}};const cards=A.flashcards(s,A.steps(s).at(-1)).unitCards.flatMap(c=>c.items);assert.ok(cards.some(c=>c.id==='shock-troops-astra-militarum'));
});
