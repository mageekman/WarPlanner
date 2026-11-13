const test=require('node:test'),assert=require('node:assert/strict');
const B=require('../dist/list-builder.js'),A=require('../dist/activations.js');
function army(){return {...B.newArmy(),name:'Practice',detachment:'Aspect Host',disposition:'Priority Assets'};}
test('unit search is name-based, case-insensitive and punctuation-tolerant',()=>{
 assert.equal(B.search('FIRE DRAGONS')[0].name,'Fire Dragons');assert.equal(B.search('fire-dragons')[0].name,'Fire Dragons');assert.equal(B.search('not a unit').length,0);
 assert.equal(B.search('').length,80);assert.equal(B.detachments().length,16);assert.ok(B.dispositions().includes('Disruption'));
});
test('duplicate squads are independent entries and all catalog defaults use positive model counts',()=>{
 const a=army();B.add(a,'fire-dragons','one');B.add(a,'fire-dragons','two');a.units[0].details.push('Firepike');assert.equal(a.units[1].details.length,0);
 for(const unit of B.search('')){const draft=army();B.add(draft,unit.id,'unit');assert.ok(draft.units[0].modelCount>0);}
});
test('working edits preserve the exact uploaded text even if a caller changes the draft source field',()=>{
 const original={...army(),originalExport:'Original (1965 points)\r\nAeldari\n• Original equipment'};B.add(original,'farseer','one');
 const draft=structuredClone(original);draft.name='Edited';draft.detachment='Warhost';draft.disposition='Reconnaissance';draft.units[0].details=['Edited equipment'];draft.originalExport='tampered';
 const result=B.commit(draft,original);assert.equal(result.originalExport,original.originalExport);assert.equal(original.name,'Practice');assert.deepEqual(original.units[0].details,[]);assert.equal(result.detachment,'Warhost');
});
test('created lists do not invent an uploaded source and require a complete nonempty roster',()=>{
 const draft=B.newArmy();assert.throws(()=>B.commit(draft,null),/name/);Object.assign(draft,{name:'New',detachment:'Warhost',disposition:'Reconnaissance'});assert.throws(()=>B.commit(draft,null),/at least one/);
 B.add(draft,'windriders','one');draft.originalExport='invented';const result=B.commit(draft,null);assert.equal(result.origin,'builder');assert.equal(result.originalExport,undefined);
});
test('leader attachments bind abilities to the chosen squad and removing it clears the relationship',()=>{
 const a=army();B.add(a,'fuegan','leader');B.add(a,'fire-dragons','first');B.add(a,'fire-dragons','second');B.attach(a,'leader','second');
 const groups=A.units(a);assert.equal(groups.filter(u=>A.rangeBonus(u)).length,1);assert.equal(groups.find(u=>A.rangeBonus(u)).body.id,'second');
 B.remove(a,'second');assert.equal(a.units.find(u=>u.id==='leader').group,'');assert.equal(A.units(a).some(u=>A.rangeBonus(u)),false);
});
test('invalid attachments are rejected and detaching the last leader releases its bodyguard',()=>{
 const a=army();B.add(a,'asurmen','a');B.add(a,'dire-avengers','d');B.add(a,'windriders','w');assert.throws(()=>B.attach(a,'a','w'),/not in/);
 B.attach(a,'a','d');B.attach(a,'a','');assert.equal(a.units.find(u=>u.id==='d').group,'');
});
test('enhancement choices respect detachment, bearer keywords and Epic Hero exclusion',()=>{
 const a=army();B.add(a,'autarch','a');B.add(a,'asurmen','hero');B.add(a,'fire-dragons','squad');
 assert.ok(B.enhancements(a,a.units[0]).some(e=>e.name==='Aspect of Murder'));assert.equal(B.enhancements(a,a.units[1]).length,0);assert.equal(B.enhancements(a,a.units[2]).filter(e=>!e.upgrade).length,0);
 B.setEnhancement(a,'a','Aspect of Murder');assert.equal(B.enhancement(a.units[0]),'Aspect of Murder');B.setEnhancement(a,'a','');assert.equal(B.enhancement(a.units[0]),'');
 assert.throws(()=>B.setEnhancement(a,'squad','Aspect of Murder'),/available/);
});
test('token equipment is explicit and changing it preserves other notes',()=>{
 const a=army();B.add(a,'striking-scorpions','one');const unit=a.units[0];unit.details=['Scorpion chainswords'];B.setTokens(unit,2);assert.equal(B.tokens(unit),2);B.setTokens(unit,0);assert.deepEqual(unit.details,['Scorpion chainswords']);assert.throws(()=>B.setTokens(unit,3),/0, 1 or 2/);
});

test('legacy lists keep their first saved roster snapshot while site-created lists have no fake upload',()=>{
 const source=army();delete source.origin;B.add(source,'farseer','a');const draft=structuredClone(source);draft.name='Edited';draft.units=[];B.add(draft,'windriders','b');const edited=B.commit(draft,source);
 assert.equal(edited.originalRoster.units[0].name,'Farseer');const again=structuredClone(edited);again.originalRoster.name='tampered';const saved=B.commit(again,edited);assert.equal(saved.originalRoster.name,'Practice');
 const created=B.commit({...draft,origin:'builder'},null);assert.equal(created.originalRoster,undefined);
});
test('lists can select multiple detachments and keep legacy single-detachment compatibility',()=>{
 const a=army();B.add(a,'fire-dragons','one');B.setDetachments(a,['Warhost','Aspect Host','Warhost']);
 const saved=B.commit(a,null);assert.deepEqual(saved.detachments,['Warhost','Aspect Host']);assert.equal(saved.detachment,'Warhost');
 assert.deepEqual(B.selectedDetachments({detachment:'Aspect Host'}),['Aspect Host']);
 B.setDetachments(a,[]);assert.throws(()=>B.commit(a,null),/detachment/);
});
test('enhancement choices include each selected detachment and distinguish duplicate names',()=>{
 const a=army();B.setDetachments(a,['Ghosts of the Webway','Fateful Performance']);B.add(a,'shadowseer','one');
 const choices=B.enhancements(a,a.units[0]).filter(e=>e.name==='Mistweave');assert.equal(choices.length,2);
 assert.throws(()=>B.setEnhancement(a,'one','Mistweave'),/Choose an enhancement/);
 B.setEnhancement(a,'one',choices[1].id);assert.equal(a.units[0].enhancementId,choices[1].id);
});
