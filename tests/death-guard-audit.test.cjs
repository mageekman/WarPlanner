const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-death-guard.cjs'),before=require('./fixtures/death-guard-audit-before.json'),sources=require('./fixtures/death-guard-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>after.find(r=>r.key==='rule:'+id+'-death-guard').data;
test.afterEach(()=>C.reset());
test('Death Guard audit covers 160 abilities, 41 units/profiles and ten detachments against the pin',()=>{
 assert.equal(result.changes.length,160);assert.deepEqual(result.counts,{structured:86,'needs-summary':60,missing:14});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,41);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),41);for(const u of units){P.validate(P.read(u.data));const source=sources['core-units.json'].find(s=>s.id===u.data.importSource.sourceId);assert.deepEqual(P.read(u.data),P.read({profiles:source.profiles}));}assert.equal(after.filter(r=>r.kind==='detachment').length,10);
});
test('all imports, memberships, review flags, guide hints, IDs and nonrules remain unchanged',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){assert.deepEqual(row,original);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','id','units'])assert.deepEqual(row.data[key],original.data[key]);}
 for(const id of ['beasts-of-nurgle','chaos-land-raider','chaos-predator-annihilator','chaos-predator-destructor','chaos-rhino','chaos-spawn','defiler','great-unclean-one','helbrute','nurglings','plague-drones','plaguebearers','rotigus']){const u=after.find(r=>r.key==='unit:'+id+'-death-guard');assert.equal(u.data.id,id+'-death-guard');assert.equal(u.data.importSource.sourceId,id);}
});
test('both Nurgle’s Gift variants preserve the three choices, range cap, Toughness effect and distinct scopes',()=>{
 const ordinary=get('nurgles-gift'),maggot=get('nurgles-gift-maggot-lords');assert.equal(ordinary.units.length,30);assert.equal(maggot.units.length,5);assert.equal(maggot.detachment,'Maggot Lords');assert.deepEqual(new Set([...ordinary.units,...maggot.units]).size,35);
 for(const d of [ordinary,maggot]){assert.equal(M.summaryState(d),'needs-summary');assert.match(d.summary,/3″.*6″.*9″.*12″/);assert.match(d.summary,/Declare Battle Formations choose one plague/);assert.match(d.summary,/cover.*ranged.*-1.*melee Hit/);assert.match(d.summary,/Save by 1/);assert.match(d.summary,/worsen Leadership by 1.*Objective Control by 1.*minimum (?:of )?1/);assert.match(d.summary,/lose 1 Toughness/);assert.match(d.summary,/later-round.*leaving-range/);}
 assert.match(get('hypervirulent-strains').summary,/3″.*capped at 12″/);assert.match(get('reverberant-rancidity').summary,/PLAGUE LEGIONS within 7″.*DEATH GUARD.*\+3″.*continued proximity/);
});
test('all 14 empty-effect records stay missing without borrowing similarly named versions',()=>{
 const missing=before.filter(r=>r.kind==='rule'&&r.data.importSource.record.effect.type==='no-effect');assert.equal(missing.length,14);for(const r of missing){const d=updated.get(r.key).data;assert.equal(M.summaryState(d),'missing');assert.match(d.summary,/Missing source mechanics.*no-effect/);}
 assert.equal(M.summaryState(get('deaths-heads-champions-of-contagion')),'missing');assert.equal(M.summaryState(get('deaths-heads')),'available');assert.equal(M.summaryState(get('cornucophagus-champions-of-contagion')),'missing');
});
test('the one imported healing difference remains explicit and original effect is preserved',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id);return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],row.data.importSource.record[k]));}).map(r=>r.data.id);
 assert.deepEqual(differences,['parasitic-woe-reaper-upgrade-contagion-engines-death-guard']);const d=get('parasitic-woe-reaper-upgrade-contagion-engines');assert.equal(M.summaryState(d),'needs-summary');assert.match(d.summary,/D3 wounds to one model.*pinned per-model/);
});
test('core target gates retain Warlord, two Characters, Attached units and unaccompanied reserve Poxwalkers',()=>{
 assert.match(get('plaguesurge-virulent-vectorium').targetText,/One friendly Death Guard model.*your Warlord.*on-battlefield/);assert.match(get('rabid-infusion-champions-of-contagion').targetText,/containing at least two CHARACTER models/);assert.match(get('grotesque-fortitude-champions-of-contagion').targetText,/the attacked unit.*Attached unit/);
 assert.match(get('hidden-amongst-the-dead-shamblerot-vectorium').targetText,/Poxwalkers.*in-strategic-reserves.*not \(an Attached unit\)/);assert.match(get('signal-pox-death-lords-chosen').targetText,/Lord of Virulence model/);assert.match(get('soulrot-flux-contagion-engines').targetText,/engaged with the triggering enemy/);
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.ok(core);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.equal(r.data.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('ordinary/named variants keep leading, afflicted triggers and recovery mechanics distinct',()=>{
 assert.match(get('malicious-calculations').summary,/While this Tallyman leads/);assert.match(get('malicious-calculations-septimol-fulg-maggot-lords-tallyman').summary,/no leading condition/);
 assert.equal(M.summaryState(get('infused-with-the-blessings-of-nurgle')),'needs-summary');assert.match(get('infused-with-the-blessings-of-nurgle-maggot-lords-plague-marines').summary,/After.*shoots.*optionally.*start of your next turn/);assert.equal(M.summaryState(get('infused-with-the-blessings-of-nurgle-maggot-lords-plague-marines')),'available');
 assert.match(get('grotesque-regeneration').summary,/heal to full wounds.*rather than changing the Wounds characteristic/);assert.match(get('silent-bodyguard').summary,/CHARACTER leader models.*Feel No Pain 4\+.*not automatically.*Bodyguard/);assert.match(get('witherbone-pipes-shamblerot-vectorium').summary,/adds 1 to Battle-shock and Leadership rolls.*does not change the Leadership characteristic/);
});
test('Mortarion, Typhus and reaction reminders retain limits and explain unresolved bindings',()=>{
 const d=get('lord-of-the');assert.equal(M.summaryState(d),'needs-summary');assert.match(d.summary,/Once per turn per Mortarion.*5″ Normal move.*2\+.*Ballistic Skill worsened by 1.*shared-use/);
 assert.match(get('eater-plague').summary,/visible enemy within 18″.*lack Lone Operative, be attached, or be within 12″.*1 deals D3.*2–5 deals D6.*6 deals D3\+3/);assert.match(get('host-of-plagues').summary,/3\+.*adding 1.*afflicted/);
 assert.match(get('unholy-resilience').summary,/once per battle per model.*first destruction each battle round/);assert.match(get('undying-spite-death-lords-chosen').summary,/4\+.*after the attacker finishes.*event-subject/);assert.match(get('stinking-mire-mortarions-hammer').summary,/instead of the charging enemy/);
});
test('saved wording, stats/sources/timing, revisions and new/deleted native records reject stale repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='faction').data.name='My saved faction',r=>r.find(x=>x.kind==='rule').data.summary='My saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 74 unresolved Death Guard records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Death Guard',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.studyRules.length>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,74);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('actual guide isolates Nurgle’s Gift versions, places Outbreak at Command end and filters detachments',()=>{
 C.apply(after);const all=T.build(after,{faction:'Death Guard'});assert.equal(all.index.filter(r=>r.kind==='rule'&&r.faction!=='*').length,160);assert.equal(all.index.filter(r=>r.kind==='unit').length,41);
 const filtered=T.build(after,{faction:'Death Guard',detachment:'Virulent Vectorium'});assert.ok(filtered.index.some(r=>r.key==='rule:creeping-blight-virulent-vectorium-death-guard'));assert.ok(!filtered.index.some(r=>r.key==='rule:clutching-corruption-tallyband-summoners-death-guard'));assert.ok(filtered.index.some(r=>r.key==='rule:nurgles-gift-death-guard'));
 const s={phase:0,turn:'you',round:1,firstPlayer:'you',army:{faction:'Death Guard',detachments:['Maggot Lords'],units:[{id:'rhino',name:'Maggot Lords Chaos Rhino',models:1,details:[]}]}};const shared=A.flashcards(s,A.steps(s).find(s=>s.id==='command-abilities')).shared;assert.ok(shared.some(c=>c.id==='nurgles-gift-maggot-lords-death-guard'));assert.ok(!shared.some(c=>c.id==='nurgles-gift-death-guard'));
 const p={...s,army:{faction:'Death Guard',detachments:['Tallyband Summoners'],units:[{id:'plague',name:'Plaguebearers',models:10,details:[]}]}};const cards=A.flashcards(p,A.steps(p).at(-1)).unitCards.flatMap(c=>c.items);assert.ok(cards.some(c=>c.id==='infected-outbreak-death-guard'));
});
