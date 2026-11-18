const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes}=require('../scripts/audit-tyranids.cjs'),before=require('./fixtures/tyranids-audit-before.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js');
const result=audit(before),after=before.map(r=>result.changes.find(c=>c.key===r.key)||r),native=after.filter(r=>r.kind==='rule'&&r.enabled),get=id=>native.find(r=>r.data.importSource.sourceId===id+'-tyranids').data;
test.afterEach(()=>C.reset());
test('all Tyranids rules replace generic prompts with source-bound study summaries or specific source gaps',()=>{
 assert.equal(notes.length,186);assert.equal(new Set(notes.map(n=>n.id)).size,186);assert.deepEqual(result.counts,{structured:147,'needs-summary':26,missing:13});
 for(const r of native){C.validate(r);assert.doesNotMatch(r.data.summary,/needs a checked summary|Imported structured mechanics|Reference reminder:|This rule needs/);assert.ok(r.data.summary.split(/\s+/).length<76);assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);}
 assert.equal(native.filter(r=>M.summaryState(r.data)==='available').length,147);
});
test('Norn purpose and adaptations keep their choices, targets, timing and different benefits',()=>{
 const purpose=get('singular-purpose').summary;for(const part of ['battle round 1','enemy unit','Hit and Wound','objective','Feel No Pain 5+','Objective Control 15','within range'])assert.ok(purpose.includes(part),part);
 const hyper=get('hyper-adaptations').summary;for(const part of ['choose one','Sustained Hits 1','INFANTRY or SWARM','Lethal Hits','MONSTER or VEHICLE','Precision on critical hits','CHARACTER'])assert.ok(hyper.includes(part),part);
 assert.deepEqual(get('hyper-adaptations').phase,[0]);assert.equal(get('hyper-adaptations').window,'round');
 assert.match(get('adaptive-instincts').summary,/\+1 melee Strength or \+1 Toughness/);
});
test('normal and Combat Patrol variants retain different effects, targets and durations',()=>{
 assert.match(get('bio-stimulus').summary,/melee AP/);assert.match(get('bio-stimulus-vardenghast-swarm-psychophage').summary,/Feel No Pain 6/);assert.doesNotMatch(get('bio-stimulus-vardenghast-swarm-psychophage').summary,/melee AP/);
 assert.match(get('disruption-bombardment').summary,/INFANTRY/);assert.match(get('disruption-bombardment').summary,/end of your opponent’s next turn/);assert.match(get('disruption-bombardment-vardenghast-swarm-barbgaunts').summary,/start of your next turn/);
 assert.match(get('floating-death-spore-mines').summary,/2–5 deals 1 mortal wound; 6 deals D3/);assert.match(get('floating-death').summary,/2–5 deals D3 mortal wounds; 6 deals D6/);
});
test('source issues identify the exact missing condition and cannot become quiz answers',()=>{
 assert.match(get('synapse').summary,/SYNAPSE anchor and TYRANIDS restriction/);assert.match(get('shadow-in-the-warp').summary,/origin, activation timing/);assert.match(get('pheromone-trail').summary,/never names the Stratagem/);assert.match(get('death-blow').summary,/destroys the bearer/);assert.match(get('psychic-terror').summary,/unspecified ability/);
 for(const n of notes.filter(n=>n.state!=='structured'))assert.notEqual(M.summaryState(native.find(r=>r.data.id===n.id).data),'available');
 C.apply(after);const bank=Q.buildBank({faction:'Tyranids',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments}),blocked=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.ok(bank.studyRules.length>100);assert.equal(bank.counts.stats,290);for(const q of bank.questions){assert.equal(q.faction,'Tyranids');assert.ok(q.options.every(o=>o.faction==='Tyranids'));assert.ok(!blocked.has(q.review.rule?.id));}
});
test('multi-target stratagems preserve alternative modes, proximity, faction and selected-unit limits',()=>{
 assert.match(get('endless-swarm-invasion-fleet').targetText,/up to two.*Synapse range, or one/);assert.match(get('endless-swarm-invasion-fleet').summary,/D3\+3/);
 const scillia=get('hypersensory-scillia-vanguard-onslaught').targetText;for(const p of ['up to two','or one','unengaged','within 8″'])assert.ok(scillia.includes(p),p);
 assert.match(get('invisible-hunter-vanguard-onslaught').targetText,/more than 3″/);assert.match(get('retreat-below-subterranean-assault').targetText,/one unengaged.*or up to two unengaged/);
 assert.match(get('seeded-broods-vanguard-onslaught').targetText,/Strategic Reserves/);assert.match(get('override-instincts-synaptic-nexus').targetText,/Fall Back move this phase/);assert.match(get('the-smothering-shadow-synaptic-nexus').targetText,/Within 12″/);
});
test('early support shooters retain after-shooting resolution and conditional Fights First stays conditional',()=>{
 for(const id of ['symbiotic-targeting','burning-spray','death-scream']){const r=get(id);assert.equal(r.guide.order,'early');assert.equal(r.window,'after');assert.deepEqual(r.phase,[2]);}
 const defence=get('instinctive-defence-assimilation-swarm');assert.match(defence.summary,/While the bearer is within 6″/);assert.ok(defence.guide.flags.includes('Fights First within 6″ of a HARVESTER'));
 C.apply(after);const army={name:'Tyranids',faction:'Tyranids',detachment:'Invasion Fleet',units:['Termagants','Exocrine','Pyrovores'].map((name,i)=>({id:'u'+i,name,role:'unit',details:[]}))},state={army,phase:2,turn:'you',firstPlayer:'you'},step=A.steps(state).find(s=>s.activationMode==='shooting'),cards=A.flashcards(state,step).unitCards;assert.equal(cards[0].unit.body.name,'Exocrine');assert.equal(cards[1].unit.body.name,'Pyrovores');
 assert.equal(get('winged-swarm').window,'after');assert.deepEqual(get('winged-swarm').phase,[2]);assert.equal(get('death-from-below').window,'turn-end');assert.deepEqual(get('death-from-below').phase,[4]);
});
test('usage limits and distinct beneficiary models survive concise rewrites',()=>{
 assert.match(get('resilient-organism').summary,/Once per battle/);assert.match(get('perfectly-adapted-invasion-fleet').summary,/Choose one roll, not one of each/);
 assert.match(get('harpoon-barbs').summary,/Once per turn/);assert.match(get('hive-defences').summary,/shared use/);assert.match(get('seed-mucolids').summary,/across your army/);
 assert.match(get('guardian-organism').summary,/CHARACTER models leading/);assert.match(get('spirit-leech').summary,/Each model.*D3 lost wounds/);assert.match(get('unstoppable-monster').summary,/each Command phase/);
});
test('stats, disabled foreign copies, sources and original settings are preserved; changed records reject the audit',()=>{
 const original=JSON.stringify(before);audit(before);assert.equal(JSON.stringify(before),original);
 for(const r of after){const old=before.find(b=>b.key===r.key);if(r.kind!=='rule'||!r.enabled)assert.deepEqual(r,old);else{assert.deepEqual(r.data.importSource,old.data.importSource);assert.equal(r.data.status,old.data.status);assert.equal(r.data.referenceOnly,old.data.referenceOnly);}}
 for(const patch of [{summary:'My checked note'},{phase:[3]},{guide:{order:'early'}},{importSource:{record:{effect:{type:'changed'}}}}]){const records=structuredClone(before),r=records.find(r=>r.kind==='rule'&&r.enabled);Object.assign(r.data,patch);assert.throws(()=>audit(records),/Entry changed/);}
});
