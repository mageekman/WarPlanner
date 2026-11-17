const test=require('node:test'),assert=require('node:assert/strict'),P=require('../dist/report-picker.js');
const row=(id,faction,detachment='',extra={})=>({key:'rule:'+id,kind:'rule',name:id,faction,enabled:true,revision:3,data:{id,category:'ability',summary:'Move after shooting.',detachment,...extra}});
const records=[row('Alpha','Aeldari','Warhost'),row('Beta','Aeldari','Aspect Host'),row('Gamma','Orks','War Horde'),row('Shared','*'),row('Chapter shared','Space Marines','',{memberships:[{faction:'Dark Angels',detachments:['Lion']},{faction:'Blood Angels',detachments:['Sons']}]})];
test('search combines faction, detachment and type filters rather than replacing them',()=>{
 assert.deepEqual(P.filter(records,{faction:'Aeldari',detachment:'Warhost',search:'shooting'}).map(r=>r.name),['Alpha','Shared']);
 assert.deepEqual(P.filter(records,{faction:'Aeldari',detachment:'Warhost',search:'Beta'}),[]);
 assert.deepEqual(P.filter(records,{faction:'Orks',type:'stratagem'}),[]);
 assert.equal(P.filter(records,{search:' MOVE shooting '}).length,5);
});
test('shared memberships keep faction and detachment matches together and include global rules',()=>{
 assert.deepEqual(P.filter(records,{faction:'Dark Angels',detachment:'Sons'}).map(r=>r.name),['Shared']);
 assert.deepEqual(P.filter(records,{faction:'Dark Angels',detachment:'Lion'}).map(r=>r.name),['Chapter shared','Shared']);
 assert.deepEqual(P.detachments(records,'Dark Angels'),['Lion']);assert.ok(P.factions(records).includes('Blood Angels'));assert.ok(!P.factions(records).includes('*'));
});
test('disabled, archived and alias records are excluded; unit search and empty results work without mutation',()=>{
 const rows=[...records,row('Hidden','Aeldari'),row('Patrol','Aeldari','',{siteExcluded:'combat-patrol'}),row('Alias','Aeldari','',{sharedRuleId:'Alpha'}),row('Unit ability','Aeldari','',{units:['Shroud Runners']})];rows[5].enabled=false;const before=JSON.stringify(rows);
 assert.deepEqual(P.filter(rows,{search:'shroud'}).map(r=>r.name),['Unit ability']);assert.equal(P.filter(rows).length,6);assert.deepEqual(P.filter(rows,{search:'no such rule'}),[]);assert.equal(JSON.stringify(rows),before);
});
