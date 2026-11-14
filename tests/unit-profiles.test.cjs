const test=require('node:test'),assert=require('node:assert/strict'),P=require('../dist/unit-profiles.js'),C=require('../dist/content.js');
const imported={name:'Strike Squad',importSource:{record:{profiles:[{name:'Grey Knight',M:6,T:4,Sv:2,W:2,Ld:6,OC:2,invuln_sv:null,source_extra:'retain'}]}}};
test('profiles prefill from imported data without modifying the source, and saved overrides win including an explicitly empty array',()=>{
 const original=structuredClone(imported),profiles=P.read(imported);assert.equal(profiles[0].T,4);profiles[0].T=5;assert.deepEqual(imported,original);
 assert.equal(P.read({...imported,profiles})[0].T,5);assert.deepEqual(P.read({...imported,profiles:[]}),[]);assert.deepEqual(P.read({name:'Fire Dragons'}),[]);
});
test('individual stat inputs normalize units and target numbers while preserving zero, unknown and variable values',()=>{
 assert.equal(P.parse('6″','M'),6);assert.equal(P.parse('3+','Sv'),3);assert.equal(P.parse('6+','Ld'),6);assert.equal(P.parse('0','OC'),0);assert.equal(P.parse('','T'),null);assert.equal(P.parse('2d6+1','M'),'2D6+1');assert.equal(P.parse('-','M'),'-');
 P.validate([{name:'Variable profile',M:'2D6+1',T:4,Sv:3,W:2,Ld:6,OC:0,invuln_sv:null}]);
});
test('multiple model profiles keep names, distinct stat lines and unrecognized source metadata',()=>{
 const source={importSource:{record:{profiles:[{name:'Leader',T:4,W:3,source_extra:'keep'},{name:'Servitor',T:3,W:1}]}}};const result=P.read(source);assert.equal(result.length,2);assert.equal(result[0].source_extra,'keep');assert.equal(result[1].T,3);P.validate(result);
});
test('catalog validation rejects malformed profiles and invalid numeric values without requiring stats on existing units',()=>{
 const unit=C.seed().find(r=>r.kind==='unit');C.validate(unit);unit.data.profiles=structuredClone(P.read(imported));C.validate(unit);
 for(const profiles of [{},[{name:'Bad',T:-1}],[{name:'Bad',Sv:0}],[{name:'Bad',M:Infinity}],[{name:'Bad',T:'banana'}],[{name:'',T:4}],Array.from({length:21},()=>({name:'Too many'}))]){unit.data.profiles=profiles;assert.throws(()=>C.validate(unit));}
});
test('source-only reimports preserve workshop stats while refreshing the immutable raw source',()=>{
 const I=require('../dist/rules-import.js'),unit=C.seed().find(r=>r.key==='unit:fire-dragons');unit.data.profiles=[{name:'Edited profile',M:7,T:4,Sv:3,W:1,Ld:6,OC:1,invuln_sv:null}];
 const source={id:'fire-dragons',name:'Fire Dragons',faction_id:'aeldari',keywords:[],ability_ids:[],profiles:[{name:'New source profile',M:12,T:5}]};
 const plan=I.plan(I.parse([{name:'units.json',text:JSON.stringify([source])}],{faction:'Aeldari',group:'Xenos'},[unit]),[unit]),entry=plan.rows.find(r=>r.key===unit.key);
 assert.equal(entry.action,'source');assert.equal(P.read(entry.sourceOnly.data)[0].M,7);assert.equal(entry.sourceOnly.data.importSource.record.profiles[0].M,12);assert.deepEqual(unit.data.profiles,[{name:'Edited profile',M:7,T:4,Sv:3,W:1,Ld:6,OC:1,invuln_sv:null}]);
});
