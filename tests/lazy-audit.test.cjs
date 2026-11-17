const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {updates}=require('../dist/aeldari-audit-data.js'),full=require('../dist/aeldari-audit-data.js');
function browser(){
 const scripts=[],root={};const context=vm.createContext({window:root,structuredClone,document:{createElement:()=>({remove(){this.removed=true}}),head:{append:node=>scripts.push(node)}}});
 vm.runInContext(fs.readFileSync(require.resolve('../dist/aeldari-audit.js'),'utf8'),context);
 return {api:root.WarPlannerAeldariAudit,scripts,complete(){vm.runInContext(fs.readFileSync(require.resolve('../dist/aeldari-audit-data.js'),'utf8'),context);scripts.at(-1).onload();}};
}
const rows=updates.map(u=>({kind:'rule',enabled:true,data:structuredClone(u.before)}));
const imported=rows.find(r=>r.data.expanded);
test('current rules, unrelated factions and admin edits do not request legacy audit data',async()=>{
 const b=browser();await b.api.ensure([{kind:'rule',enabled:true,data:{id:'space-marine-rule',faction:'Space Marines'}}]);
 await b.api.ensure(rows.map(r=>({...r,data:{...r.data,summary:'Administrator checked this rule'}})));
 await b.api.ensure(rows.map(r=>({...r,data:{...r.data,summary:'Current checked wording'}})));
 await b.api.ensure(rows.map(r=>({...r,data:{...r.data,sharedRuleId:'canonical-rule'}})));
 await b.api.ensure(rows.map(r=>({...r,data:{...r.data,siteExcluded:'combat-patrol'}})));
 assert.equal(b.scripts.length,0);
});
test('bundled sample corrections remain available without loading the historical dataset',async()=>{
 const b=browser(),seed=updates.filter(u=>!u.before.expanded);
 assert.equal(seed.length,3);
 for(const u of seed)assert.equal(JSON.stringify(b.api.enrich(u.before)),JSON.stringify(full.enrich(u.before)));
 await b.api.ensure(seed.map(u=>({kind:'rule',enabled:true,data:u.before})));assert.equal(b.scripts.length,0);
});
test('matching legacy rules load once and retain exact presentation parity for every replacement',async()=>{
 const b=browser(),one=b.api.ensure(rows),two=b.api.ensure(rows);assert.equal(b.scripts.length,1);assert.equal(b.scripts[0].src,'aeldari-audit-data.js');
 b.complete();await Promise.all([one,two]);
 for(const row of rows)assert.equal(JSON.stringify(b.api.enrich(row.data)),JSON.stringify(full.enrich(row.data)),row.data.id);
 await b.api.ensure(rows);assert.equal(b.scripts.length,1);
});
test('network failure rejects the pending load and permits retry',async()=>{
 const b=browser(),failed=b.api.ensure([imported]);b.scripts[0].onerror();await assert.rejects(failed,/retry/);assert.equal(b.scripts[0].removed,true);
 const retry=b.api.ensure([imported]);assert.equal(b.scripts.length,2);b.complete();await retry;
});
test('edited rules remain unchanged even after compatibility data has loaded',async()=>{
 const b=browser(),pending=b.api.ensure([imported]);b.complete();await pending;
 for(const row of rows){const edited={...row.data,guide:{note:'Custom admin note'}};assert.equal(b.api.enrich(edited),edited);}
});
test('a script that fails to register cannot silently publish uncorrected rules',async()=>{
 const b=browser(),pending=b.api.ensure([imported]);b.scripts[0].onload();await assert.rejects(pending,/retry/);
});
