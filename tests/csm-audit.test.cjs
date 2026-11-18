const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes}=require('../scripts/audit-csm.cjs'),before=require('./fixtures/chaos-space-marines-audit-before.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js');
const result=audit(before),after=before.map(r=>result.changes.find(c=>c.key===r.key)||r),native=after.filter(r=>r.kind==='rule'&&r.enabled),get=id=>native.find(r=>r.data.importSource.sourceId===id+'-chaos-space-marines').data;
test.afterEach(()=>C.reset());
test('every CSM entry has a concise rewrite or a specific explanation of absent or conflicting mechanics',()=>{
 assert.equal(native.length,281);assert.deepEqual(result.counts,{structured:231,'needs-summary':28,missing:22});assert.equal(new Set(notes.map(n=>n.id)).size,281);
 for(const r of native){C.validate(r);assert.doesNotMatch(r.data.summary,/needs a checked summary|Imported structured mechanics|This rule needs/);assert.ok(r.data.summary.split(/\s+/).length<76);assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);}
 assert.equal(native.filter(r=>M.summaryState(r.data)==='available').length,231);
});
test('Dark Pacts and Dark Ritual preserve the test, costs, choices, duration and usage limit',()=>{
 const d=get('dark-pacts');for(const part of ['Leadership test','D3 mortal wounds','Lethal Hits or Sustained Hits 1','for the phase'])assert.ok(d.summary.includes(part),part);assert.deepEqual(d.phase,[2,4]);assert.equal(d.window,'select');
 const ritual=get('dark-ritual');for(const part of ['Once per battle','your Command phase','CULT DEMAGOGUE','rest of the turn','charge after Advancing','Hit and Wound'])assert.ok(ritual.summary.includes(part));assert.deepEqual(ritual.phase,[0]);
 assert.match(get('chaos-icon').summary,/Battle-shock.*Leadership/);assert.equal(M.summaryState(get('chaos-icon')),'needs-summary');
});
test('Warmaster and Experimental Augmentations retain choices, beneficiaries and phase boundaries',()=>{
 const warmaster=get('warmaster').summary;for(const part of ['choose one','6″ aura','until your next Command phase','non-DAMNED','INFANTRY or MOUNTED','4+ invulnerable','Leadership and Battle-shock'])assert.ok(warmaster.includes(part),part);
 const aug=get('experimental-augmentations').summary;for(const part of ['choose one','two D6','+1 melee Attack','+2″ Move','melee WS','+1 Toughness','+1 melee Strength','ranged BS','FABIUS BILE','Warlord','re-roll'])assert.ok(aug.includes(part),part);
 assert.equal(get('marks-of-chaos').summary.includes('critical hits'),true);assert.equal(get('marks-of-chaos').summary.includes('critical wounds'),false);
});
test('bearer effects, unit effects, individual re-rolls and resurrection remain distinct',()=>{
 assert.match(get('ascended-daemon').summary,/one Hit roll and one Wound roll/);assert.match(get('mark-of-legend-veterans-of-the-long-war').summary,/one roll, not one of each/);
 assert.match(get('surgeon-acolyte').summary,/Once per turn/);assert.match(get('chance-for-glory').summary,/this model’s melee/);
 const chirurgeon=get('chirurgeon').summary;for(const part of ['first time','end of that phase','2+','all wounds','at least 1″'])assert.ok(chirurgeon.includes(part),part);
 assert.match(get('intoxicating-elixir-pactbound-zealots').summary,/bearer has Feel No Pain 5/);assert.match(get('intoxicating-elixir-pactbound-zealots').summary,/did not fail/);
});
test('stratagem targets include core-file limits rather than guessed army-wide eligibility',()=>{
 assert.match(get('bringers-of-despair-veterans-of-the-long-war').targetText,/excluding DAMNED.*Engaged with the Focus of Hatred/);
 assert.match(get('siegebreaker-strike-warpstrike-champions').targetText,/Up to 2 friendly/);assert.match(get('siegebreaker-strike-warpstrike-champions').targetText,/Deep Strike this turn/);
 assert.match(get('millennia-of-experience-veterans-of-the-long-war').targetText,/within 8″/);assert.match(get('millennia-of-experience-veterans-of-the-long-war').targetText,/unengaged/);
 assert.match(get('ruinous-raid-renegade-raiders').targetText,/Disembarked this turn/);assert.match(get('profane-zeal-pactbound-zealots').targetText,/CHAOS UNDIVIDED/);
 assert.match(get('warpcharged-engines-renegade-raiders').targetText,/MOUNTED or TRANSPORT/);assert.match(get('ruinous-raid-renegade-raiders').conditions.join(' '),/1CP/);
});
test('variants retain their different rules and explicit source conflicts never become quiz answers',()=>{
 assert.equal(M.summaryState(get('unholy-bloodshed')),'available');assert.equal(M.summaryState(get('unholy-bloodshed-zarkans-daemonkin-possessed')),'needs-summary');assert.match(get('unholy-bloodshed-zarkans-daemonkin-possessed').summary,/permanent/);
 assert.match(get('sacrificial-dagger').summary,/all its Wound rolls/);assert.equal(M.summaryState(get('sacrificial-dagger-aranis-zarkan')),'needs-summary');
 assert.match(get('iron-fortitude').summary,/instead of the attacker/);assert.match(get('scuttling-walker').summary,/after the move ends/);assert.equal(M.summaryState(get('black-crusade-veterans-of-the-long-war')),'missing');
 C.apply(after);const bank=Q.buildBank({faction:'Chaos Space Marines',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(bank.studyRules.length>44);assert.ok(bank.counts.stats>0);for(const q of bank.questions){assert.equal(q.faction,'Chaos Space Marines');if(q.review.rule)assert.equal(M.summaryState(q.review.rule),'available');assert.ok(q.options.every(o=>o.faction==='Chaos Space Marines'));}
});
test('all foreign copies are disabled, original source and catalog settings remain immutable, and edits fail closed',()=>{
 assert.equal(result.disabled.length,94);const original=JSON.stringify(before);audit(before);assert.equal(JSON.stringify(before),original);
 for(const row of after){const old=before.find(r=>r.key===row.key);if(row.kind!=='rule')assert.deepEqual(row,old);else{assert.equal(row.key,old.key);assert.deepEqual(row.data.importSource,old.data.importSource);assert.equal(row.data.referenceOnly,old.data.referenceOnly);assert.equal(row.data.status,old.data.status);}}
 for(const patch of [{summary:'My checked text'},{phase:[3]},{guide:{order:'early'}},{importSource:{record:{effect:{type:'changed'}}}}]){const changed=structuredClone(before),r=changed.find(r=>r.kind==='rule');Object.assign(r.data,patch);assert.throws(()=>audit(changed),/Entry changed/);}
});
test('guide exposes Dark Pacts at shooter activations and preserves early support and actual setup windows',()=>{
 C.apply(after);const army={name:'CSM audit roster',faction:'Chaos Space Marines',detachment:'Fellhammer Siege-host',detachments:['Fellhammer Siege-host'],units:[{id:'legionaries',name:'Legionaries',role:'unit',count:10,details:[]} ]},state={army,phase:2,turn:'you',firstPlayer:'you'},step=A.steps(state).find(s=>s.activationMode==='shooting'),deck=A.flashcards(state,step);assert.ok(JSON.stringify(deck).includes('Dark Pacts'));
 assert.deepEqual(get('spirit-thief').phase,[2]);assert.equal(get('spirit-thief').window,'start');assert.deepEqual(get('sacrificial-dagger').phase,[2,4]);assert.equal(get('warp-tracer-fellhammer-siege-host').guide.order,'early');assert.equal(get('warp-portals').window,'turn-end');assert.deepEqual(get('warp-portals').phase,[4]);
});
