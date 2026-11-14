const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes,names}=require('../scripts/audit-marines.cjs'),before=require('./fixtures/marines-audit-before.json'),sources=require('./fixtures/marines-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),L=require('../dist/lessons.js'),Q=require('../dist/practice.js'),P=require('../dist/unit-profiles.js');
const result=audit(before),after=result.after,rules=after.filter(r=>r.kind==='rule'),units=after.filter(r=>r.kind==='unit');
const rule=(f,id)=>rules.find(r=>r.faction===f&&r.data.importSource.sourceId===id).data;
test.afterEach(()=>C.reset());
test('all 640 unique source abilities and all eleven chapters have source-bound, short study notes',()=>{
 assert.equal(notes.length,556);assert.equal(new Set(rules.map(r=>r.data.importSource.sourceId)).size,640);
 assert.equal(Object.keys(result.counts).length,12);
 for(const r of rules){C.validate(r);assert.doesNotMatch(r.data.summary,/needs a checked summary|Imported structured mechanics|This rule needs/);assert.ok(r.data.summary.split(/\s+/).length<=75);assert.ok(r.data.targetText);assert.equal(r.data.summaryAudit.sourceHash,require('../scripts/audit-marines.cjs').digest(r.data.importSource.record));}
 for(const [folder,faction] of Object.entries(names)){assert.ok(after.some(r=>r.kind==='faction'&&r.name===faction&&r.data.group==='Space Marines'));for(const raw of sources['enrichment/'+folder+'/abilities.json'])assert.ok(rules.some(r=>r.data.importSource.sourceId===raw.ability_id));}
});
test('chapter units include their own and generic profiles, never another chapter’s datasheets',()=>{
 const expected={'Blood Angels':91,'Dark Angels':94,'Deathwatch':84,'Black Templars':87,'Space Wolves':99,'Ultramarines':82};
 for(const [f,count] of Object.entries(expected))assert.equal(units.filter(r=>r.faction===f).length,count);
 for(const r of units){P.validate(P.read(r.data));assert.ok(P.read(r.data).length);if(r.faction==='Space Marines')continue;const chapters=r.data.importSource.record.faction_keywords.filter(k=>k!=='Adeptus Astartes');assert.ok(!chapters.length||chapters.includes(r.faction));assert.ok(r.data.keywords.includes(r.faction));}
 assert.ok(units.some(r=>r.faction==='Blood Angels'&&r.name==='Commander Dante'));assert.ok(units.some(r=>r.faction==='Dark Angels'&&r.name==='Lion El’Jonson'));
});
test('unit, bodyguard and detachment references stay inside the faction, with core abilities retained',()=>{
 const core=new Set(['leader','deep-strike','stealth','lone-operative','support','deadly-demise','damaged','feel-no-pain','infiltrators','scouts','fights-first','hover','firing-deck']);
 for(const u of units){for(const a of u.data.abilities)assert.ok(core.has(a.id)||rules.some(r=>r.data.id===a.id&&r.faction===u.faction),u.faction+' '+u.name+' '+a.id);for(const id of u.data.bodyguardIds)assert.ok(units.some(r=>r.data.id===id&&r.faction===u.faction));}
 const lancer=units.find(r=>r.faction==='Blood Angels'&&r.name==='Gladiator Lancer');assert.ok(lancer.data.abilities.some(a=>a.id==='aquilon-optics-adeptus-astartes-blood-angels'));assert.ok(!lancer.data.abilities.some(a=>a.id.includes('black-templars')));
 const bt=units.find(r=>r.faction==='Black Templars'&&r.name==='Gladiator Lancer');assert.ok(bt.data.abilities.some(a=>a.id==='aquilon-optics-black-templars-black-templars'));assert.equal(bt.data.abilities.filter(a=>a.id.startsWith('aquilon-optics')).length,1);
 for(const d of after.filter(r=>r.kind==='detachment'))for(const id of d.data.rules)assert.ok(rules.some(r=>r.data.id===id&&r.faction===d.faction),d.faction+' '+d.name+' '+id);
});
test('shared core-only records obtain the matching mechanics, and stratagem restrictions and CP costs survive',()=>{
 const adaptive=rule('Blood Angels','adaptive-strategy-gladius-task-force-adeptus-astartes');assert.match(adaptive.summary,/Combat Doctrine/);assert.deepEqual(adaptive.phase,[0]);assert.equal(adaptive.turn,'you');assert.match(adaptive.targetText,/Adeptus Astartes/);assert.match(adaptive.conditions.join(' '),/1CP/);assert.equal(M.summaryState(adaptive),'available');
 const head=rule('Space Marines','headhunter-doctrine-ironstorm-spearhead-adeptus-astartes');assert.match(head.targetText,/excluding Dedicated Transport or Fly or Walker/i);
});
test('shared shooter support is early and model-only Fights First never becomes a unit-wide flag',()=>{
 const h=rule('Space Marines','hailstrike-adeptus-astartes');assert.equal(h.window,'after');assert.deepEqual(h.phase,[2]);assert.equal(h.guide.order,'early');assert.match(h.summary,/Friendly ADEPTUS ASTARTES/);
 assert.deepEqual(rule('Space Marines','tempormortis-adeptus-astartes').guide.flags,['Fights First']);
 const umbral=rule('Raven Guard','umbral-raptor-shadowmark-talon-raven-guard');assert.deepEqual(umbral.guide.flags,['Bearer: Fights First']);assert.ok(units.every(r=>r.data.fightsFirst!=='yes'));
});
test('saved source corrections stay distinct from the pinned source and original records remain untouched',()=>{
 assert.equal(rule('Blood Angels','angelic-executioner-encarmine-speartip-blood-angels').mechanicsPresentation,'structured');assert.match(rule('Blood Angels','shadow-of-abomination-encarmine-speartip-blood-angels').summary,/for the phase/);
 assert.equal(rule('Space Marines','martial-paragon-tacticus-attack-force-adeptus-astartes').mechanicsPresentation,'needs-summary');
 for(const old of before){const r=after.find(r=>r.key===old.key);assert.equal(r.revision,old.revision);assert.equal(r.enabled,old.enabled);assert.deepEqual(r.data.importSource,old.data.importSource);if(r.kind==='rule'){assert.equal(r.data.referenceOnly,old.data.referenceOnly);assert.equal(r.data.status,old.data.status);}if(r.kind==='unit')assert.deepEqual(P.read(r.data),P.read(old.data));}
 for(const patch of [{summary:'My rule text'},{phase:[3]},{guide:{order:'early'}},{importSource:{record:{effect:{type:'changed'}}}}]){const changed=structuredClone(before);Object.assign(changed.find(r=>r.kind==='rule').data,patch);assert.throws(()=>audit(changed),/Entry changed/);}
 const unrelated={key:'unit:unrelated',kind:'unit',faction:'Other',name:'Other',data:{id:'unrelated'}};assert.deepEqual(audit([...before,unrelated]).after.find(r=>r.key===unrelated.key),unrelated);
});
test('all factions have faction-scoped rule, stat and unit quiz material; unresolved effects never become answers',()=>{
 C.apply(after);
 for(const faction of Object.values(names)){const bank=Q.buildBank({faction,rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});for(const k of ['rules','stats','abilities','units'])assert.ok(bank.counts[k]>0,faction+' '+k);for(const q of bank.questions){assert.equal(q.faction,faction);assert.ok(q.options.every(o=>o.faction===faction));if(q.review.rule)assert.equal(M.summaryState(q.review.rule),'available');}}
});
