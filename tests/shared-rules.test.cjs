const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),W=require('../dist/workshop-browser.js'),Q=require('../dist/practice.js'),R=require('../dist/rule-reports.js');
const I=require('../dist/rules-import.js'),B=require('../dist/list-builder.js');
const before=require('./fixtures/armour-of-contempt-before.json'),{consolidate}=require('../scripts/share-armour-of-contempt.cjs');
const marine=require('../scripts/audit-marines.cjs').audit(require('./fixtures/marines-audit-before.json')).after;
const changes=consolidate(before),shared=changes[0],catalog=[...marine.filter(r=>!before.some(b=>b.key===r.key)),...changes];
test.afterEach(()=>C.reset());
test('50 imported copies become one editable rule in every appropriate Workshop folder',()=>{
 assert.equal(changes.length,51);assert.equal(shared.data.memberships.length,12);
 for(const m of shared.data.memberships){assert.equal(W.entries(catalog,m.faction,'stratagem').filter(r=>r.name===shared.name).length,1);for(const name of m.detachments){const parent=marine.find(r=>r.kind==='detachment'&&r.faction===m.faction&&r.name===name);assert.ok(parent,m.faction+' '+name);assert.equal(W.related(catalog,parent).filter(r=>r.name===shared.name).length,1);}}
 assert.equal(W.entries(catalog,W.ALL,'stratagem').filter(r=>r.name===shared.name).length,1);
 for(const old of before){const alias=changes.find(r=>r.key===old.key);assert.equal(alias.enabled,false);assert.deepEqual(alias.data.importSource,old.data.importSource);assert.equal(alias.revision,old.revision);}
 assert.equal(C.filterRecords([shared],{query:'Black Spear Task Force'}).length,1);
});
test('membership pairs preserve exact army availability without a faction/detachment cross product',()=>{
 C.apply(catalog);
 for(const m of shared.data.memberships){for(const name of m.detachments){const army={faction:m.faction,detachments:[name],units:[]};assert.ok(L.matches(shared.data,army));assert.equal(L.abilities.filter(r=>r.name===shared.name&&L.matches(r,army)).length,1);}}
 const wrong={faction:'Blood Angels',detachments:['Black Spear Task Force'],units:[]};assert.equal(L.matches(shared.data,wrong),false);
 assert.equal(L.matches(shared.data,{faction:'Tyranids',detachments:['Gladius Task Force'],units:[]}),false);
 assert.equal(L.matches(shared.data,{faction:'Space Marines',detachments:[],units:[]}),false);
});
test('one edit reaches chapter practice, original links resolve, and reports select the shared record',()=>{
 const updated=structuredClone(catalog),row=updated.find(r=>r.key===shared.key);row.data.summary='Shared updated study wording for every listed chapter.';C.apply(updated);
 for(const faction of ['Space Marines','Blood Angels','Deathwatch']){
  const rules=L.abilities.filter(r=>r.name===shared.name&&r.faction===faction);assert.equal(rules.length,1);assert.equal(rules[0].summary,row.data.summary);
  const bank=Q.buildBank({faction,rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments,random:()=>0.5});const questions=bank.questions.filter(q=>q.review.rule?.id===shared.data.id&&q.mode==='rules');assert.equal(questions.length,1);
  const report=R.practiceContext(questions[0],updated);assert.equal(report.defaultKey,shared.key);assert.equal(report.context.snapshotChanged,false);
  const det=L.catalog.detachments.find(d=>d.faction===faction&&d.name==='Gladius Task Force');assert.ok(det.stratagems.includes(shared.data.id));assert.ok(!det.stratagems.some(id=>before.some(r=>r.data.id===id)));
 }
});
test('source conflicts, workshop edits and scope changes stop the one-time consolidation',()=>{
 for(const edit of [r=>r.data.summary+=' Edited',r=>r.data.importSource.record.effect.modifier.value=2,r=>r.data.detachment='Other',r=>r.revision++]){const rows=structuredClone(before);edit(rows[0]);assert.throws(()=>consolidate(rows),/Entry changed/);}
 assert.throws(()=>consolidate(before.slice(1)),/scope changed/);
});
test('shared rule validation rejects ambiguous memberships and preserves legacy rules',()=>{
 for(const change of [d=>d.memberships=[],d=>d.memberships.push(d.memberships[0]),d=>d.memberships[0].detachments.push(d.memberships[0].detachments[0]),d=>d.detachment='Gladius Task Force']){const r=structuredClone(shared);change(r.data);assert.throws(()=>C.validate(r));}
 before.forEach(C.validate);C.validate(shared);
});
test('source refreshes retain archived links and full replacement cannot resurrect duplicates',()=>{
 const alias=changes[1],refreshed=structuredClone(alias);refreshed.data.importSource.text='New source metadata';
 const review={rows:[{name:alias.name,before:alias,proposed:{...refreshed,enabled:true},sourceOnly:refreshed,action:'replace'}]};
 assert.throws(()=>I.selected(review),/linked to a shared rule/);review.rows[0].action='source';const [saved]=I.selected(review);assert.equal(saved.enabled,false);assert.equal(saved.data.sharedRuleId,shared.data.id);assert.equal(saved.data.importSource.text,'New source metadata');
});
test('shared unit links and enhancements work across detachments without duplicate builder choices',()=>{
 const seed=C.seed(),unit=structuredClone(seed.find(r=>r.kind==='unit'&&r.name==='Autarch')),rule=structuredClone(seed.find(r=>r.kind==='rule'&&r.data.category==='enhancement'));
 rule.key='rule:shared-example';rule.data.id='shared-example';rule.name=rule.data.name=rule.data.enhancement='Shared example';rule.data.sourceRuleId='shared-example';rule.data.detachment='';rule.data.faction=rule.faction='Aeldari';rule.data.memberships=[{faction:'Aeldari',detachments:['Aspect Host','Warhost']}];rule.data.sharedRuleIds=['old-shared-example'];rule.data.units=['Autarch'];rule.data.bearerKeywords=['Character'];rule.data.bearerRestrictions=[];delete rule.data.importSource;
 unit.data.abilities.push({id:'old-shared-example',wargear:'retained'});C.apply([rule,unit]);assert.ok(L.unitInfo('Autarch').abilities.some(a=>a.id==='shared-example'&&a.wargear==='retained'));
 const army={faction:'Aeldari',detachments:['Aspect Host','Warhost'],units:[{id:'one',name:'Autarch',details:['Enhancement: Shared example'],enhancementId:'old-shared-example'}]};
 assert.equal(B.enhancements(army,army.units[0]).filter(e=>e.id==='shared-example').length,1);assert.equal(L.enhancementEquipped(L.abilities.find(r=>r.id==='shared-example'),army.units[0],army),true);
});
