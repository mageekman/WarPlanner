const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),W=require('../dist/workshop-browser.js'),A=require('../dist/activations.js'),P=require('../dist/unit-profiles.js');
const {consolidate}=require('../scripts/finish-marine-dedup.cjs'),baseline=require('../scripts/marine-dedup-baseline.json');
const audited=require('../scripts/audit-marines.cjs').audit(require('./fixtures/marines-audit-before.json')).after,sharedUnits=require('../scripts/share-marine-units.cjs'),unitRevs=new Map(sharedUnits.baseline.map(r=>[r.key,r.revision]));
const unitChanges=sharedUnits.consolidate(audited.map(r=>unitRevs.has(r.key)?{...r,revision:unitRevs.get(r.key)}:r)).changes;
const armour=require('../scripts/share-armour-of-contempt.cjs').consolidate(require('./fixtures/armour-of-contempt-before.json'));
const assembled=new Map([...audited,...unitChanges,...armour,...require('./fixtures/marine-dedup-edits.json')].map(r=>[r.key,r]));
const before=baseline.map(r=>({...Object.fromEntries(['key','kind','faction','name','data','enabled'].map(k=>[k,structuredClone(assembled.get(r.key)[k])])),revision:r.revision})),result=consolidate(before),changed=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>changed.get(r.key)||r),alias=new Map(result.changes.filter(r=>r.data.sharedRuleId).map(r=>[r.data.id,r.data.sharedRuleId]));
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,''),chapters=[...new Set(before.filter(r=>r.kind==='unit').flatMap(r=>r.data.unitMemberships.map(m=>m.faction)))];
test.afterEach(()=>C.reset());
test('finish consolidates 2,439 rule copies, preserves 177 canonical units and keeps originals',()=>{
 assert.equal(result.summary.length,406);assert.equal(result.changes.filter(r=>!r.enabled).length,2439);assert.equal(after.filter(r=>r.enabled&&r.kind==='rule').length,621);assert.deepEqual(after.filter(r=>r.kind==='unit'),before.filter(r=>r.kind==='unit'));
 for(const row of result.changes.filter(r=>!r.enabled)){const old=before.find(r=>r.key===row.key);assert.deepEqual(row.data,{...old.data,sharedRuleId:row.data.sharedRuleId});assert.equal(row.revision,old.revision);}
 assert.equal(result.variants.length,0);
});
test('chapter and detachment scope plus per-faction unit eligibility remains exactly the original union',()=>{
 for(const canonical of result.changes.filter(r=>r.enabled)){
  const originals=before.filter(r=>r.key===canonical.key||canonical.data.sharedRuleIds.includes(r.data.id));
  for(const m of canonical.data.memberships){const old=originals.filter(r=>r.faction===m.faction);assert.ok(old.length);const expected=old.some(r=>!r.data.units.length)?[]:[...new Set(old.flatMap(r=>r.data.units))];assert.deepEqual([...(m.units||canonical.data.units)].sort(),expected.sort());assert.deepEqual(m.detachments,old.some(r=>!r.data.detachment)?[]:[...new Set(old.map(r=>r.data.detachment))].sort());for(const r of old)for(const key of ['summary','phase','turn','window','category','conditions','timings','referenceOnly','guide'])assert.deepEqual(canonical.data[key],r.data[key],r.key+' '+key);}
 }
});
test('all chapter datasheets retain stats, keywords, attachments and ability parameters after alias resolution',()=>{
 C.apply(before);const old=structuredClone(L.catalog.units.filter(u=>chapters.includes(u.faction)));C.apply(after);
 for(const u of old){const current=L.unitInfo(u.name,u.faction);assert.ok(current);for(const key of ['name','keywords','modelCounts','bodyguardIds','legend'])assert.deepEqual(current[key],u[key]);assert.deepEqual(P.read(current),P.read(u));assert.deepEqual(current.abilities,u.abilities.map(a=>({...a,id:alias.get(a.id)||a.id})),u.faction+' '+u.name);}
});
test('Guide step availability and activation ownership match every chapter, phase and player turn',()=>{
 function snapshots(rows){C.apply(rows);const output=[];for(const faction of chapters){const units=L.catalog.units.filter(u=>u.faction===faction).map((u,i)=>({id:'u'+i,name:u.name,models:u.modelCounts[0]||1,details:[]}));const detachments=L.catalog.detachments.filter(d=>d.faction===faction).map(d=>d.name);for(const phase of [0,1,2,3,4])for(const turn of ['you','opponent']){const state={army:{faction,detachments,units},phase,turn,firstPlayer:'you'};for(const step of A.steps(state)){const ids=[...new Set(L.forStep(state,step).map(r=>alias.get(r.id)||r.id))].sort();const deck=[2,4].includes(phase)&&['shooting','fight','response'].includes(step.activationMode)?A.flashcards(state,step):{shared:[],unitCards:[]},ownership=new Set();for(const card of deck.shared)for(const unit of card.appliesTo)ownership.add((alias.get(card.id)||card.id)+'|'+unit.body.name);for(const card of deck.unitCards)for(const item of card.items)ownership.add((alias.get(item.id)||item.id)+'|'+card.unit.body.name);output.push({faction,phase,turn,step:step.id,ids,ownership:[...ownership].sort()});}}}return output;}
 assert.deepEqual(snapshots(after),snapshots(before));
});
test('related unit rules stay chapter-specific and each shared edit reaches the eligible chapters only',()=>{
 const row=after.find(r=>r.kind==='rule'&&r.enabled&&r.name==='Aquilon Optics'&&r.data.memberships?.length>2);assert.ok(row);const updated=structuredClone(after);updated.find(r=>r.key===row.key).data.summary='One shared optics edit.';C.apply(updated);
 for(const m of row.data.memberships){const r=L.abilities.find(r=>r.id===row.data.id&&r.faction===m.faction);assert.equal(r.summary,'One shared optics edit.');const unit=after.find(r=>r.kind==='unit'&&r.name==='Gladiator Lancer');assert.ok(W.related(after,unit,m.faction).some(r=>r.key===row.key));}
 const black=W.related(after,after.find(r=>r.kind==='unit'&&r.name==='Gladiator Lancer'),'Black Templars');assert.ok(black.some(r=>r.data.summary.includes('Damage')));assert.equal(new Set(black.map(r=>r.key)).size,black.length);
});
test('concurrent edits, new records and missing source records block the one-time consolidation',()=>{
 for(const edit of [rows=>rows[0].revision++,rows=>rows[0].data.summary='Changed',rows=>rows.pop(),rows=>rows.push({...rows[0],key:'rule:new'})]){const rows=structuredClone(before);edit(rows);assert.throws(()=>consolidate(rows),/changed|Missing/);}
});
module.exports={before,after,result};
