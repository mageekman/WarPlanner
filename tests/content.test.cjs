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
test('catalog loads every page beyond 500 entries without dropping later units or publishing a partial failed reload',async()=>{
 const dataset=Array.from({length:1001},(_,i)=>{const r=row('rule:walker');r.key='rule:paged-'+i;r.data.id='paged-'+i;r.name=r.data.name='Paged rule '+i;return r;}),ranges=[];let fail=false;
 const query={select(){return this},order(){return this},async range(start,end){ranges.push([start,end]);return fail&&start===500?{error:{message:'Second page failed'}}:{data:dataset.slice(start,end+1)};}};
 const service=C.create({from:()=>query},'owner');await service.reload();assert.equal(service.records.length,1001);assert.equal(service.records.at(-1).key,'rule:paged-1000');assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);
 const version=service.version;fail=true;await assert.rejects(service.reload(),/Second page failed/);assert.equal(service.records.length,1001);assert.equal(service.version,version);
 fail=false;await service.reload();assert.equal(service.version,version+1);service.dispose();assert.equal(service.version,version+2);assert.deepEqual(service.records,[]);
});

test('counted catalog pages load with bounded concurrency and preserve order on out-of-order responses',async()=>{
 const data=Array.from({length:2001},(_,i)=>{const r=row('rule:walker');r.key='rule:parallel-'+String(i).padStart(4,'0');r.data.id=r.key.slice(5);return r;}),ranges=[],pending=new Map();let active=0,peak=0,automatic=false,fail=false;
 const client={from:()=>({select(_columns,options){this.count=options.count;return this},order(){return this},async range(start,end){ranges.push(start);if(start===0)return {data:data.slice(0,500),count:data.length};active++;peak=Math.max(peak,active);if(!automatic)await new Promise(resolve=>pending.set(start,resolve));active--;return fail&&start===1000?{error:{message:'Parallel page failed'}}:{data:data.slice(start,end+1)};}})};
 const service=C.create(client,'owner'),loading=service.reload();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(ranges,[0,500,1000,1500]);assert.equal(peak,3);assert.deepEqual(service.records,[]);
 pending.get(1500)();pending.get(500)();pending.get(1000)();await new Promise(resolve=>setImmediate(resolve));assert.equal(ranges.at(-1),2000);pending.get(2000)();await loading;assert.deepEqual(service.records.map(r=>r.key),data.map(r=>r.key));
 const version=service.version;automatic=true;fail=true;await assert.rejects(service.reload(),/Parallel page failed/);assert.equal(service.version,version);assert.deepEqual(service.records.map(r=>r.key),data.map(r=>r.key));
});

test('Space Marines is a supported editable faction group',()=>{const faction={key:'faction:space-marines',kind:'faction',faction:'',name:'Space Marines',enabled:true,data:{id:'space-marines',name:'Space Marines',group:'Space Marines',aliases:['Adeptus Astartes']}};C.validate(faction);C.apply([faction]);assert.equal(B.factions().find(f=>f.name==='Space Marines').group,'Space Marines');faction.data.group='Unknown';assert.throws(()=>C.validate(faction),/Choose Space Marines/);});

test('indexed unit-rule links preserve aliases, faction isolation, ordering and existing references',()=>{
 const faction={key:'faction:index-test',kind:'faction',faction:'',name:'Index Test',enabled:true,data:{id:'index-test',name:'Index Test',group:'Xenos',aliases:['Old Index']}},unit={key:'unit:index-test',kind:'unit',faction:'Index Test',name:'Fire Dragons',enabled:true,data:{id:'index-test',name:'Fire Dragons',keywords:[],abilities:[{id:'native-ref',wargear:'Keep this'}],bodyguardIds:[],modelCounts:[1]}},base=row('rule:walker');
 const extra=[faction,unit,...['First','Second','Disabled'].map((name,i)=>({...structuredClone(base),key:'rule:link-'+i,faction:'Old Index',name,enabled:i!==2,data:{...structuredClone(base.data),id:'link-'+i,name,sourceRuleId:i===0?'source-link':'',units:['FIRE DRAGONS','Fire Dragons']}}))];
 const entries=new Map([...seed,...extra].map(r=>[r.key,r]));C.apply(extra);
 for(const unit of L.catalog.units){const original=entries.get('unit:'+unit.id).data,refs=new Map(original.abilities.map(a=>[a.id,a]));for(const rule of L.abilities)if(rule.id!=='fights-first'&&L.factionMatches(rule.faction,unit.faction)&&rule.units.some(n=>n.toLowerCase().replace(/[^a-z0-9]/g,'')===unit.name.toLowerCase().replace(/[^a-z0-9]/g,''))){const id=rule.sourceRuleId||rule.id;if(!refs.has(id))refs.set(id,{id});}assert.deepEqual(unit.abilities,[...refs.values()],unit.name+' / '+unit.faction);}
 assert.deepEqual(L.catalog.units.find(u=>u.id==='index-test').abilities,[{id:'native-ref',wargear:'Keep this'},{id:'source-link'},{id:'link-1'}]);
});
test('catalog generation advances only on successful applications so practice can invalidate cached material',()=>{
 const version=C.generation;C.apply([]);assert.equal(C.generation,version+1);assert.throws(()=>C.apply([{kind:'bad'}]));assert.equal(C.generation,version+1);
});

test('canonical faction names keep distinct factions isolated even if normalized IDs collide',()=>{
 const rows=[['collision-id','First faction'],['collision_id','Second faction']].flatMap(([id,name],i)=>[{key:'faction:'+id,kind:'faction',faction:'',name,enabled:true,data:{id,name,group:'Xenos',aliases:[]}},{key:'unit:collision-'+i,kind:'unit',faction:name,name:'Parallel Unit',enabled:true,data:{id:'collision-'+i,name:'Parallel Unit',keywords:[],abilities:[],bodyguardIds:[],modelCounts:[1]}}]);const r=row('rule:walker');r.key='rule:isolated';r.faction='Second faction';Object.assign(r.data,{id:'isolated',name:'Isolated',sourceRuleId:'',units:['Parallel Unit']});rows.push(r);C.apply(rows);assert.deepEqual(L.catalog.units.find(u=>u.id==='collision-0').abilities,[]);assert.deepEqual(L.catalog.units.find(u=>u.id==='collision-1').abilities,[{id:'isolated'}]);
});

test('indexed links retain the built-in Asuryani alias even when its faction entry is disabled',()=>{
 const disabled=row('faction:aeldari');disabled.enabled=false;const unit={key:'unit:alias-test',kind:'unit',faction:'Asuryani',name:'Alias test unit',enabled:true,data:{id:'alias-test',name:'Alias test unit',keywords:[],abilities:[],bodyguardIds:[],modelCounts:[1]}},r=row('rule:walker');r.key='rule:alias-effect';Object.assign(r.data,{id:'alias-effect',name:'Alias effect',sourceRuleId:'',units:['Alias test unit']});C.apply([disabled,unit,r]);assert.deepEqual(L.catalog.units.find(u=>u.id==='alias-test').abilities,[{id:'alias-effect'}]);
});

test('structured targeting is optional, validates constraints and keeps owners separate from targets',()=>{
 const r=row('rule:walker'),owners=structuredClone(r.data.units);
 C.validate(r);
 r.data.targeting={version:1,side:'enemy',scope:'unit',requiredKeywords:['Vehicle'],excludedKeywords:['Titanic'],range:6,visibility:'required',conditions:['Measure from this model.'],verified:false};
 C.validate(r);C.apply([r]);assert.deepEqual(L.abilities.find(x=>x.id===r.data.id).targeting,r.data.targeting);assert.deepEqual(r.data.units,owners);
 for(const patch of [{version:2},{side:'opponent'},{scope:'army'},{visibility:'maybe'},{range:0},{range:-1},{range:Infinity},{range:'6'},{range:241},{verified:'yes'},{requiredKeywords:['']},{requiredKeywords:['Vehicle','VEHICLE']},{excludedKeywords:['Vehicle']},{conditions:'within range'},{unexpected:true}]){
  const invalid=structuredClone(r);Object.assign(invalid.data.targeting,patch);assert.throws(()=>C.validate(invalid),/target|Target|structured/);
 }
 r.data.targeting.range=null;C.validate(r);r.data.targeting.range=6.5;C.validate(r);
});
test('target verification is bound to current rule details and survives JSON object key reordering',()=>{
 const r=row('rule:walker');r.data.referenceOnly=false;
 r.data.targeting={version:1,side:'friendly',scope:'unit',requiredKeywords:['Infantry'],excludedKeywords:[],range:6,visibility:'not-required',conditions:[],verified:true};
 assert.throws(()=>C.validate(r),/verify targeting again/);
 r.data.targeting.reviewKey=C.targetingReviewKey(r.data);C.validate(r);
 const reorder=v=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reorder(x)])):v;
 C.validate(reorder(r));
 for(const key of ['summary','targetText','sourceUrl']){const changed=structuredClone(r);changed.data[key]=key==='sourceUrl'?'https://example.com/new-source':(changed.data[key]||'')+' changed';assert.throws(()=>C.validate(changed),/verify targeting again/);}
 const changed=structuredClone(r);changed.data.targeting.range=12;assert.throws(()=>C.validate(changed),/verify targeting again/);
 r.data.referenceOnly=true;assert.throws(()=>C.validate(r),/reference-only/);
 r.data.referenceOnly=false;r.data.targeting.scope='bearer';r.data.targeting.side='enemy';assert.throws(()=>C.validate(r),/friendly target/);
 r.data.targeting.side='';assert.throws(()=>C.validate(r),/before verifying/);
});
test('targeting form capture supports drafts, verification, clearing and legacy forms',()=>{
 const d=row('rule:walker').data;d.referenceOnly=false;
 const form=values=>({has:k=>Object.hasOwn(values,k),get:k=>values[k]??null});
 const values={'targeting-fields':'1','targeting-side':'friendly','targeting-scope':'unit','targeting-requiredKeywords':'Infantry\n Character ','targeting-excludedKeywords':'Vehicle','targeting-range':'6','targeting-visibility':'required','targeting-conditions':'Measure from bearer.','targeting-verified':'on'};
 C.captureTargeting(d,form(values));C.validateTargeting(d);assert.deepEqual(d.targeting.requiredKeywords,['Infantry','Character']);assert.equal(d.targeting.verified,true);
 const previous=structuredClone(d.targeting);C.captureTargeting(d,form({}));assert.deepEqual(d.targeting,previous);
 delete values['targeting-verified'];C.captureTargeting(d,form(values));assert.equal(d.targeting.verified,false);assert.equal(d.targeting.reviewKey,undefined);
 values['targeting-range']='not a distance';C.captureTargeting(d,form(values));assert.throws(()=>C.validateTargeting(d),/range/);
 C.captureTargeting(d,form({'targeting-fields':'1'}));assert.equal(d.targeting,undefined);
});
