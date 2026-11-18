const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest,reviewedDifferences}=require('../scripts/audit-sororitas.cjs'),before=require('./fixtures/sororitas-audit-before.json'),sources=require('./fixtures/sororitas-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js'),B=require('../dist/list-builder.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>updated.get('rule:'+id+'-adepta-sororitas').data;
const cards=(state,step)=>{const deck=A.flashcards(state,step);return [...deck.shared,...deck.unitCards.flatMap(r=>r.items)];};
const roster=(detachment,names)=>({faction:'Adepta Sororitas',detachment,units:names.map((name,i)=>({id:'test-'+i,name,models:1,details:[]}))});
const state=(army,phase=0,turn='you')=>({army,phase,turn,round:1,firstPlayer:'you'});
test.afterEach(()=>C.reset());
test('Sororitas audit covers 148 rules, 37 units, 46 profiles, nine detachments and 13 attachment maps',()=>{
 assert.equal(result.changes.length,148);assert.deepEqual(result.counts,{structured:69,'needs-summary':75,missing:4});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,37);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),46);
 for(const u of units){P.validate(P.read(u.data));assert.deepEqual(P.read(u.data),P.read({profiles:sources['core-units.json'].find(s=>s.id===u.data.importSource.sourceId).profiles}));assert.deepEqual(u.data.bodyguardIds||[],sources['core-leader-attachments.json'].find(a=>a.leader_id===u.data.importSource.sourceId)?.eligible_bodyguard_ids||[]);}
 assert.equal(after.filter(r=>r.kind==='detachment').length,9);assert.equal(units.filter(r=>r.data.bodyguardIds.length).length,13);
});
test('all imports, IDs, memberships, flags, hints and 47 nonrules are preserved',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);let nonrules=0;
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){nonrules++;assert.deepEqual(row,original);continue;}
  for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);
  for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','id','units','memberships','sharedRuleIds'])assert.deepEqual(row.data[key],original.data[key]);
 }assert.equal(nonrules,47);
 const priest=after.find(r=>r.kind==='unit'&&r.name==='Ministorum Priest');assert.equal(priest.data.id,'ministorum-priest-adepta-sororitas');assert.equal(priest.data.importSource.sourceId,'ministorum-priest');
});
test('all three imported source differences are explicit without rewriting either snapshot',()=>{
 const differences=before.filter(r=>r.kind==='rule').flatMap(r=>{const p=sources['enrichment-abilities.json'].find(s=>s.ability_id===r.data.id);return ['effect','scope'].filter(k=>!eq(r.data.importSource.record[k],p[k])).map(k=>[r.data.id,k]);});assert.deepEqual(differences,Object.entries(reviewedDifferences).flatMap(([id,keys])=>Object.keys(keys).map(k=>[id,k])));
 const e=get('extremis-trigger-word-sanctuary-guardians-arco-flagellants');assert.equal(e.importSource.record.scope.duration,'phase');assert.match(e.summary,/pin says permanent.*broader.*flails-only/);
 const h=get('healing-tears');assert.deepEqual(h.importSource.record.effect.effect.target.model_names,['Geminae Superia']);assert.match(h.summary,/Geminae Superia.*pin returns a generic model.*do not return Celestine/);
 const r=get('rapturous-blows');assert.equal(r.importSource.record.effect.steps[1].trigger.subject,'this-model');assert.match(r.summary,/melee gate missing from the pin.*not conditional on having paid/);
});
test('four empty Sanctuary effects retain unknown timing and do not borrow ordinary rules',()=>{
 const missing=before.filter(r=>r.kind==='rule'&&r.data.importSource.record.effect.type==='no-effect');assert.equal(missing.length,4);
 for(const r of missing){const d=updated.get(r.key).data;assert.equal(M.summaryState(d),'missing');assert.deepEqual(d.phase,[]);assert.match(d.summary,/no-effect.*Do not substitute.*No activation timing/);}
 assert.equal(M.summaryState(get('acts-of-faith-sanctuary-guardians')),'missing');assert.equal(M.summaryState(get('simulacrum-imperialis-sanctuary-guardians')),'missing');assert.equal(M.summaryState(get('simulacrum-imperialis-wargear')),'missing');
});
test('Acts of Faith is a stored-die substitution with incomplete limits and distinct 33/4 scopes',()=>{
 const ordinary=get('acts-of-faith'),special=get('acts-of-faith-sanctuary-guardians');assert.equal(ordinary.units.length,33);assert.equal(special.units.length,4);assert.equal(new Set([...ordinary.units,...special.units]).size,37);
 assert.deepEqual(ordinary.importSource.record.effect.modifier.rolls,['hit','wound','save','advance','charge','desperate-escape','hazard','leadership']);assert.match(ordinary.summary,/stored value.*not an automatic 6.*pool generation.*per-unit\/phase usage.*does not track pool/);assert.equal(M.summaryState(ordinary),'needs-summary');
 assert.match(get('sacred-rites').summary,/set to two.*period is unspecified/);assert.match(get('triptych-of-the-macharian-crusade-army-of-faith').summary,/saving throw.*any Act of Faith.*binding/);
 C.apply(after);const s=state(roster('Sanctuary Guardians',['Sanctuary Guardians Battle Sisters Squad']));const visible=A.steps(s).flatMap(step=>cards(s,step));assert.ok(!visible.some(c=>c.id==='acts-of-faith-adepta-sororitas'));
});
test('ordinary, Retributor and Sanctuary Cherub limits remain distinct',()=>{
 const one=get('cherub'),two=get('cherubs'),sanctuary=get('cherub-sanctuary-guardians-battle-sisters-squad');assert.equal(one.importSource.record.usage.count,1);assert.equal(two.importSource.record.usage.count,2);assert.equal(sanctuary.importSource.record.usage,undefined);
 assert.match(one.summary,/Once per battle per unit/);assert.match(two.summary,/Twice per battle per Retributor/);assert.match(sanctuary.summary,/name but no usage limit/);
 assert.deepEqual(one.units,['Sanctifiers','Dominion Squad','Battle Sisters Squad']);assert.deepEqual(two.units,['Retributor Squad']);assert.deepEqual(sanctuary.units,['Sanctuary Guardians Battle Sisters Squad']);
});
test('actual builder enforces named bearer alternatives, non-Penitent sermons and Sanctuary scope',()=>{
 C.apply(after);const army=roster('', ['Canoness','Canoness with Jump Pack','Palatine','Ministorum Priest','Hospitaller','Sanctuary Canoness Adalya','Sanctuary Guardians Battle Sisters Squad','Battle Sisters Squad']);army.detachments=after.filter(r=>r.kind==='detachment').map(r=>r.name);
 const eligible=name=>B.enhancements(army,army.units.find(u=>u.name===name)).map(e=>e.id);
 for(const name of ['Canoness','Canoness with Jump Pack','Palatine'])for(const id of ['catechism-of-divine-penitence-penitent-host','iron-surplice-of-saint-istalela-bringers-of-flame','litanies-of-faith-army-of-faith','mantle-of-ophelia-hallowed-martyrs'])assert.ok(eligible(name).includes(id+'-adepta-sororitas'),name+' / '+id);
 assert.ok(eligible('Ministorum Priest').includes('catechism-of-divine-penitence-penitent-host-adepta-sororitas'));assert.ok(!eligible('Ministorum Priest').includes('hagiomnifex-upgrade-sanctified-orators-adepta-sororitas'));
 for(const id of ['catechism-of-divine-penitence-penitent-host','iron-surplice-of-saint-istalela-bringers-of-flame','litanies-of-faith-army-of-faith','mantle-of-ophelia-hallowed-martyrs'])assert.ok(!eligible('Hospitaller').includes(id+'-adepta-sororitas'));
 assert.ok(eligible('Sanctuary Canoness Adalya').includes('righteous-fervour-sanctuary-guardians-adepta-sororitas'));assert.ok(!eligible('Canoness').includes('righteous-fervour-sanctuary-guardians-adepta-sororitas'));
 assert.ok(eligible('Sanctuary Guardians Battle Sisters Squad').includes('divine-miracle-sanctuary-guardians-adepta-sororitas'));assert.ok(!eligible('Battle Sisters Squad').includes('divine-miracle-sanctuary-guardians-adepta-sororitas'));
});
test('actual Guide preserves equipment gates for rods, banner, sarcophagus and simulacrum',()=>{
 C.apply(after);const army=roster('Army of Faith',['Canoness','Mortifiers','Zephyrim Squad','Battle Sisters Squad']);
 const ids=s=>new Set(A.steps(s).flatMap(step=>cards(s,step).map(c=>c.id)));
 let s=state(army,2);assert.ok(!ids(s).has('null-rod-adepta-sororitas'));assert.ok(!ids(s).has('rod-of-office-adepta-sororitas'));
 army.units[0].details=['Null rod','Rod of office'];assert.ok(ids(s).has('null-rod-adepta-sororitas'));assert.ok(ids(s).has('rod-of-office-adepta-sororitas'));
 s.phase=1;assert.ok(!ids(s).has('anchorite-sarcophagus-adepta-sororitas'));assert.ok(!ids(s).has('sacred-banner-adepta-sororitas'));army.units[1].details=['Anchorite sarcophagus'];army.units[2].details=['Sacred banner'];assert.ok(ids(s).has('anchorite-sarcophagus-adepta-sororitas'));assert.ok(ids(s).has('sacred-banner-adepta-sororitas'));
 s.phase=0;assert.ok(!ids(s).has('simulacrum-imperialis-adepta-sororitas'));army.units[3].details=['Simulacrum Imperialis'];assert.ok(ids(s).has('simulacrum-imperialis-adepta-sororitas'));
 for(const id of ['null-rod','rod-of-office','anchorite-sarcophagus','sacred-banner','simulacrum-imperialis'])assert.ok(get(id).conditions.some(c=>c.startsWith('Equipment gate:')));
});
test('Relics keeps all six menus, up-to-two choices, 6-inch ranges and damaged selection warning',()=>{
 const d=get('relics-of-the-matriarchs');assert.equal(d.window,'round');const options=d.importSource.record.effect.effect.options;assert.equal(options.length,6);assert.equal(d.importSource.record.effect.effect.max_choices,2);assert.equal(d.importSource.record.effect.effect.min_choices,0);
 for(const name of ['Fiery Heart','Censer of the Sacred Rose','Ebon Chalice','Argent Shroud','Valorous Heart','Bloody Rose'])assert.ok(d.summary.includes(name));assert.match(d.summary,/6″.*\+2″ Move.*Battle-shock.*uses to two.*Wound re-rolls of 1.*Feel No Pain 6\+.*\+1 melee AP/);assert.match(get('damaged-1-6-wounds-remaining').summary,/1–6.*halve.*selections to one.*rounding/);
});
test('Righteous and Penitent menus retain missing tags, option history and conditional escalations',()=>{
 assert.match(get('righteous-purpose').summary,/up to three.*next Command.*no Righteous designation.*turn rather than next Command/);assert.match(get('desperate-for-redemption').summary,/Path of the Penitent.*Absolution in Battle.*Death Before Disgrace.*2\+.*exhaustion/);
 assert.match(get('boundless-zeal-penitent-host').summary,/non-PENITENT.*OR.*PENITENT.*both.*both permissions to both/);
 assert.match(get('mark-of-devotion-champions-of-faith').summary,/1 attack.*2 extra attacks.*1 Damage.*not \+3/);assert.match(get('indefatigable-dedication-champions-of-faith').summary,/may shoot.*Righteous.*both shoot and declare a charge/);
 assert.match(get('shield-of-denial-champions-of-faith').summary,/6\+.*5\+ if Righteous.*Ordinary damage is not covered/);
});
test('resurrection, healing and Sanctuary source gaps preserve exact model and spend restrictions',()=>{
 assert.match(get('divine-intervention-hallowed-martyrs').summary,/other than Saint Celestine.*1–3 Miracle dice.*unengaged, unattached.*D3 wounds plus one per die.*only once per battle.*unbounded/);
 assert.match(get('miraculous-intervention').summary,/first time Celestine.*end of that phase.*2\+.*full wounds.*destroyed Celestine.*distinct from Healing Tears/);
 assert.match(get('lifewards').summary,/GEMINAE SUPERIA.*4\+.*does not bind this-model/);assert.match(get('salvationist-medikit').summary,/D3 non-CHARACTER.*frequency.*do not return Characters/);
 assert.match(get('divine-miracle-sanctuary-guardians').summary,/BATTLE SISTERS SQUAD keyword.*absent.*explicit core datasheet restriction/);
});
test('all 39 Stratagems preserve core costs, player gates, OR target modes and exclusions',()=>{
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.equal(r.data.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
 assert.match(get('inspirational-battle-canticles-chorus-of-condemnation').targetText,/Mode A:.*Fly.*Infantry.* OR Mode B:.*Exorcist/);assert.match(get('shield-of-faith-army-of-faith').targetText,/Mode A:.*triggering unit.* OR Mode B:.*Jump Pack.*3″.*receiving mortal damage/);
 assert.match(get('rites-of-fire-bringers-of-flame').targetText,/disembarked this turn.*not \(selected to shoot/);assert.match(get('suffering-and-sacrifice-hallowed-martyrs').targetText,/INFANTRY or WALKER/);assert.match(get('take-cover-sanctuary-guardians').targetText,/excluding ARCO-FLAGELLANTS.*terrain area/);
 assert.equal(M.summaryState(get('take-cover-sanctuary-guardians')),'needs-summary');assert.match(get('take-cover-sanctuary-guardians').summary,/lacks the plain ARCO-FLAGELLANTS keyword/);
});
test('transport, enemy-reaction and automatic-six source conflicts are not silently corrected',()=>{
 assert.match(get('blazing-ire-bringers-of-flame').summary,/disembarking unit.*confirm/i);assert.match(get('righteous-awareness').summary,/event-subject \(the moving enemy\).*not this Dominion/);
 assert.match(get('solemn-procession').summary,/each battle round.*every Miracle-die gain.*recursive/);assert.match(get('stirring-rhetoric').summary,/not bound.*not make every roll an automatic 6/);assert.match(get('chaplet-of-sacrifice-hallowed-martyrs').summary,/re-roll one.*up to three.*extra die.*pool conservation/);
 assert.match(get('rapturous-blows').summary,/not conditional on having paid/);assert.match(get('the-pulpit-of-saint-hollines-basilica').summary,/Stealth normally applies to ranged/);
});
test('actual Guide separates round, Command-start/end, Shooting-start and phase-end returns',()=>{
 C.apply(after);let s=state(roster('Army of Faith',['Triumph of Saint Katherine']));assert.ok(cards(s,A.steps(s).find(x=>x.id==='round-start')).some(c=>c.id==='relics-of-the-matriarchs-adepta-sororitas'));
 s=state(roster('Bringers of Flame',['Junith Eruita','Sororitas Rhino']));const start=cards(s,A.steps(s).find(x=>x.id==='command-start'));assert.ok(start.some(c=>c.id==='fiery-conviction-adepta-sororitas'));assert.ok(start.some(c=>c.id==='self-repair-adepta-sororitas'));assert.ok(!cards(s,A.steps(s).at(-1)).some(c=>c.id==='self-repair-adepta-sororitas'));
 s=state(roster('Army of Faith',['Battle Sisters Squad']));assert.ok(cards(s,A.steps(s).at(-1)).some(c=>c.id==='defenders-of-the-faith-adepta-sororitas'));
 s=state(roster('Bringers of Flame',['Daemonifuge']),2);assert.ok(cards(s,A.steps(s)[0]).some(c=>c.id==='holy-judgement-adepta-sororitas'));
 s=state(roster('Chorus of Condemnation',['Canoness with Jump Pack']),4,'opponent');s.army.units[0].details=['Enhancement: Clarion of Urgency'];assert.ok(cards(s,A.steps(s).find(x=>x.id==='fight-end')).some(c=>c.id==='clarion-of-urgency-chorus-of-condemnation-adepta-sororitas'));assert.ok(!cards(s,A.steps(s).find(x=>x.id==='turn-end')).some(c=>c.id==='clarion-of-urgency-chorus-of-condemnation-adepta-sororitas'));
});
test('same-name Guide entries and model-only protections retain their separate effects',()=>{
 assert.match(get('unflinching-determination').summary,/Dogmata.*Objective Control.*not the Sacred Champions/);assert.match(get('unflinching-determination-sacred-champions').summary,/Advance or Fall Back.*Assault.*exceptions/);
 assert.match(get('divine-guidance').summary,/Adalya.*Hit re-rolls|Canoness Adalya.*Hit re-rolls/);assert.match(get('divine-guidance-army-of-faith').summary,/Improve its AP by 1.*not Adalya/);
 assert.match(get('the-emperors-grace').summary,/Once per battle.*2\+ invulnerable.*bearer-only/);assert.match(get('through-suffering-strength-hallowed-martyrs').summary,/bearer has lost.*not the attached unit/);
});
test('stale saved wording, bearer edits, source changes, profiles and native additions are rejected',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='Saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.find(x=>x.kind==='rule'&&x.data.category==='enhancement').data.bearerRestrictions=[{unit_id:'saved'}],r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 79 unresolved records are excluded from practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Adepta Sororitas',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.studyRules.length>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,79);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('timeline retains 148 rules and actual Guide decks reach all 144 rules with known phase metadata',()=>{
 C.apply(after);const all=T.build(after,{faction:'Adepta Sororitas'});assert.equal(all.index.filter(r=>r.kind==='rule'&&r.faction!=='*').length,148);assert.equal(all.index.filter(r=>r.kind==='unit').length,37);
 const filtered=T.build(after,{faction:'Adepta Sororitas',detachment:'Bringers of Flame'});assert.ok(filtered.index.some(r=>r.key==='rule:fervent-purgation-adepta-sororitas'));assert.ok(!filtered.index.some(r=>r.key==='rule:sacred-rites-adepta-sororitas'));assert.ok(filtered.index.some(r=>r.key==='rule:acts-of-faith-adepta-sororitas'));
 // Synthetic coverage roster tests reachability, not simultaneous list legality.
 const details=[...after.filter(r=>r.kind==='rule'&&r.data.enhancement).map(r=>'Enhancement: '+r.data.enhancement),...new Set(after.filter(r=>r.kind==='unit').flatMap(r=>r.data.abilities.filter(a=>a.wargear).map(a=>a.wargear)))],army={faction:'Adepta Sororitas',detachments:after.filter(r=>r.kind==='detachment').map(r=>r.name),units:after.filter(r=>r.kind==='unit').map(r=>({id:r.data.id,name:r.name,models:1,details}))},seen=new Set();
 for(let phase=0;phase<5;phase++)for(const turn of ['you','opponent']){const s=state(army,phase,turn);for(const step of A.steps(s))for(const c of cards(s,step))seen.add(c.id);}
 const timed=result.changes.filter(r=>r.data.phase.length);assert.equal(timed.length,144);for(const r of timed)assert.ok(seen.has(r.data.id),'No Guide placement: '+r.data.id);
});
