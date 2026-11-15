const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),P=require('../dist/unit-profiles.js'),W=require('../dist/workshop-browser.js'),Q=require('../dist/practice.js'),B=require('../dist/list-builder.js'),R=require('../dist/rule-reports.js'),I=require('../dist/rules-import.js');
const {consolidate,baseline}=require('../scripts/share-marine-units.cjs');
const audited=require('../scripts/audit-marines.cjs').audit(require('./fixtures/marines-audit-before.json')).after;
const revisions=new Map(baseline.map(r=>[r.key,r.revision]));
const before=audited.map(r=>revisions.has(r.key)?{...r,revision:revisions.get(r.key)}:r),result=consolidate(before),changed=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>changed.get(r.key)||r);
const bankHash=bank=>require('node:crypto').createHash('sha256').update(JSON.stringify(bank)).digest('hex');
const chapters=[...new Set(baseline.map(r=>r.faction))];
test.afterEach(()=>C.reset());
test('1,094 copies become 177 shared datasheets with exact original chapter availability',()=>{
 assert.equal(result.summary.length,177);assert.equal(result.changes.filter(r=>!r.enabled).length,917);
 assert.equal(W.entries(after,W.ALL,'unit').filter(r=>chapters.includes(r.faction)).length,177);
 for(const faction of chapters){const old=before.filter(r=>r.kind==='unit'&&r.faction===faction);assert.deepEqual(W.entries(after,faction,'unit').map(r=>r.name).sort(),old.map(r=>r.name).sort());}
 assert.ok(W.entries(after,'Blood Angels','unit').some(r=>r.name==='Commander Dante'));assert.ok(!W.entries(after,'Dark Angels','unit').some(r=>r.name==='Commander Dante'));
 assert.equal(W.entries(after,'Blood Angels','unit').filter(r=>r.name==='Intercessor Squad').length,1);
});
test('runtime identities, profiles, keywords, model counts, ability parameters and attachments remain identical',()=>{
 C.apply(before);const old=structuredClone(L.catalog.units.filter(u=>chapters.includes(u.faction)));C.apply(after);
 for(const unit of old){const current=L.catalog.units.find(u=>u.faction===unit.faction&&u.id===unit.id);assert.ok(current,unit.faction+' '+unit.name);for(const key of ['name','keywords','modelCounts','abilities','bodyguardIds','legend','importSource'])assert.deepEqual(current[key],unit[key],unit.faction+' '+unit.name+' '+key);assert.deepEqual(P.read(current),P.read(unit));}
 const lancer=L.unitInfo('Gladiator Lancer','Black Templars');assert.ok(lancer.abilities.some(a=>a.id==='aquilon-optics-black-templars-black-templars'));assert.ok(!lancer.abilities.some(a=>a.id==='aquilon-optics-adeptus-astartes-blood-angels'));
});
test('every chapter produces the same practice bank after deduplication',()=>{
 const banks=new Map();C.apply(before);for(const faction of chapters)banks.set(faction,bankHash(Q.buildBank({faction,rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments,random:()=>0.5})));
 C.apply(after);for(const faction of chapters)assert.equal(bankHash(Q.buildBank({faction,rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments,random:()=>0.5})),banks.get(faction),faction);
});
test('one profile edit updates all chapter copies and reports point to the editable shared datasheet',()=>{
 const rows=structuredClone(after),shared=rows.find(r=>r.key==='unit:intercessor-squad');shared.data.profiles=P.read(shared.data);shared.data.profiles[0].T=9;C.apply(rows);
 for(const faction of chapters){assert.equal(P.read(L.unitInfo('Intercessor Squad',faction))[0].T,9);const bank=Q.buildBank({faction,rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments,random:()=>0.5});const question=bank.questions.find(q=>q.mode==='stats'&&q.review.units[0].name==='Intercessor Squad');assert.ok(question);assert.equal(R.practiceContext(question,rows).defaultKey,'unit:intercessor-squad');}
 assert.notEqual(P.read(L.unitInfo('Aggressor Squad','Blood Angels'))[0].T,9);
 const state={army:{faction:'Blood Angels',detachments:['Gladius Task Force']},phase:2,turn:'you'},page={id:'shoot',window:'select',title:'Shoot'},deck={unitCards:[{unit:{members:[{name:'Intercessor Squad'}]},items:[]}]};assert.ok(R.pageContext(state,page,deck,rows).options.some(o=>o.key==='unit:intercessor-squad'));
});
test('Workshop related abilities and army builder remain chapter-specific',()=>{
 C.apply(after);const shared=after.find(r=>r.key==='unit:gladiator-lancer');
 const bt=W.related(after,shared,'Black Templars'),ba=W.related(after,shared,'Blood Angels');assert.ok(bt.some(r=>r.key==='rule:aquilon-optics-black-templars-black-templars'));assert.ok(!bt.some(r=>r.faction==='Blood Angels'));assert.ok(ba.some(r=>r.key==='rule:aquilon-optics-adeptus-astartes-blood-angels'));
 const army={faction:'Blood Angels',units:[]};B.add(army,'intercessor-squad-blood-angels','one');assert.equal(army.units[0].name,'Intercessor Squad');assert.throws(()=>B.add(army,'intercessor-squad-dark-angels','other'),/Choose a unit/);
 const captain=L.unitInfo('Captain','Blood Angels');assert.ok(!captain.bodyguardIds.some(id=>id.includes('black-templars')));
});
test('catalog edits, variants, new scope and duplicate memberships require review',()=>{
 for(const edit of [r=>r.data.modelCounts=[99],r=>r.data.importSource.record.profiles[0].T=99,r=>r.data.abilities.push({id:'new-rule'}),r=>r.revision++]){const rows=structuredClone(before);edit(rows.find(r=>r.key==='unit:intercessor-squad-blood-angels'));assert.throws(()=>consolidate(rows),/changed/);}
 const rows=structuredClone(before);rows.push({...rows.find(r=>r.key==='unit:intercessor-squad-blood-angels'),key:'unit:new'});assert.throws(()=>consolidate(rows),/scope changed/);
 const shared=structuredClone(after.find(r=>r.key==='unit:intercessor-squad'));shared.data.unitMemberships.push(shared.data.unitMemberships[0]);assert.throws(()=>C.validate(shared),/each unit faction once/);
});
test('archived original source data stays intact and imports cannot resurrect copies or remove sharing',()=>{
 for(const r of result.changes.filter(r=>!r.enabled)){const old=before.find(o=>o.key===r.key);assert.deepEqual(r.data.importSource,old.data.importSource);assert.deepEqual(r.data.abilities,old.data.abilities);assert.deepEqual(r.data.bodyguardIds,old.data.bodyguardIds);}
 const archived=result.changes.find(r=>!r.enabled),shared=result.changes.find(r=>r.enabled);
 for(const old of [archived,shared]){const proposed=structuredClone(old);delete proposed.data.sharedUnitId;delete proposed.data.unitMemberships;proposed.enabled=true;const review={rows:[{name:old.name,before:old,proposed,sourceOnly:old,action:'replace'}]};assert.throws(()=>I.selected(review),/shared unit/);review.rows[0].action='source';assert.deepEqual(I.selected(review),[old]);}
});
