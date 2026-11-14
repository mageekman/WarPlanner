const test=require('node:test'),assert=require('node:assert/strict'),I=require('../dist/rules-import.js'),C=require('../dist/content.js');
const existing=C.seed(),file=(name,data)=>({name,text:typeof data==='string'?data:JSON.stringify(data)}),options={faction:'Aeldari',group:'Xenos'};
const ability={ability_id:'import-drill-aeldari',name:'Import Drill',faction_id:'aeldari',unit_ids:['fire-dragons'],effect:{type:'permission',target:'this-unit',modifier:{activity:'shoot',allow:true}},trigger:{event:'phase-started'}};
const review=(files,records=existing)=>I.plan(I.parse(files,options,records),records);
test('40kdc import resolves units, phases and aliases while preserving curated content by default',()=>{
 const r=review([file('abilities.json',[ability,{...ability,ability_id:'crystalline-targeting-aeldari',name:'Crystalline Targeting'}]),file('phase-mappings.json',[{source_id:ability.ability_id,phases:['shooting']}])]);assert.equal(r.rows.length,2);const imported=r.rows.find(e=>!e.before),update=r.rows.find(e=>e.before);assert.equal(imported.action,'add');assert.deepEqual(imported.proposed.data.units,['Fire Dragons']);assert.deepEqual(imported.proposed.data.phase,[2]);assert.equal(imported.proposed.data.referenceOnly,true);assert.equal(imported.proposed.data.window,'start');assert.equal(update.key,'rule:walker');assert.equal(update.action,'source');assert.equal(update.sourceOnly.data.summary,update.before.data.summary);assert.deepEqual(update.sourceOnly.data.guide,update.before.data.guide);assert.deepEqual(imported.proposed.data.importSource.record.effect,ability.effect);
});
test('unresolved unit scopes stay out of guide activation windows',()=>{
 const r=review([file('abilities.json',[{...ability,unit_ids:['unknown-unit'],trigger:{event:'round-started'}}])]);assert.deepEqual(r.rows[0].proposed.data.phase,[]);assert.ok(r.warnings.some(s=>s.includes('resolve eligible')));
});
test('Wahapedia pipe CSV links descriptions to the selected faction and strips HTML as text',()=>{
 const files=[file('Factions.csv','id|name|\nAE|Aeldari|\nTS|Thousand Sons|'),file('Datasheets.csv','id|name|faction_id|\n001|Fire Dragons|AE|\n002|Rubric Marines|TS|'),file('Abilities.csv','id|name|description|faction_id|\nabc|CSV Drill|"<p>Reroll a roll.</p><script>alert(1)</script>"||'),file('Datasheets_abilities.csv','datasheet_id|ability_id|line|name|description|type|\n001|abc|1|||Datasheet|\n002|abc|1|||Datasheet|')];
 const r=review(files),rule=r.rows.find(e=>e.kind==='rule');assert.deepEqual(rule.proposed.data.units,['Fire Dragons']);assert.equal(rule.proposed.data.summary,'Reroll a roll.');assert.doesNotMatch(rule.proposed.data.importSource.text,/script|alert/);assert.ok(!r.rows.some(e=>e.name==='Rubric Marines'));
});
test('CSV parser handles BOM, quoted multiline fields, escaped quotes and trailing separators',()=>{
 assert.deepEqual(I.csv('\uFEFFid|name|description|\r\n001|"A, B"|"Line one\nA ""quoted"" phrase"|\r\n'),[{id:'001',name:'A, B',description:'Line one\nA "quoted" phrase'}]);assert.throws(()=>I.csv('id|name\n1|"unfinished'),/unfinished/);
});
test('WarPlanner backup round-trips settings and requires explicit replacement of existing entries',()=>{
 const r=review([file('backup.json',I.exportCatalog(existing))]);assert.equal(r.rows.length,existing.length);assert.ok(r.rows.every(e=>e.before&&e.action==='skip'));const entry=r.rows[0];entry.action='replace';assert.equal(I.selected(r)[0].key,entry.key);assert.deepEqual(I.selected(r)[0].data,entry.before.data);
 const template=review([file('template.json',I.template())]);assert.equal(template.rows[0].action,'add');assert.equal(template.rows[0].proposed.data.referenceOnly,true);
});
test('reimporting the same source is idempotent and defaults to skip',()=>{
 const first=review([file('abilities.json',[{...ability,ability_id:'crystalline-targeting-aeldari',name:'Crystalline Targeting'}])]);const saved=I.selected(first).map(r=>({...r,revision:r.revision+1})),records=existing.filter(r=>!saved.some(s=>s.key===r.key)).concat(saved);const again=review([file('abilities.json',[{...ability,ability_id:'crystalline-targeting-aeldari',name:'Crystalline Targeting'}])],records);assert.equal(again.rows[0].action,'skip');
});
test('invalid, ambiguous and duplicate content cannot be selected for import',()=>{
 const r=review([file('a.json',{entries:[{...existing.find(r=>r.kind==='rule'),key:'rule:bad-key'}]})]);assert.ok(r.rows[0].error);assert.equal(r.rows[0].action,'skip');r.rows[0].action='add';assert.throws(()=>I.selected(r),/stable ID/);
 const raw={...ability},dup=review([file('abilities.json',[raw,{...raw,effect:{type:'changed'}}])]);assert.match(dup.rows[0].error,/Conflicting/);
});
test('unsupported and malformed files fail before writes and large batches are rejected',()=>{
 assert.throws(()=>review([file('download.zip','x')]),/Extract ZIP/);assert.throws(()=>review([file('rules.pdf','x')]),/PDF/);assert.throws(()=>review([file('abilities.json','{broken')]),/abilities.json/);assert.throws(()=>I.selected({rows:[]}),/at least one/);
 const r=review([file('abilities.json',[ability])]);r.rows=Array.from({length:1001},()=>r.rows[0]);assert.throws(()=>I.selected(r),/1000/);
});
test('new source factions and unit counts can be imported without guessing other factions',()=>{
 const files=[file('factions.json',[{id:'test-chaos',name:'Test Chaos',aliases:[]}]),file('units.json',[{id:'test-sorcerer',name:'Test Sorcerer',faction_id:'test-chaos',keywords:['Character'],ability_ids:[],model_count:{min:1,max:1}},{id:'wrong',name:'Wrong faction',faction_id:'other'}])];const r=I.plan(I.parse(files,{faction:'Test Chaos',group:'Chaos'},existing),existing);assert.equal(r.rows.length,2);assert.equal(r.rows.find(r=>r.kind==='faction').proposed.data.group,'Chaos');assert.deepEqual(r.rows.find(r=>r.kind==='unit').proposed.data.modelCounts,[1]);
});
test('atomic batch client sends revisions, updates its cache only on success and blocks non-admin writes',async()=>{
 let entries;const record=existing.find(r=>r.kind==='rule'),client={from(t){return t==='site_admins'?{select(){return this},eq(){return this},maybeSingle:async()=>({data:{user_id:'owner'}})}:{select(){return this},order(){return this},range:async()=>({data:[record]})};},rpc:async(name,args)=>{assert.equal(name,'import_rules_catalog');entries=args.entries;return {data:[{...record,revision:2}]};}};
 const service=C.create(client,'owner');await service.load();await service.saveBatch([record]);assert.equal(entries[0].expectedRevision,record.revision);assert.equal(service.records[0].revision,2);client.rpc=async()=>({error:{message:'Conflict'}});await assert.rejects(()=>service.saveBatch([record]),/Conflict/);assert.equal(service.records[0].revision,2);await assert.rejects(()=>C.create(client,'other').saveBatch([record]),/Administrator/);
});
test('source provenance stays idempotent after API JSON serialization drops absent metadata',()=>{
 const files=[file('abilities.json',[{...ability,ability_id:'aspect-of-murder-aspect-host-aeldari',name:'Aspect of Murder',ability_type:'enhancement'}]),file('enhancements.json',[{id:'aspect-of-murder-aspect-host-aeldari',name:'Aspect of Murder',detachment_id:'aspect-host'}])],first=review(files),saved=JSON.parse(JSON.stringify(I.selected(first))).map(r=>({...r,revision:r.revision+1})),records=existing.filter(r=>!saved.some(s=>s.key===r.key)).concat(saved);assert.ok(review(files,records).rows.every(r=>r.action==='skip'));
});
test('malformed catalog rows remain safe inspectable errors instead of crashing the preview',()=>{
 const r=review([file('broken-backup.json',{entries:[null,{name:'Missing data'},{key:'unit:bad',kind:'unit',name:'Bad unit',data:[]} ]})]);assert.equal(r.rows.length,3);assert.ok(r.rows.every(e=>e.error&&e.action==='skip'&&e.proposed.data&&typeof e.proposed.name==='string'));assert.throws(()=>I.selected(r),/at least one/);
});
