const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest,reviewedEffectDifferences}=require('../scripts/audit-chaos-knights.cjs'),before=require('./fixtures/chaos-knights-audit-before.json'),sources=require('./fixtures/chaos-knights-audit-sources.json');
const imperial=require('./fixtures/imperial-knights-audit-before.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>updated.get('rule:'+id+'-chaos-knights').data;
const cards=(state,step)=>{const deck=A.flashcards(state,step);return [...deck.shared,...deck.unitCards.flatMap(r=>r.items)];};
const roster=(detachment,names)=>({faction:'Chaos Knights',detachment,units:names.map((name,i)=>({id:'test-'+i,name,models:1,details:[]}))});
const state=(army,phase=0,turn='you')=>({army,phase,turn,round:1,firstPlayer:'you'});
test.afterEach(()=>C.reset());
test('Chaos Knights audit matches 110 abilities, 20 profiles and eight detachments to pinned coverage',()=>{
 assert.equal(result.changes.length,110);assert.deepEqual(result.counts,{structured:56,'needs-summary':54,missing:0});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,20);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),20);
 for(const u of units){P.validate(P.read(u.data));assert.deepEqual(P.read(u.data),P.read({profiles:sources['core-units.json'].find(s=>s.id===u.data.id).profiles}));}assert.equal(after.filter(r=>r.kind==='detachment').length,8);
 assert.equal(before.filter(r=>r.kind==='rule'&&r.data.importSource.record.effect.type==='no-effect').length,0);
});
test('original imports, identities, scopes, hints, reference flags and 29 nonrules are preserved',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);let nonrules=0;
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){nonrules++;assert.deepEqual(row,original);continue;}
  for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);
  for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','id','units','memberships','sharedRuleIds'])assert.deepEqual(row.data[key],original.data[key]);
 }assert.equal(nonrules,29);
});
test('two imported effect variants stay distinct from the pin and retain explicit review explanations',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(r=>!eq(r.data.importSource.record.effect,sources['enrichment-abilities.json'].find(s=>s.ability_id===r.data.id).effect)).map(r=>r.data.id);assert.deepEqual(differences,Object.keys(reviewedEffectDifferences));
 const p=get('pterrorshades-traitoris-lance');assert.equal(p.importSource.record.effect.effect.steps[1].modifier.per,'one-model');assert.match(p.summary,/same results.*one-model.*per-unit.*round limit/);assert.equal(M.summaryState(p),'needs-summary');
 const t=get('titanic-duel-lords-of-dread');assert.deepEqual(t.importSource.record.effect.select.selector.filter.any_of,['MONSTER','VEHICLE']);assert.match(t.summary,/MONSTER or VEHICLE.*full Hit and Wound re-rolls.*TITANIC.*pin selects any enemy.*Imperial \+1/);assert.equal(M.summaryState(t),'needs-summary');
});
test('Harbingers keeps all six options, always-active baseline, selection rounds and version warning',()=>{
 const d=get('harbingers-of-dread');assert.equal(d.units.length,20);assert.match(d.summary,/always active.*9″.*rounds 1, 3 and 5.*two D6/);
 for(const name of ['Despair','Doom','Darkness','Dismay','Delirium','Dominion'])assert.ok(d.summary.includes(name));assert.match(d.summary,/Stealth, not the old Hit penalty.*below-Starting-Strength.*below-Half-strength.*\+3″/);assert.match(d.summary,/odd-round condition.*duplicate\/random-choice/);
 assert.equal(d.window,'round');assert.equal(M.summaryState(d),'needs-summary');assert.match(get('paragons-of-terror').summary,/first battle round.*cannot be randomly/);
});
test('Malefic Surge retains mutually exclusive Fortitude and attack options plus consumption gaps',()=>{
 const d=get('malefic-surge');assert.equal(M.summaryState(d),'needs-summary');assert.match(d.summary,/Leadership test.*D3 mortal.*Empowered.*once.*Unholy Hunger.*3″.*Diabolic Power.*Lethal Hits OR Sustained Hits 1.*Unnatural Fortitude.*5\+ invulnerable save OR Feel No Pain 6\+/);
 assert.match(d.summary,/test targets this-unit rather than selected-unit.*Command-only.*after moving/);
 const options=d.importSource.record.effect.effect.effect.steps[3].effect.options;assert.deepEqual(options.map(o=>o.id),['unholy-hunger','diabolic-power','unnatural-fortitude']);
 assert.match(get('profane-symbiosis-infernal-lance').summary,/end of any phase.*not Empowered.*same unit.*once per battle round.*Command-only/);
 assert.match(get('fleshmetal-fusion-infernal-lance').summary,/Damage-1.*armour-only.*after saves/);
});
test('Mirror, Storm of Darkness and indirect aura transfers do not silently pick a source version',()=>{
 const mirror=get('mirror-of-fates-lords-of-dread');assert.match(mirror.summary,/immediate \+1CP.*12″.*once per turn.*Command Re-roll.*0CP once per battle round.*once-per-battle.*future uses/);assert.equal(M.summaryState(mirror),'needs-summary');
 assert.match(get('storm-of-darkness-traitoris-lance').summary,/Stealth.*melee Hit penalty.*Benefit of Cover.*either turn.*rather than.*cumulative/);
 assert.match(get('masters-of-the-pack').summary,/at least two.*without encoding.*issuing model/);assert.match(get('throne-tyrannicus-helhunt-lance').summary,/one other.*9″.*designation.*recipient/);
 assert.match(get('tyrannical-court').summary,/2 Objective Control.*Once per battle round.*Warlord.*lacks.*truncated/);
});
test('core CP, phases, player turns and multi-target restrictions are retained',()=>{
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.equal(r.data.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
 assert.match(get('flush-the-quarry-helhunt-lance').targetText,/first target: One friendly Chaos Knights \+ Titanic.*second target: Up to 3 friendly War Dog.*6″.*first TITANIC target.*not \(same unit/);
 assert.match(get('dark-sacrifice-iconoclast-fiefdom').targetText,/Damned.*excluding Accursed Cultists.*9″.*CHAOS KNIGHTS/);
 assert.match(get('encircling-pack-houndpack-lance').targetText,/wholly within 12″.*battlefield edge.*not \(engaged\)/);
 assert.match(get('harrying-hounds-houndpack-lance').targetText,/8″.*triggering enemy/);assert.doesNotMatch(get('avenge-the-masters-iconoclast-fiefdom').targetText,/One friendly/);
});
test('bearer gates and upgrades preserve War Dog, Knight Tyrant and Knight Abominant restrictions',()=>{
 for(const [id,tag] of [['snarling-rivalry-upgrade-hunting-warpack','Executioner'],['soul-spoor-auspicator-upgrade-hunting-warpack','Huntsman']]){const d=get(id);assert.equal(d.enhancementUpgrade,true);assert.deepEqual(d.bearerKeywords,[tag]);assert.equal(d.summaryAudit.coreSource.max_targets,3);}
 assert.deepEqual(get('octagram-of-conjuration-helhunt-lance').bearerKeywords,['Knight Abominant']);
 for(const id of ['hate-filled-dominion-bastions-of-tyranny','pterrorshade-rookery-bastions-of-tyranny']){const d=get(id);assert.match(d.targetText,/restricted to Knight Tyrant/);assert.deepEqual(d.bearerRestrictions,[{unit_id:'knight-tyrant',keywords:['Chaos Knights']}]);}
 assert.match(get('veil-of-medrengard-traitoris-lance').summary,/4\+.*ranged.*5\+.*melee/);assert.match(get('rune-cursed-stronghold-bastions-of-tyranny').summary,/Knight Tyrants and mortal wounds/);
});
test('eight Imperial-matching chassis profiles keep their separate Chaos identities and abilities',()=>{
 let shared=0;const bare=p=>{const {name,...stats}=p;return stats;};
 for(const chaos of after.filter(r=>r.kind==='unit')){const other=imperial.find(r=>r.kind==='unit'&&r.name===chaos.name.replace(/^Chaos /,''));if(!other)continue;shared++;assert.deepEqual(P.read(chaos.data).map(bare),P.read(other.data).map(bare));assert.notEqual(chaos.data.id,other.data.id);assert.notDeepEqual(chaos.data.keywords,other.data.keywords);assert.notDeepEqual(chaos.data.abilities,other.data.abilities);}
 assert.equal(shared,8);assert.match(get('dark-fervour').summary,/Assault.*not.*Advance-and-charge/);assert.match(get('offerings-for-the-dark-gods').summary,/Sustained Hits 1.*does not also grant improved AP/);
});
test('auras, rerolls, attack-sequence durations and source-specific target gates stay precise',()=>{
 assert.match(get('consumed-with-hunger').summary,/WAR DOG.*6″.*Hit rolls.*TITANIC or TOWERING/);assert.match(get('taskmaster').summary,/9″.*ranged Hit rolls of 1/);assert.match(get('frenzied-rampage').summary,/9″.*melee Hit rolls of 1/);
 assert.match(get('seething-hatred').summary,/one Hit roll OR one Wound roll.*not one of each/);assert.match(get('beasthide-manifestation-helhunt-lance').summary,/until that attacking unit finishes.*not the whole phase/);
 assert.match(get('animalistic-rage-houndpack-lance').summary,/not been selected.*before Deadly Demise.*only its destroyer.*opponent Shooting/);
 assert.match(get('bastion-of-corruption').summary,/Strategic Reserves.*12″.*not extend/);assert.match(get('stalking-focus-hunting-warpack').summary,/objective.*until that attacker finishes/);
});
test('movement, detection, suppression and shooting conflicts remain visible source-review reminders',()=>{
 for(const id of ['super-heavy-walker','flush-the-quarry-helhunt-lance','trophy-hunter-lords-of-dread']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/after.*(?:move|Consolidation)/);}
 assert.match(get('intimidating-reminder-bastions-of-tyranny').summary,/penalty targets this-unit instead of the selected enemy/);assert.match(get('unleash-balefire-infernal-lance').summary,/not yet selected to shoot.*after shooting/);
 assert.match(get('coursing-thralls-iconoclast-fiefdom').summary,/detection range is not defined/);assert.match(get('vox-howl-houndpack-lance').summary,/friendly WAR DOGS.*Leadership.*without.*friendly recovery.*once-per-phase/);
 assert.match(get('pitiless-focus-bastions-of-tyranny').summary,/only the Movement phase.*persistence into Shooting/);
});
test('actual Guide uses round opening, start/end-of-phase and opponent turn-end windows correctly',()=>{
 C.apply(after);let s=state(roster('Traitoris Lance',['War Dog Brigand']));s.firstPlayer='opponent';s.turn='opponent';assert.ok(cards(s,A.steps(s).find(x=>x.id==='round-start')).some(c=>c.id==='harbingers-of-dread-chaos-knights'));s.turn='you';assert.ok(!A.steps(s).some(x=>x.id==='round-start'));
 s=state(roster('Infernal Lance',['Knight Abominant']),2);assert.ok(cards(s,A.steps(s)[0]).some(c=>c.id==='vortex-terrors-chaos-knights'));assert.ok(!cards(s,A.steps(s)[1]).some(c=>c.id==='vortex-terrors-chaos-knights'));
 s.phase=1;assert.ok(cards(s,A.steps(s).at(-1)).some(c=>c.id==='warp-storms-chaos-knights'));assert.ok(!cards(s,A.steps(s)[0]).some(c=>c.id==='warp-storms-chaos-knights'));
 s=state(roster('Lords of Dread',['Chaos Questoris Knight Magaera']));assert.ok(cards(s,A.steps(s).at(-1)).some(c=>c.id==='repair-auto-simulacra-chaos-knights'));
 s.phase=4;s.turn='opponent';s.army.units[0].details=['Enhancement: Warp-borne Stalker'];assert.ok(cards(s,A.steps(s).find(x=>x.id==='turn-end')).some(c=>c.id==='warp-borne-stalker-lords-of-dread-chaos-knights'));assert.ok(!cards(s,A.steps(s).find(x=>x.id==='fight-end')).some(c=>c.id==='warp-borne-stalker-lords-of-dread-chaos-knights'));
});
test('saved wording, profiles, timing, source effects, revisions and membership changes reject stale repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='Saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 54 unresolved entries are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Chaos Knights',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,54);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('timeline filters detachments and every one of the 110 rules is reachable in real Guide decks',()=>{
 C.apply(after);const all=T.build(after,{faction:'Chaos Knights'});assert.equal(all.index.filter(r=>r.kind==='rule'&&r.faction!=='*').length,110);assert.equal(all.index.filter(r=>r.kind==='unit').length,20);
 const filtered=T.build(after,{faction:'Chaos Knights',detachment:'Houndpack Lance'});assert.ok(filtered.index.some(r=>r.key==='rule:marked-prey-chaos-knights'));assert.ok(!filtered.index.some(r=>r.key==='rule:malefic-surge-chaos-knights'));assert.ok(filtered.index.some(r=>r.key==='rule:harbingers-of-dread-chaos-knights'));
 // Synthetic coverage roster tests reachability, not simultaneous list legality.
 const details=after.filter(r=>r.kind==='rule'&&r.data.enhancement).map(r=>'Enhancement: '+r.data.enhancement),army={faction:'Chaos Knights',detachments:after.filter(r=>r.kind==='detachment').map(r=>r.name),units:after.filter(r=>r.kind==='unit').map(r=>({id:r.data.id,name:r.name,models:1,details}))},seen=new Set();
 for(let phase=0;phase<5;phase++)for(const turn of ['you','opponent']){const s=state(army,phase,turn);for(const step of A.steps(s))for(const c of cards(s,step))seen.add(c.id);}
 for(const r of result.changes)assert.ok(seen.has(r.data.id),'No Guide placement: '+r.data.id);
 const passive=state(roster('Lords of Dread',['War Dog Huntsman','Knight Desecrator']),1,'opponent');assert.ok(A.steps(passive).flatMap(step=>cards(passive,step)).some(c=>c.id==='huntsman-chaos-knights'));
});
