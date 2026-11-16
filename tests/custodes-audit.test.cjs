const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes,digest}=require('../scripts/audit-custodes.cjs'),before=require('./fixtures/custodes-audit-before.json'),sources=require('./fixtures/custodes-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r);
const get=prefix=>result.changes.find(r=>r.data.id===prefix+'-adeptus-custodes')?.data;
test.afterEach(()=>C.reset());
test('all source rules, units and detachments are present and every rule gets a meaningful description',()=>{
 assert.equal(result.changes.length,158);assert.deepEqual(result.counts,{structured:116,'needs-summary':41,missing:1});
 assert.equal(before.filter(r=>r.kind==='unit').length,39);assert.equal(before.filter(r=>r.kind==='detachment').length,16);
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));}
 assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
});
test('original mechanics, source metadata, review status and non-rule data are preserved',()=>{
 const snapshot=structuredClone(before);audit(before);assert.deepEqual(before,snapshot);
 for(const row of after){const old=before.find(r=>r.key===row.key);if(row.kind!=='rule'){assert.deepEqual(row,old);if(row.kind==='unit')P.validate(P.read(row.data));continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],old[key]);
 for(const key of ['id','importSource','status','referenceOnly','units','detachment','enhancement'])assert.deepEqual(row.data[key],old.data[key]);}
});
test('stale text, timing, revision, sources, new rows and removals all reject the repair',()=>{
 for(const mutate of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='My edit',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const changed=structuredClone(before);mutate(changed);assert.throws(()=>audit(changed),/changed|Missing entry/i);}
});
test('core Stratagem targets retain exclusions, event binding, distances and compound eligibility',()=>{
 assert.match(get('impenetrable-bastion-emperors-chosen').targetText,/excluding Monster or Vehicle/);
 assert.match(get('indomitable-guardians-shadowkeepers').targetText,/objective marker.*eligible to fight/);
 assert.match(get('no-escape-shadowkeepers').targetText,/not engaged.*within 6″ of the triggering enemy/);
 assert.match(get('selfless-service-honoured-companions')?.targetText||result.changes.find(r=>r.name==='Selfless Service').data.targetText,/excluding VEHICLE.*OR.*CHARACTER.*OR.*WALKER.*not engaged/);
 assert.match(get('unleash-the-lions-lions-of-the-emperor').targetText,/at least 2 models/);
 for(const row of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(s=>s.id===row.data.id);assert.ok(core);assert.deepEqual(row.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.ok(row.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('stance readiness, weapon scope, defensive comparisons and limits remain explicit',()=>{
 const katah=get('martial-katah').summary;for(const term of ['Conversai','Calistus','Salvus','Dacatarai','Kaptaris','Rendax','clears readiness'])assert.ok(katah.includes(term));
 assert.match(get('aegis-of-the-emperor').summary,/5\+ against mortal/);assert.match(get('daughters-of-the-abyss').summary,/3\+ against psychic.*within 6″.*5\+ against psychic/);
 assert.match(get('slayer-of-tyrants').summary,/Toughness to Toughness/);assert.match(get('moment-shackle').summary,/Once per battle per army.*either.*3\+ invulnerable/);
 assert.match(get('neutronium-cascade-mine').summary,/2\+.*D3.*2D3/);assert.match(get('vengeful-surge').summary,/D6″.*\+2″/);
});
test('conflicting records and the empty detachment remain identifiable and out of practice pools',()=>{
 for(const prefix of ['castellans-mark-guardians-of-the-throne','huntress-eye-null-maiden-vigil','inspirational-exemplar-auric-champions','vigil-unending-lions-of-the-emperor','swift-as-the-eagle-guardians-of-the-throne'])assert.equal(M.summaryState(get(prefix)),'needs-summary',prefix);
 assert.equal(M.summaryState(get('fearless-and-unrelenting')),'missing');C.apply(after);
 const bank=Q.buildBank({faction:'Adeptus Custodes',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);
 const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));for(const q of bank.questions||[])assert.ok(!unavailable.has(q.review?.rule?.id));
});
test('same-name shield and reserve abilities retain their distinct mechanics and datasheet scope',()=>{
 const shields=result.changes.filter(r=>r.name==='Praesidium Shield');assert.equal(shields.length,4);assert.equal(new Set(shields.map(r=>JSON.stringify(r.data.importSource.record.effect))).size,3);
 const wings=result.changes.filter(r=>r.name==='On Gilded Wings');assert.equal(wings.length,2);assert.notDeepEqual(wings[0].data.importSource.record.effect,wings[1].data.importSource.record.effect);assert.notEqual(wings[0].data.summary,wings[1].data.summary);
});
test('timeline and actual unit activations use the audited phase, turn and stable rule links',()=>{
 C.apply(after);const model=T.build(after,{faction:'Adeptus Custodes'});assert.equal(model.index.filter(r=>r.kind==='rule'&&r.faction!=='*').length,158);
 const s={phase:2,turn:'you',round:1,firstPlayer:'you',army:{faction:'Adeptus Custodes',detachments:[],units:[{id:'caladius',name:'Caladius Annihilator Grav‑Tank',models:1,details:[]}]}};
 const unit=A.units(s.army)[0],cards=A.stages(s,unit,'shooting').flatMap(s=>s.cards);assert.ok(cards.some(c=>c.sourceRuleId==='advanced-firepower-adeptus-custodes'));
 assert.ok(!A.stages({...s,phase:4},unit,'fight').flatMap(s=>s.cards).some(c=>c.sourceRuleId==='advanced-firepower-adeptus-custodes'));
 assert.deepEqual(get('advanced-stabilisers-grav-assault-force').phase,[2]);assert.equal(get('take-wing').turn,'opponent');assert.equal(get('take-wing').window,'end');assert.equal(get('from-golden-light').window,'turn-end');
});
