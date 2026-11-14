const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),B=require('../dist/list-builder.js'),{sample}=require('../dist/core.js');
const seed=C.seed();
const row=key=>structuredClone(seed.find(r=>r.key===key));
test.afterEach(()=>C.reset());
test('every seeded catalog entry validates and core runtime pages are editable',()=>{
 seed.forEach(C.validate);assert.equal(new Set(seed.map(r=>r.key)).size,seed.length);
 for(const id of ['turn-start','round-start','movement-activations','opponent-shooting-activations','fight-activations'])assert.ok(seed.some(r=>r.key==='step:'+id));
});
test('database rule edits are used by existing unit activations without editing the roster',()=>{
 const changed=row('rule:walker');changed.data.summary='Updated crystalline reminder';changed.data.status='admin-reviewed';
 const original=JSON.stringify(sample);C.apply([changed]);
 const state={army:sample,phase:2,turn:'you',firstPlayer:'you'};
 const deck=A.flashcards(state,A.steps(state)[1]);assert.match(JSON.stringify(deck),/Updated crystalline reminder/);assert.equal(JSON.stringify(sample),original);
 changed.enabled=false;C.apply([changed]);assert.doesNotMatch(JSON.stringify(A.flashcards(state,A.steps(state)[1])),/Crystalline Targeting/);
});
test('new factions, detachments, units and rules work in the builder and guide',()=>{
 const faction={key:'faction:test-chaos',kind:'faction',faction:'',name:'Test Chaos',data:{id:'test-chaos',name:'Test Chaos',group:'Chaos',aliases:[]},enabled:true};
 const det={key:'detachment:test-coven',kind:'detachment',faction:'Test Chaos',name:'Test Coven',data:{id:'test-coven',name:'Test Coven',rules:[],stratagems:[],enhancements:[],dispositions:['Arcane Assault'],gameModes:[]},enabled:true};
 const unit={key:'unit:test-sorcerer',kind:'unit',faction:'Test Chaos',name:'Test Sorcerer',data:{id:'test-sorcerer',name:'Test Sorcerer',keywords:['Character'],abilities:[],bodyguardIds:[],modelCounts:[1]},enabled:true};
 const rule={key:'rule:test-power',kind:'rule',faction:'Test Chaos',name:'Test Power',data:{id:'test-power',name:'Test Power',category:'ability',units:['Test Sorcerer'],phase:[2],turn:'you',window:'act',summary:'Test psychic lesson',conditions:[],sourceIds:['admin'],status:'admin-reviewed',expanded:true},enabled:true};
 C.apply([faction,det,unit,rule]);
 assert.equal(B.search('Sorcerer','Test Chaos').length,1);assert.equal(B.search('Sorcerer','Aeldari').length,0);assert.equal(B.detachments('Test Chaos')[0].name,'Test Coven');
 const army={...B.newArmy(),name:'Coven',faction:'Test Chaos',disposition:'Arcane Assault'};B.setDetachments(army,['Test Coven']);B.add(army,'test-sorcerer','s1');B.commit(army);
 assert.equal(L.matches(rule.data,army),false); // Payload alone has no faction; DB application supplies it.
 const state={army,phase:2,turn:'you',firstPlayer:'you'},deck=A.flashcards(state,A.steps(state)[1]);assert.match(JSON.stringify(deck),/Test psychic lesson/);assert.doesNotMatch(JSON.stringify(deck),/Battle Focus/);
});
test('core-page edits apply to synthesized activation pages and preserve their behavior',()=>{
 const step=row('step:shooting-activations');step.data.title='Edited shooting lesson';step.data.body='Edited instructions';C.apply([step]);
 const state={army:sample,phase:2,turn:'you',firstPlayer:'you'},page=A.steps(state)[1];assert.equal(page.title,'Edited shooting lesson');assert.equal(page.activationMode,'shooting');assert.equal(page.body,'Edited instructions');
});
test('history-safe identity, source URL and malformed payload validation rejects unsafe entries',()=>{
 const changed=row('rule:walker');changed.data.sourceUrl='javascript:alert(1)';assert.throws(()=>C.validate(changed),/https/);
 changed.data.sourceUrl='https://example.com';changed.data.phase=[7];assert.throws(()=>C.validate(changed),/phases/);
 changed.data.phase=[2];changed.key='rule:different';assert.throws(()=>C.validate(changed),/stable ID/);
 const core=row('step:command-start');core.enabled=false;assert.throws(()=>C.validate(core),/remain enabled/);
});
test('disabled rows suppress bundled defaults and can be re-enabled without duplicates',()=>{
 const changed=row('unit:fire-dragons');changed.enabled=false;C.apply([changed]);assert.equal(B.search('Fire Dragons').length,0);changed.enabled=true;C.apply([changed]);assert.equal(B.search('Fire Dragons').length,1);
});
test('non-admin content services refuse writes before contacting the API',async()=>{
 let calls=0;const service=C.create({from(){calls++;throw Error('Unexpected API write')}},'other');assert.equal(service.isAdmin,false);await assert.rejects(()=>service.save(row('rule:walker')),/Administrator/);assert.equal(calls,0);
});
test('database role lookup controls admin capability and updates use revision comparisons',async()=>{
 let payload,revisionFilter;const saved={...row('rule:walker'),revision:2};
 const client={from(table){if(table==='site_admins')return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{user_id:'owner'}})};
 if(table==='rules_catalog')return {select(){return this},order(){return this},range:async()=>({data:[row('rule:walker')]}),update(p){payload=p;return this},eq(k,v){if(k==='revision')revisionFilter=v;return this},maybeSingle:async()=>({data:saved})};}};
 const service=C.create(client,'owner');await service.load();assert.equal(service.isAdmin,true);await service.save(row('rule:walker'));assert.equal(revisionFilter,1);assert.ok(!Object.hasOwn(payload,'updated_by'));assert.equal(service.records[0].revision,2);service.dispose();assert.equal(service.isAdmin,false);await assert.rejects(()=>service.save(saved),/session has ended/);
});
test('a conflicting database update keeps the local entry and reports a useful error',async()=>{
 const client={from(t){return t==='site_admins'?{select(){return this},eq(){return this},maybeSingle:async()=>({data:{user_id:'owner'}})}:{select(){return this},order(){return this},range:async()=>({data:[row('rule:walker')]}),update(){return this},eq(){return this},maybeSingle:async()=>({data:null})};}};
 const service=C.create(client,'owner');await service.load();await assert.rejects(()=>service.save(row('rule:walker')),/another tab/);assert.equal(service.records[0].revision,1);
});
test('edited timing moves a bundled rule to its saved phase window without duplicate activations',()=>{
 const changed=row('rule:walker');Object.assign(changed.data,{adminManaged:true,expanded:true,window:'start'});C.apply([changed]);
 const state={army:sample,phase:2,turn:'you',firstPlayer:'you'},steps=A.steps(state);
 assert.match(JSON.stringify(A.flashcards(state,steps[0])),/Crystalline Targeting/);assert.doesNotMatch(JSON.stringify(A.flashcards(state,steps[1])),/Crystalline Targeting/);
 changed.data.window='after';C.apply([changed]);const cards=A.flashcards(state,steps[1]).unitCards.flatMap(u=>u.items);assert.equal(cards.filter(a=>a.id==='walker').length,1);
});
test('faction aliases resolve catalog units without leaking units between factions',()=>{
 const faction=row('faction:aeldari');faction.data.aliases.push('Test Alias');C.apply([faction]);assert.ok(B.search('Fire Dragons','Test Alias').length);assert.ok(L.unitInfo('Fire Dragons','Test Alias'));assert.ok(!L.unitInfo('Fire Dragons','Other faction'));
});
test('custom enhancements stay tied to their actual equipped bearer',()=>{
 const r={key:'rule:custom-enhancement',kind:'rule',faction:'Aeldari',name:'Custom Sight',data:{id:'custom-enhancement',name:'Custom Sight',category:'enhancement',units:[],phase:[2],turn:'you',window:'act',detachment:'Aspect Host',enhancement:'Custom Sight',summary:'Bearer study reminder',conditions:[],sourceIds:['admin'],expanded:true,bearerKeywords:['Character']},enabled:true};
 C.apply([r]);const army=structuredClone(sample),autarch=army.units.find(u=>u.name==='Autarch');assert.ok(B.enhancements(army,autarch).some(e=>e.id==='custom-enhancement'));B.setEnhancement(army,autarch.id,'custom-enhancement');assert.ok(L.enhancementEquipped(L.abilities.find(a=>a.id==='custom-enhancement'),autarch,army));assert.equal(L.enhancementEquipped(L.abilities.find(a=>a.id==='custom-enhancement'),army.units.find(u=>u.name==='Fire Dragons'),army),false);
});
test('applying the database catalog retains equipment-specific source restrictions',()=>{
 C.apply(C.seed());const scorpions=L.unitInfo('Striking Scorpions');assert.equal(scorpions.abilities.find(a=>a.id==='aspect-shrine-token-aeldari').wargear,'aspect-shrine-token');
});
test('workshop reference filters include untimed and disabled reference entries without hiding other content types',()=>{
 const records=C.seed(),references=C.filterRecords(records,{reference:'reference'}),other=C.filterRecords(records,{reference:'other'}),all=C.filterRecords(records);assert.ok(references.length>0);assert.ok(references.every(r=>r.kind==='rule'&&r.data.referenceOnly===true));assert.ok(other.every(r=>r.kind==='rule'&&!r.data.referenceOnly));assert.equal(references.length+other.length,all.length);assert.ok(references.some(r=>r.data.phase.length===0));
 const entry=structuredClone(references[0]);entry.enabled=false;assert.equal(C.filterRecords([entry],{reference:'reference'}).length,1);assert.ok(C.filterRecords(records,{kind:'unit',reference:'reference'}).length>0);assert.ok(C.filterRecords(records,{reference:'reference',query:references[0].name}).some(r=>r.key===references[0].key));
});
