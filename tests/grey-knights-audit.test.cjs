const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes,digest,reviewedDifferences}=require('../scripts/audit-grey-knights.cjs'),before=require('./fixtures/grey-knights-audit-before.json'),sources=require('./fixtures/grey-knights-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),Q=require('../dist/practice.js'),B=require('../dist/list-builder.js'),T=require('../dist/timeline.js');
const result=audit(before),changed=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>changed.get(r.key)||r),get=id=>changed.get('rule:'+id+'-grey-knights').data;
const army=(detachment,names)=>({faction:'Grey Knights',detachment,units:names.map((name,i)=>({id:'u'+i,name,modelCount:5,details:[]}))}),state=(army,phase=0,turn='you')=>({army,phase,turn,round:2,firstPlayer:'you'});
const cards=(s,step)=>{const deck=A.flashcards(s,step);return [...deck.shared,...deck.unitCards.flatMap(c=>c.items)];};
test.afterEach(()=>C.reset());
test('Grey Knights source coverage includes all 134 rules, 30 profiles and 10 detachments',()=>{
 assert.equal(result.changes.length,140);assert.equal(result.changes.filter(r=>r.kind==='unit').length,6);assert.deepEqual(result.counts,{structured:105,'needs-summary':18,missing:11});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const row of result.changes.filter(r=>r.kind==='rule')){C.validate(row);assert.ok(!M.isPlaceholder(row.data.summary));assert.ok(row.data.targetText);assert.equal(row.data.summaryAudit.sourceHash,digest(row.data.importSource.record));assert.equal(row.data.summaryAudit.summaryHash,digest(row.data.summary));}
 assert.equal(after.filter(r=>r.kind==='unit').reduce((n,r)=>n+P.read(r.data).length,0),30);assert.equal(after.filter(r=>r.kind==='detachment').length,10);assert.equal(after.filter(r=>r.kind==='unit'&&r.enabled).length,26);assert.deepEqual(after.filter(r=>r.kind==='unit'&&!r.enabled),before.filter(r=>r.kind==='unit'&&!r.enabled));
});
test('profiles, attachments, sources, original IDs, reference flags and saved wording remain intact',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);
 for(const old of before){const row=after.find(r=>r.key===old.key);if(old.kind!=='rule'){if(row.kind==='unit'){assert.deepEqual({...row,data:{...row.data,modelCounts:old.data.modelCounts}},old);}else assert.deepEqual(row,old);continue;}for(const k of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[k],old[k]);for(const k of ['importSource','status','referenceOnly','units','id','detachment','enhancement'])assert.deepEqual(row.data[k],old.data[k]);}
 for(const id of ['a-threat-ended-argent-assault','channelled-force'])assert.equal(get(id).summary,before.find(r=>r.key==='rule:'+id+'-grey-knights').data.summary);
});
test('four imported variants retain precise source conflicts and fixed source hashes',()=>{
 assert.equal(Object.keys(reviewedDifferences).length,4);
 assert.match(get('armoured-aegis-sanctic-spearhead').summary,/3 lost wounds on one model.*per model.*one-model/);assert.equal(get('armoured-aegis-sanctic-spearhead').importSource.record.effect.modifier.per,'one-model');
 assert.match(get('dauntless-champions').summary,/Strength is lower.*saved duration.*phase.*pin says permanent/);
 assert.match(get('purifying-force-crowes-sanctifiers').summary,/Once per battle for your army.*after charging.*phase.*pin instead says permanent/);
 assert.match(get('radiant-champion-warpbane-task-force').summary,/successful melee Wound.*1 mortal.*pin omits the melee and triggering-model gates/);
 for(const id of Object.keys(reviewedDifferences))assert.equal(M.summaryState(changed.get('rule:'+id).data),'needs-summary');
});
test('teleport rules preserve actual unit pools and distinguish selection, arrival, and source timing gaps',()=>{
 const gate=get('gate-of-infinity');assert.match(gate.summary,/2\/3\/4.*Incursion\/Strike Force\/Onslaught.*Crowe’s Sanctifiers/);assert.equal(M.summaryState(gate),'needs-summary');assert.deepEqual(gate.timings,[{phase:[4],turn:'opponent',window:'end'},{phase:[1],turn:'you',window:'arrivals'}]);
 assert.match(get('gate-of-infinity-crowes-sanctifiers').summary,/not engaged.*next Movement phase.*first battle round.*replaces/);
 assert.match(get('prescient-redeployment').summary,/battle round 2.*unused.*previous opponent.*conflicting/);
 assert.match(get('tome-of-forbidden-ways-brotherhood-strike').summary,/battlefield or in Strategic Reserves.*one selection.*eligibility mismatch/);
 assert.match(get('combat-manifestation-brotherhood-strike').summary,/6″.*prohibits charging.*already been set up.*another setup/);
 assert.match(get('hallowed-beacon-warpbane-task-force').summary,/non-TERMINATOR.*wholly.*Hallowed Ground.*already set up/);assert.match(get('hallowed-beacon-warpbane-task-force').targetText,/excluding Terminator/);
});
test('Hallowed Ground retains territory snapshots, 6-inch Purifier region and conditional attack coverage',()=>{
 const d=get('hallowed-ground');assert.match(d.summary,/re-roll Hit rolls of 1.*PURIFIER SQUAD.*wholly.*any Hit rolls.*melee attacks.*ranged attacks.*can see/s);assert.match(d.summary,/deployment zone.*6″.*No Man’s Land.*half.*start of the phase.*separately/s);
 assert.match(get('paragon-of-sanctity-warpbane-task-force').summary,/Once per battle.*visible.*18″.*selected unit.*phase.*does not extend/);
 assert.match(get('sanctified-kill-zone-warpbane-task-force').targetText,/whole unit is within Hallowed Ground/);assert.match(get('sanctified-kill-zone-warpbane-task-force').summary,/Wound rolls of 1.*PURIFIER SQUAD.*any Wound/);
});
test('the Channelled Force test, model-specific bonuses, dice tables and mortal-wound limits remain precise',()=>{
 assert.match(get('channelled-force').summary,/2D6.*equal to or above.*Sustained Hits 1 or Lethal Hits.*Psychic melee.*phase/);
 assert.match(get('banishing-wave-psychic-brotherhood-strike').summary,/each enemy unit within 12″.*2–5.*1 mortal.*6.*D3/);
 assert.match(get('hammer-aflame').summary,/1 — nothing.*2–3 — 1.*4–5 — D3.*6 — D3\+3/);
 assert.match(get('grind-them-underfoot-hallowed-conclave').summary,/each model.*engaged.*4\+.*maximum of 6/);
 assert.match(get('mandulian-reliquary-warpbane-task-force').summary,/bearer model.*3.*not \+3 for every model/);
 assert.match(get('attuned-onslaught').summary,/PALADIN SQUAD models.*melee.*rest of the turn/);
});
test('core CP costs, player turns, phase sets and strict target conditions are retained',()=>{
 for(const row of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===row.data.id);assert.ok(row.data.conditions.some(c=>c.includes('Stratagem cost: '+core.cp_cost+'CP')));if(row.data.mechanicsPresentation==='missing'){assert.deepEqual(row.data.phase,[]);assert.equal(row.data.window,'prebattle');continue;}assert.deepEqual([...row.data.phase].sort(),core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)).sort());assert.equal(row.data.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');}
 assert.match(get('precognitive-strategies-hallowed-conclave').targetText,/within 8″.*triggering enemy.*not.*engaged/);
 assert.match(get('purgation-pattern-brotherhood-strike').targetText,/set up this turn.*Deep Strike this turn.*not.*selected to shoot/);
 assert.match(get('shadow-of-anarch-banishers').summary,/6″ Normal move, then enters Strategic Reserves.*sequential.*not a choice/);
});
test('enhancement upgrades and bearer eligibility use the core datasheet and keyword gates',()=>{
 C.apply(after);const a=army('Fires of Purgation',['Purgation Squad','Interceptor Squad','Brotherhood Librarian']);const eligible=name=>B.enhancements(a,a.units.find(u=>u.name===name)).map(e=>e.id);
 assert.ok(eligible('Purgation Squad').includes('boons-of-deimos-upgrade-fires-of-purgation-grey-knights'));assert.ok(!eligible('Brotherhood Librarian').includes('boons-of-deimos-upgrade-fires-of-purgation-grey-knights'));
 a.detachment='Immaterial Interdiction';assert.ok(eligible('Interceptor Squad').includes('astral-overlap-upgrade-immaterial-interdiction-grey-knights'));assert.ok(!eligible('Purgation Squad').includes('astral-overlap-upgrade-immaterial-interdiction-grey-knights'));
 assert.deepEqual(get('driven-by-duty-sanctic-spearhead').bearerKeywords,['Grey Knights','Walker']);assert.deepEqual(get('psychic-celerity-argent-assault').bearerKeywords,['Terminator']);
});
test('leading-only benefits do not apply to an unattached character',()=>{
 C.apply(after);const a=army('Brotherhood Strike',['Brotherhood Champion','Strike Squad']),s=state(a,3);assert.ok(!cards(s,A.steps(s).find(x=>x.activationMode==='charge')).some(c=>c.id==='clarion-of-haste-grey-knights'));B.attach(a,'u0','u1');assert.ok(cards(s,A.steps(s).find(x=>x.activationMode==='charge')).some(c=>c.id==='clarion-of-haste-grey-knights'));
 assert.equal(result.changes.filter(r=>r.kind==='rule'&&r.data.leadingUnitRequired).length,6);
});
test('the timeline and Guide use end-of-Command, enemy Fight end, arrival and after-shooting slots',()=>{
 C.apply(after);const s=state(army('Warpbane Task Force',['Strike Squad','Venerable Dreadnought']),0);assert.ok(cards(s,A.steps(s).find(x=>x.window==='end')).some(c=>c.id==='sanctifying-ritual-grey-knights'));assert.ok(!cards(s,A.steps(s).find(x=>x.window==='start')).some(c=>c.id==='sanctifying-ritual-grey-knights'));
 s.phase=2;assert.ok(cards(s,A.steps(s).find(x=>x.activationMode==='shooting')).some(c=>c.id==='guidance-of-the-ancients-grey-knights'));assert.equal(get('guidance-of-the-ancients').guide.order,'early');assert.equal(get('guidance-of-the-ancients').window,'after');
 const timeline=T.build(after,{faction:'Grey Knights',detachment:'Warpbane Task Force'}),p=timeline.phases[4].lanes.find(l=>l.turn==='opponent');assert.ok(p.steps.find(x=>x.id==='fight-end').items.some(x=>x.row.key==='rule:gate-of-infinity-grey-knights'));
 const m=timeline.phases[1].lanes.find(l=>l.turn==='you');assert.ok(m.steps.some(st=>[...st.items,...st.slots.flatMap(x=>x.items)].some(x=>x.row.key==='rule:gate-of-infinity-grey-knights')));
});
test('29 unresolved rules are excluded from practice answers and distractors',()=>{
 C.apply(after);const bad=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(bad.size,29);const bank=Q.buildBank({faction:'Grey Knights',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);for(const q of bank.questions){assert.ok(!bad.has(q.review?.rule?.id));for(const choice of q.options)assert.ok(!bad.has(choice.id));}
 for(const n of notes)assert.equal(M.summaryState(get(n.id.replace(/-grey-knights$/,''))),n.state==='structured'?'available':n.state);
});
test('incomplete event bindings and phase-duration problems keep specific review notes',()=>{
 assert.match(get('force-wave-sanctic-spearhead').summary,/after.*move ends.*not yet selected.*before/);
 assert.match(get('responsive-displacement-immaterial-interdiction').summary,/phase start.*D3\+3.*defender.*movement event/);
 assert.match(get('soul-locked-fires-of-purgation').summary,/Movement phase.*only for that phase.*neither lasts into Shooting.*free shot/);
 assert.match(get('vigilance-of-titan-argent-assault').summary,/12″.*visible.*6″.*does not say whose detection.*Lone Operative/);
 assert.match(get('nemesis-rounds-hallowed-conclave').summary,/Fire Overwatch.*5\+.*resolution/);assert.match(get('precognicient-volleys-upgrade-fires-of-purgation').summary,/Snap Shots/);
});
test('stale summaries, profiles, effects, revisions and changed catalog scope reject repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule').data.summary='Manual edit',r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'new-effect'},r=>r.pop(),r=>r.push({...r[0],key:'new'})]){const rows=structuredClone(before);edit(rows);assert.throws(()=>audit(rows),/changed|Missing/);}
});

test('all source-allowed intermediate squad sizes are selectable without changing profiles or saved armies',()=>{
 for(const name of ['Strike Squad','Interceptor Squad','Purgation Squad','Purifier Squad'])assert.deepEqual(after.find(r=>r.kind==='unit'&&r.name===name).data.modelCounts,[5,6,7,8,9,10]);
 for(const name of ['Paladin Squad','Brotherhood Terminator Squad'])assert.deepEqual(after.find(r=>r.kind==='unit'&&r.name===name).data.modelCounts,[4,5,6,7,8,9,10]);
 for(const row of after.filter(r=>r.kind==='unit')){const old=before.find(r=>r.key===row.key);assert.deepEqual(P.read(row.data),P.read(old.data));assert.deepEqual(row.data.bodyguardIds,old.data.bodyguardIds);}
});
