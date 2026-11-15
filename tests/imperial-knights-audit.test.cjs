const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes,digest}=require('../scripts/audit-imperial-knights.cjs'),before=require('./fixtures/imperial-knights-audit-before.json'),sources=require('./fixtures/imperial-knights-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>updated.get('rule:'+id+'-imperial-knights').data;
const cards=(state,step)=>{const deck=A.flashcards(state,step);return [...deck.shared,...deck.unitCards.flatMap(r=>r.items)];};
const roster=(detachment,names)=>({faction:'Imperial Knights',detachment,units:names.map((name,i)=>({id:'test-'+i,name,models:1,details:[]}))});
const state=(army,phase=0,turn='you')=>({army,phase,turn,round:1,firstPlayer:'you'});
test.afterEach(()=>C.reset());
test('Imperial Knights audit matches all 118 rules, 23 profiles and eight detachments to the pin',()=>{
 assert.equal(result.changes.length,118);assert.deepEqual(result.counts,{structured:43,'needs-summary':62,missing:13});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,23);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),23);
 for(const u of units){P.validate(P.read(u.data));assert.deepEqual(P.read(u.data),P.read({profiles:sources['core-units.json'].find(s=>s.id===u.data.id).profiles}));}
 assert.equal(after.filter(r=>r.kind==='detachment').length,8);
});
test('all original imports, memberships, guide hints, flags and the 32 nonrules remain unchanged',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);let nonrules=0;
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){nonrules++;assert.deepEqual(row,original);continue;}
  for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);
  for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','id','units','memberships','sharedRuleIds'])assert.deepEqual(row.data[key],original.data[key]);
 }
 assert.equal(nonrules,32);
});
test('all 13 no-effect records remain missing and five untimed records receive no invented phase',()=>{
 const missing=before.filter(r=>r.kind==='rule'&&r.data.importSource.record.effect.type==='no-effect');assert.equal(missing.length,13);
 for(const r of missing){const d=updated.get(r.key).data;assert.equal(M.summaryState(d),'missing');assert.match(d.summary,/Missing source mechanics.*no-effect/);}
 const untimed=missing.filter(r=>!updated.get(r.key).data.phase.length);assert.equal(untimed.length,5);for(const r of untimed){assert.deepEqual(updated.get(r.key).data.phase,[]);assert.match(updated.get(r.key).data.summary,/No activation timing/);}
 assert.match(get('bondsman').summary,/base selection, range, recipients and duration/);
});
test('same-name Full Tilt and Thin Their Ranks entries preserve distinct mechanics and costs',()=>{
 const free=get('full-tilt-freeblade-company'),valour=get('full-tilt-valourstrike-lance');assert.notEqual(free.id,valour.id);
 assert.equal(M.summaryState(free),'needs-summary');assert.match(free.summary,/fixed 6″.*9″.*ARMIGER or DESTRIER/);assert.match(free.conditions.join(' '),/1CP/);
 assert.equal(M.summaryState(valour),'available');assert.match(valour.summary,/2″.*Move.*2.*Advance/);assert.match(valour.conditions.join(' '),/2CP/);
 assert.equal(M.summaryState(get('thin-their-ranks')),'available');assert.match(get('thin-their-ranks').summary,/neither MONSTER nor VEHICLE/);
 assert.equal(M.summaryState(get('thin-their-ranks-spearhead-at-arms')),'missing');assert.match(get('thin-their-ranks-spearhead-at-arms').summary,/Do not substitute/);
});
test('oath approximations, additional reward limits and the wrong-faction reset are explicit',()=>{
 const code=get('code-chivalric');assert.equal(M.summaryState(code),'needs-summary');assert.equal(code.units.length,22);assert.ok(!code.units.includes('Sir Hekhtur'));
 assert.match(code.summary,/Martial Valour.*Eager for Challenge.*Legacy Unsullied/);assert.match(code.summary,/simultaneous benefits alternatives.*≥0.*Honoured.*2\/3CP/);
 const heroes=get('heroes-of-legend');assert.equal(heroes.window,'turn-start');assert.match(heroes.summary,/exclude previously selected.*persist.*1CP/);
 assert.match(get('valours-reward').summary,/OATH OF MOMENT TARGET.*different faction.*do not reset/);
 for(const id of ['crushing-condemnation-questoris-companions','herald-of-triumph-questoris-companions','pennant-of-silvered-fury-questoris-companions','wyrmslayer-divination-questoris-companions']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/expended|expenditure/);}
});
test('ten Duty abilities retain the unresolved base Bondsman gate',()=>{
 for(const id of ['atrapos-duty','castigators-duty','crusaders-duty','defenders-duty','errants-duty','gallants-duty','lancers-duty','magaeras-duty','paladins-duty','wardens-duty']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/Bondsman/);}
 assert.match(get('knightly-teachings').summary,/three.*12″.*15″.*not already Bondsman-affected.*same rule this turn/);
 assert.match(get('mentors-pride-spearhead-at-arms').summary,/at least two.*same bearer/);assert.match(get('fables-of-nightmare-spearhead-at-arms').summary,/at least two.*same bearer/);
});
test('core CP, phase, player and target gates are retained including edges, multi-targets and S>T',()=>{
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.equal(r.data.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
 assert.match(get('flanking-manoeuvres-freeblade-company').targetText,/9″.*battlefield edge.*not \(engaged\)/);assert.match(get('tactical-foil-valourstrike-lance').targetText,/model.*8″.*triggering enemy/);
 assert.match(get('marshal-the-defence-gate-warden-lance').targetText,/Up to 2.*not \(selected to move/);assert.match(get('survivor-of-strife-freeblade-company').summary,/only when.*Strength exceeds.*Toughness/);
 assert.match(get('titanic-duel-questoris-companions').summary,/MONSTER, TITANIC or WALKER.*OR/);assert.match(get('omnissiahs-grace-questor-forgepact').summary,/mortal wounds.*not.*ordinary damage/);
});
test('Defensive Line dependencies and allied Forgepact binding errors stay in source review',()=>{
 for(const id of ['dauntless-defenders','augury-halo-gate-warden-lance','drive-them-out-gate-warden-lance','lancebreaker-gate-warden-lance','purgations-hand-gate-warden-lance','steadfast-superiority-gate-warden-lance','titanic-bombardment-gate-warden-lance']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/Defensive Line.*(?:undefined|not defined|does not define)/);}
 assert.match(get('cogbound-alliance').summary,/6″.*Ballistic Skill.*3″.*D3.*origin is unbound.*BS sign/);
 assert.match(get('vengeance-of-the-machine-cult-questor-forgepact').summary,/friendly ADEPTUS MECHANICUS.*enemy ownership.*not bound/);
 assert.deepEqual(get('magos-questoris-questor-forgepact').bearerKeywords,['Tech-Priest']);
 for(const id of ['ancestral-overbleed-upgrade-throne-bonded-outriders','gyro-optimised-actuators-upgrade-throne-bonded-outriders']){assert.equal(get(id).enhancementUpgrade,true);assert.deepEqual(get(id).bearerKeywords,['Armiger']);assert.equal(get(id).summaryAudit.coreSource.max_targets,3);}
});
test('movement, suppression and shooting source conflicts retain the actual weapon and victim gates',()=>{
 assert.match(get('super-heavy-walker').summary,/Normal, Advance or Fall Back.*non-TITANIC.*4″.*D6.*1.*after the move/);
 assert.match(get('protection-protocols').summary,/Heroic Intervention.*reduce.*1.*not consume.*not explicitly limited/);
 assert.match(get('suppression-protocols').summary,/Armiger autocannon.*MONSTER and VEHICLE.*victim.*next-turn/);
 assert.match(get('thundershock').summary,/thundercoil harpoon.*6″.*4\+.*D3 mortal.*per-bearer/);
 assert.match(get('thundercharge').summary,/both.*thundershock spear.*bellatus reaper chainsword.*does not require a Charge/);
 assert.match(get('selfless-protector').summary,/4\+.*damage allocation, after saves/);
 assert.match(get('using-sir-hekhtur').summary,/both datasheets.*no distance.*direction is unclear/);
});
test('actual guide places repairs, extra Oaths and Guardian at distinct end/start windows',()=>{
 C.apply(after);
 let s=state(roster('Freeblade Company',['Questoris Knight Magaera']));assert.ok(cards(s,A.steps(s).at(-1)).some(c=>c.id==='repair-auto-simulacra-imperial-knights'));assert.ok(!cards(s,A.steps(s).find(s=>s.id==='command-start')).some(c=>c.id==='repair-auto-simulacra-imperial-knights'));
 s=state(roster('Questoris Companions',['Knight Paladin']));assert.ok(cards(s,A.steps(s).find(s=>s.id==='turn-start')).some(c=>c.id==='heroes-of-legend-imperial-knights'));assert.ok(!cards(s,A.steps(s).find(s=>s.id==='command-start')).some(c=>c.id==='heroes-of-legend-imperial-knights'));
 s=state(roster('Freeblade Company',['Knight Paladin']),4,'opponent');s.army.units[0].details=['Enhancement: Mysterious Guardian'];assert.ok(cards(s,A.steps(s).find(s=>s.id==='turn-end')).some(c=>c.id==='mysterious-guardian-freeblade-company-imperial-knights'));assert.ok(!cards(s,A.steps(s).find(s=>s.id==='fight-end')).some(c=>c.id==='mysterious-guardian-freeblade-company-imperial-knights'));
 s=state(roster('Throne-bonded Outriders',['Knight Paladin']));assert.ok(cards(s,A.steps(s).find(s=>s.id==='command-abilities')).some(c=>c.id==='neural-lash-throne-bonded-outriders-imperial-knights'));
});
test('passive ranged abilities remain visible for legally permitted out-of-phase shooting',()=>{
 C.apply(after);const army=roster('Freeblade Company',['Knight Errant','Knight Warden','Knight Castellan']);
 for(const [phase,turn] of [[2,'you'],[1,'opponent'],[3,'opponent']]){const s=state(army,phase,turn),visible=new Set(A.steps(s).flatMap(step=>cards(s,step).map(c=>c.id)));for(const id of ['aggressive-assault','thin-their-ranks','titan-hunter','ion-aegis'])assert.ok(visible.has(id+'-imperial-knights'),id+' missing in '+phase+' / '+turn);}
});
test('saved wording, stats, timing, source data, revisions and additions/deletions reject stale repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='Saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 75 unresolved records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Imperial Knights',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,75);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('timeline filters all entries while 113 rules with timing are reachable in real guide decks',()=>{
 C.apply(after);const all=T.build(after,{faction:'Imperial Knights'});assert.equal(all.index.filter(r=>r.kind==='rule').length,118);assert.equal(all.index.filter(r=>r.kind==='unit').length,23);
 const filtered=T.build(after,{faction:'Imperial Knights',detachment:'Valourstrike Lance'});assert.ok(filtered.index.some(r=>r.key==='rule:full-tilt-valourstrike-lance-imperial-knights'));assert.ok(!filtered.index.some(r=>r.key==='rule:full-tilt-freeblade-company-imperial-knights'));assert.ok(filtered.index.some(r=>r.key==='rule:code-chivalric-imperial-knights'));
 // Synthetic coverage roster equips every enhancement and includes every detachment;
 // it checks reachability, not list legality or simultaneous legal effects.
 const details=after.filter(r=>r.kind==='rule'&&r.data.enhancement).map(r=>'Enhancement: '+r.data.enhancement),army={faction:'Imperial Knights',detachments:after.filter(r=>r.kind==='detachment').map(r=>r.name),units:after.filter(r=>r.kind==='unit').map(r=>({id:r.data.id,name:r.name,details,models:1}))},seen=new Set();
 for(let phase=0;phase<5;phase++)for(const turn of ['you','opponent']){const s=state(army,phase,turn);for(const step of A.steps(s))for(const c of cards(s,step))seen.add(c.id);}
 const timed=result.changes.filter(r=>r.data.phase.length);assert.equal(timed.length,113);for(const r of timed)assert.ok(seen.has(r.data.id),'No Guide placement: '+r.data.id);
});
