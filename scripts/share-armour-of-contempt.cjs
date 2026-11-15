/* Reviewed one-time catalog consolidation; generates an admin RPC transaction. */
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../dist/content.js');
const baseline=require('../tests/fixtures/armour-of-contempt-before.json');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
function consolidate(rows){
 const current=rows.filter(r=>r.kind==='rule'&&/^(armour|armor) of contempt$/i.test(r.name));
 assert.equal(current.length,baseline.length,'The Armour of Contempt catalog scope changed; review it again.');
 for(const old of baseline){const row=current.find(r=>r.key===old.key);assert.ok(row,'Entry missing: '+old.key);assert.deepEqual(stable(Object.fromEntries(Object.keys(old).map(k=>[k,row[k]]))),stable(old),'Entry changed: '+old.key);}
 const base=baseline.find(r=>r.faction==='Space Marines'&&r.data.detachment==='Gladius Task Force');
 const data=structuredClone(base.data),id='shared-armour-of-contempt';
 data.id=id;data.faction='Space Marines';data.detachment='';data.sourceRuleId=id;
 data.memberships=[...new Set(baseline.map(r=>r.faction))].map(faction=>({faction,detachments:[...new Set(baseline.filter(r=>r.faction===faction).map(r=>r.data.detachment))].sort()}));
 data.sharedRuleIds=baseline.map(r=>r.data.id);
 delete data.inheritedFrom;delete data.summaryAudit;
 const shared={key:'rule:'+id,kind:'rule',name:base.name,faction:'Space Marines',data,enabled:true,revision:0};
 const aliases=baseline.map(r=>({...structuredClone(r),enabled:false,data:{...structuredClone(r.data),sharedRuleId:id}}));
 const changes=[shared,...aliases];changes.forEach(C.validate);return changes;
}
module.exports={consolidate};
if(require.main===module){
 const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Provide a current catalog JSON file and output SQL path.');
 const entries=consolidate(JSON.parse(fs.readFileSync(input))).map(({key,kind,faction,name,data,enabled,revision})=>({key,kind,faction,name,data,enabled,expectedRevision:revision}));
 fs.writeFileSync(out,"begin;\nselect set_config('request.jwt.claim.sub',(select user_id::text from public.site_admins),true);\nset local role authenticated;\nselect count(*) as entries_saved from public.import_rules_catalog($shared_rules$"+JSON.stringify(entries)+"$shared_rules$::jsonb);\ncommit;\n");
 console.log('Prepared one shared rule and '+(entries.length-1)+' archived source links.');
}
