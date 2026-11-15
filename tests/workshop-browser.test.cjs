const test=require('node:test'),assert=require('node:assert/strict'),W=require('../dist/workshop-browser.js');
const row=(kind,id,name,faction,data={})=>({key:kind+':'+id,kind,name,faction,data:{id,name,...data},enabled:true});
const records=[row('faction','aeldari','Aeldari','',{group:'Xenos'}),row('faction','grey-knights','Grey Knights','',{group:'Imperium'}),row('faction','chaos','Thousand Sons','',{group:'Chaos'}),row('detachment','warpbane','Warpbane Task Force','Grey Knights'),row('detachment','aspect','Aspect Host','Aeldari'),row('unit','strike','Strike Squad','Grey Knights',{abilities:[{id:'ritual-source'}]}),row('rule','ritual','Sanctifying Ritual','Grey Knights',{units:['Strike Squad'],category:'ability',sourceRuleId:'ritual-source'}),row('rule','ground','Hallowed Ground','Grey Knights',{detachment:'Warpbane Task Force',category:'army'}),row('rule','ward','Ward','Grey Knights',{detachment:'Warpbane Task Force',category:'stratagem'}),row('rule','aeldari-ward','Ward','Aeldari',{detachment:'Aspect Host',category:'stratagem'}),row('rule','core','Core rule','*',{category:'core'}),row('step','shoot','Shoot','*')];
test('faction folders group Imperium, Chaos and Xenos and include content whose faction metadata is absent',()=>{
 assert.deepEqual(W.factions(records).map(f=>f.name),['Grey Knights','Thousand Sons','Aeldari']);const orphan=row('unit','orphan','Orphan unit','Missing Faction');assert.equal(W.factions([...records,orphan]).at(-1).name,'Missing Faction');
});
test('faction folders isolate entries, keep shared content separate, and retain a global view',()=>{
 assert.deepEqual(W.entries(records,'Grey Knights','detachment').map(r=>r.name),['Warpbane Task Force']);assert.deepEqual(W.entries(records,'Aeldari','detachment').map(r=>r.name),['Aspect Host']);assert.equal(W.entries(records,W.ALL,'detachment').length,2);assert.deepEqual(W.scoped(records,W.SHARED).map(r=>r.kind),['rule','step']);assert.equal(W.scoped(records,null).length,0);
});
test('content folders separate stratagems, enhancements, units and faction details without hiding empty folders',()=>{
 assert.deepEqual(W.entries(records,'Grey Knights','stratagem').map(r=>r.name),['Ward']);assert.deepEqual(W.entries(records,'Grey Knights','faction').map(r=>r.name),['Grey Knights']);const folders=W.folders(records,'Grey Knights');assert.equal(folders.find(f=>f.id==='enhancement').count,0);assert.equal(folders.find(f=>f.id==='rule').count,3);assert.ok(!folders.some(f=>f.id==='step'));assert.ok(W.folders(records,W.SHARED).some(f=>f.id==='step'));
});
test('unit and detachment links find the actual editable rules and never cross factions',()=>{
 const det=records.find(r=>r.key==='detachment:warpbane');assert.deepEqual(W.related(records,det).map(r=>r.name),['Hallowed Ground','Ward']);const unit=records.find(r=>r.key==='unit:strike');assert.deepEqual(W.related(records,unit).map(r=>r.name),['Sanctifying Ritual']);const referenceOnly={...unit,data:{...unit.data,abilities:[{id:'ritual-source'}]},name:'Renamed unit'};assert.deepEqual(W.related(records,referenceOnly).map(r=>r.name),['Sanctifying Ritual']);assert.equal(W.related(records,null).length,0);
});

test('Space Marines group comes first and only explicitly assigned factions move into it',()=>{const marine=row('faction','space-marines','Space Marines','',{group:'Space Marines'}),chapter=row('faction','blood-angels','Blood Angels','',{group:'Space Marines'});const grouped=W.factions([...records,marine,chapter]);assert.deepEqual(grouped.slice(0,3).map(f=>f.name),['Blood Angels','Space Marines','Grey Knights']);assert.equal(grouped.find(f=>f.name==='Grey Knights').group,'Imperium');});

test('faction review filters detachments while retaining faction-wide rules and units',()=>{
 const extra=[row('detachment','other','Other','Grey Knights'),row('rule','other-rule','Other Rule','Grey Knights',{detachment:'Other',category:'army'}),row('rule','army','Army Rule','Grey Knights',{category:'army'})];
 const model=W.review([...records,...extra],{faction:'Grey Knights',detachment:'Warpbane Task Force'});
 assert.deepEqual(model.detachmentNames,['Other','Warpbane Task Force']);assert.deepEqual(model.detachments.map(d=>d.row.name),['Warpbane Task Force']);assert.equal(model.units.length,1);assert.equal(model.armyRules[0].name,'Army Rule');assert.ok(!model.rules.some(r=>r.name==='Other Rule'));
});
test('faction review searches rule contents and retains the unit using a matching ability',()=>{
 const model=W.review(records,{faction:'Grey Knights',query:'sanctifying'});assert.equal(model.units[0].row.name,'Strike Squad');assert.equal(model.units[0].rules[0].name,'Sanctifying Ritual');assert.equal(W.review(records,{faction:'Aeldari',query:'sanctifying'}).units.length,0);
});
test('core review contains global rules and stratagems without faction or guide-page leakage',()=>{
 const coreStrat=row('rule','reroll','Command Re-roll','*',{category:'stratagem'});const model=W.review([...records,coreStrat],{faction:W.SHARED,detachment:'Warpbane Task Force'});assert.deepEqual(model.rules.map(r=>r.name),['Command Re-roll','Core rule']);assert.equal(model.units.length,0);assert.equal(model.detachment,'');
});
test('review resolves shared rule aliases and chapter-specific shared unit links once',()=>{
 const shared=row('rule','shared','Shared Rule','Space Marines',{category:'ability',memberships:[{faction:'Blood Angels',detachments:['Gladius']}],sharedRuleIds:['old-blood']}),archive=row('rule','old-blood','Archived duplicate','Blood Angels',{sharedRuleId:'shared'}),unit=row('unit','shared-unit','Intercessors','Space Marines',{unitMemberships:[{faction:'Space Marines',abilities:[]},{faction:'Blood Angels',abilities:[{id:'old-blood'}]}]}),oldUnit=row('unit','old-unit','Archived unit','Blood Angels',{sharedUnitId:'shared-unit'});
 const model=W.review([shared,archive,unit,oldUnit],{faction:'Blood Angels',detachment:'Gladius'});assert.equal(model.rules.length,1);assert.equal(model.units.length,1);assert.equal(model.units[0].rules[0].key,shared.key);assert.equal(W.review([shared,unit],{faction:'Space Marines'}).units[0].rules.length,0);
});
test('core source preparation keeps provisional references separate from audited faction data',()=>{
 const source=require('./fixtures/core-review-source.json'),rows=require('../scripts/prepare-core-review.cjs').prepare(source),C=require('../dist/content.js');assert.equal(rows.length,26);assert.equal(rows.filter(r=>r.data.category==='stratagem').length,10);
 for(const r of rows){assert.ok(r.key.startsWith('rule:core-'));assert.equal(r.faction,'*');assert.equal(r.data.referenceOnly,true);assert.equal(r.data.status,'source-reference');assert.equal(r.expectedRevision,0);C.validate(r);assert.ok(r.data.importSource.record);}
 const model=W.review(rows,{faction:W.SHARED});assert.equal(model.rules.length,26);assert.deepEqual(rows.find(r=>r.data.sourceRuleId==='insane-bravery').data.importSource.stratagem.phases,['command']);assert.ok(rows.every(r=>!r.data.phase.length&&r.data.window==='prebattle'));
});
