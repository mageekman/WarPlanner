const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),B=require('../dist/list-builder.js'),Allies=require('../dist/allies.js'),P=require('../dist/unit-profiles.js');
const rows=require('./fixtures/shared-allies-consistency.json');
const army=(faction,detachment)=>({faction,detachment,units:[]}),add=(a,name,allied=false)=>{const source=B.search(name,a.faction,a).find(u=>u.name===name&&!!u.allied===allied);assert.ok(source,name);B.add(a,source.id,'u'+a.units.length);return a.units.at(-1);};
test.beforeEach(()=>C.apply(rows));test.afterEach(()=>C.reset());
test('canonical Captain restrictions work in every chapter without admitting Lieutenants or Terminator Captains',()=>{
 for(const faction of L.catalog.factions.filter(f=>f.group==='Space Marines').map(f=>f.name)){
  const a=army(faction,'Gladius Task Force'),captain=add(a,'Captain'),other=add(a,'Lieutenant'),term=add(a,'Captain in Terminator Armour');
  assert.ok(B.enhancements(a,captain).some(e=>e.name==='Adept of the Codex'),faction);
  assert.ok(!B.enhancements(a,other).some(e=>e.name==='Adept of the Codex'));
  assert.ok(!B.enhancements(a,term).some(e=>e.name==='Adept of the Codex'));
  B.setEnhancement(a,captain.id,'Adept of the Codex');
  const rule=L.abilities.find(r=>r.faction===faction&&r.name==='Adept of the Codex');assert.ok(L.enhancementEquipped(rule,captain,a));
  Object.assign(other,{enhancementId:captain.enhancementId,details:[...captain.details]});assert.ok(!L.enhancementEquipped(rule,other,a));
 }
});
test('all uploaded chapter unit-specific enhancement restrictions resolve to the same canonical bearer in builder and Guide',()=>{
 let checked=0;for(const e of L.catalog.enhancements.filter(e=>L.catalog.factions.some(f=>f.name===e.faction&&f.group==='Space Marines')&&e.restrictions.some(r=>r.unit_id))){
  const d=L.catalog.detachments.find(d=>d.id===e.detachmentId&&d.faction===e.faction),a=army(e.faction,d.name);
  for(const source of L.catalog.units.filter(u=>u.faction===e.faction&&!u.allied&&e.restrictions.some(r=>Allies.bearerRestrictionMatches(u,r)))){
   const u=add(a,source.name);assert.ok(B.enhancements(a,u).some(x=>x.id===e.id),e.faction+' '+e.name);B.setEnhancement(a,u.id,e.id);
   const rule=L.abilities.find(r=>r.faction===e.faction&&(r.sourceRuleId||r.id)===e.id);assert.ok(L.enhancementEquipped(rule,u,a));checked++;
  }
 }assert.ok(checked>60);
});
test('a shared profile edit reaches chapter views and retains one canonical unit identity',()=>{
 const edited=structuredClone(rows),r=edited.find(r=>r.key==='unit:intercessor-squad');r.data.profiles=P.read(r.data);r.data.profiles[0].T=9;C.apply(edited);
 for(const m of r.data.unitMemberships){const u=L.unitInfo('Intercessor Squad',m.faction);assert.equal(u.canonicalUnitId,r.data.id);assert.equal(u.id,m.unitId);assert.equal(P.read(u)[0].T,9);}
});
test('source-checked bearer corrections preserve imports, sharing and saved settings and reject concurrent edits',()=>{
 const before=require('./fixtures/shared-allies-bearers-before.json'),{fix}=require('../scripts/fix-shared-bearers.cjs'),changes=fix(before);
 for(const row of changes){const old=before.find(r=>r.key===row.key),expected=structuredClone(old);expected.data.bearerKeywords=row.data.bearerKeywords;expected.data.bearerAudit=row.data.bearerAudit;assert.deepEqual(row,expected);}
 const edited=structuredClone(before);edited[0].revision++;assert.throws(()=>fix(edited),/changed/);
 const a=army('Black Templars','Vow-sworn Crusaders'),judiciar=add(a,'Judiciar');assert.ok(B.enhancements(a,judiciar).some(e=>e.name==='Incendiary Animus'));
 const b=army('Space Wolves','Saga of the Great Wolf'),leader=add(b,'Wolf Guard Battle Leader');assert.ok(B.enhancements(b,leader).some(e=>e.name==="Skjald's Foretelling"));
});
test('allied Agents omit excluded bodyguards and can still attach Inquisitors to native Battleline',()=>{
 const a=army('Blood Angels','Gladius Task Force'),inq=add(a,'Inquisitor',true),body=add(a,'Intercessor Squad');
 assert.ok(B.eligibleBodies(a,inq).some(u=>u.id===body.id));
 for(const u of L.catalog.units.filter(u=>u.allied&&!u.alliedKind))assert.ok(u.bodyguardIds.every(id=>!id.endsWith('aquila-kill-team')),u.name);
 assert.ok(!B.search('Aquila Kill Team',a.faction,a).some(u=>u.allied));
 assert.deepEqual(B.enhancements(a,inq),[]);
});
test('Agents keep their source identity and do not gain chapter or GSC army abilities',()=>{
 for(const faction of ['Space Marines','Blood Angels','Astra Militarum','Grey Knights']){
  const a=army(faction,''),inq=add(a,'Inquisitor',true),source=B.info(inq,faction);assert.equal(source.originFaction,'Imperial Agents');assert.equal(source.sourceCatalogKey,'unit:inquisitor');
  assert.ok(!source.keywords.includes('Adeptus Astartes'));assert.equal(Allies.allowsRule(L.catalog,{faction,category:'army'},source,a),false);
 }
 for(const faction of ['Genestealer Cults','Tyranids','Chaos Space Marines'])assert.ok(!B.search('Inquisitor',faction).some(u=>u.allied));
});
test('GSC detached allies retain datasheet identity without native army powers and stale detachment access is rejected',()=>{
 const a=army('Genestealer Cults','Brood Brothers Auxilia'),officer=add(a,'Cadian Castellan',true),kasrkin=add(a,'Kasrkin',true);
 assert.ok(!B.info(officer,a.faction).abilities.some(r=>r.id.includes('voice-of-command')));
 assert.ok(B.info(kasrkin,a.faction).abilities.some(r=>r.id.includes('warrior-elite')));
 B.setDetachments(a,['Final Day']);assert.ok(B.alliedStatus(a).notes.some(n=>n.includes('requires Brood Brothers')));
 assert.ok(!Allies.allowsRule(L.catalog,L.abilities.find(r=>r.alliedDetachment==='Brood Brothers Auxilia'),B.info(kasrkin,a.faction),a));
 const tyrant=add(a,'Winged Hive Tyrant',true),source=B.info(tyrant,a.faction);assert.equal(source.sourceCatalogKey,'unit:winged-hive-tyrant');assert.ok(source.keywords.includes('Synapse'));
 assert.ok(!source.abilities.some(r=>/synapse-tyranids|shadow-in-the-warp-tyranids/.test(r.id)));
});
