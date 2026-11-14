/* Generate a reviewed, revision-checked data repair. Does not connect or write to Supabase.
 * node scripts/repair-tyranids.cjs SOURCE_ROOT BEFORE_CATALOG_JSON OUTPUT_PREFIX
 * Source: wn-mitch/40kdc-data at 6ea813f7706bc9a492026d8b4403af99a965162b.
 * Keep snapshots/generated SQL private; the SQL contains the imported source records.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const I=require('../dist/rules-import.js'),C=require('../dist/content.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js');
const [root,snapshot,out]=process.argv.slice(2);if(!out)throw Error('Provide source root, full catalog snapshot, and output prefix.');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b',before=JSON.parse(fs.readFileSync(snapshot)),old=before.filter(r=>r.faction==='Tyranid'),faction=structuredClone(before.find(r=>r.key==='faction:tyranid'));
assert.equal(faction.name,'Tyranid');assert.equal(old.length,94);assert.ok(old.every(r=>r.revision===1));
const paths=['factions','units','detachments','enhancements','stratagems','leader-attachments','unit-compositions'].map(t=>'data/core/tyranids/'+t+'.json').concat(['abilities','phase-mappings'].map(t=>'data/enrichment/tyranids/'+t+'.json'));
const files=paths.map(name=>({name,text:fs.readFileSync(path.join(root,name),'utf8')}));
const rawFaction=JSON.parse(files[0].text)[0];assert.equal(rawFaction.id,'tyranids');
faction.name=faction.data.name='Tyranids';faction.data.aliases=[...new Set([...(faction.data.aliases||[]),'Tyranid'])];faction.data.importSource={name:'40kdc-data',file:paths[0],sourceId:rawFaction.id,record:rawFaction,commit:pin};
const renamed=before.map(r=>r.key===faction.key?faction:r.faction==='Tyranid'?{...r,faction:'Tyranids'}:r);
C.apply(renamed);
const review=I.plan(I.parse(files,{faction:'Tyranids',group:'Xenos'},renamed),renamed);assert.ok(review.rows.every(e=>!e.error),review.rows.filter(e=>e.error).map(e=>e.error).join('\n'));
const rows=[faction];
for(const entry of review.rows){
 const row=structuredClone(entry.proposed);
 // This repair only replaces revision-one, unreviewed source imports. No curated text is overwritten.
 if(entry.before){assert.equal(entry.before.revision,1);assert.equal(entry.before.data.status,'source-reference');assert.equal(entry.before.data.importSource.name,'40kdc-data');}
 row.data.importSource.commit=pin;row.data.sourceUrl='https://github.com/wn-mitch/40kdc-data/tree/'+pin+'/data';
 rows.push(row);
}
const foreign=old.filter(r=>r.data.importSource?.file?.includes('blood-angels/'));assert.equal(foreign.length,4);
for(const r of foreign)rows.push({...structuredClone(r),faction:'Tyranids',enabled:false});
assert.equal(rows.length,259);assert.equal(new Set(rows.map(r=>r.key)).size,rows.length);rows.forEach(C.validate);
const keys=new Set(rows.map(r=>r.key)),after=before.filter(r=>!keys.has(r.key)).concat(rows),applied=C.apply(after),tyr=after.filter(r=>r.faction==='Tyranids'&&r.enabled);
const units=tyr.filter(r=>r.kind==='unit'),dets=tyr.filter(r=>r.kind==='detachment'),rules=tyr.filter(r=>r.kind==='rule');
assert.equal(units.length,57);assert.equal(dets.length,11);assert.equal(rules.length,186);assert.ok(units.every(u=>P.read(u.data).length));
for(const u of units){P.validate(P.read(u.data));for(const id of u.data.bodyguardIds)assert.ok(units.some(b=>b.data.id===id));}
for(const r of rules){for(const n of r.data.units)assert.ok(units.some(u=>u.name===n));if(r.data.importSource.record.detachment_id)assert.ok(dets.some(d=>d.name===r.data.detachment));}
assert.ok(L.factionMatches('Tyranid','Tyranids'));
const bank=Q.buildBank({faction:'Tyranids',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.stats>0);assert.ok(bank.counts.rules>0);
const payload=rows.map(({key,kind,faction,name,data,enabled,revision})=>({key,kind,faction,name,data,enabled,expectedRevision:revision||0}));
const sql=`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as repaired_entries from public.import_rules_catalog($tyranids$${JSON.stringify(payload)}$tyranids$::jsonb);\nCOMMIT;\n`;
fs.writeFileSync(out+'-after.json',JSON.stringify(after));fs.writeFileSync(out+'-repair.sql',sql);fs.writeFileSync(out+'-manifest.json',JSON.stringify({pin,files:paths,changed:rows.length,units:units.length,detachments:dets.length,rules:rules.length,disabled:foreign.map(r=>r.key),practice:bank.counts},null,2));
console.log(fs.readFileSync(out+'-manifest.json','utf8'));
