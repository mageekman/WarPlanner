/* Consolidate reviewed datasheet copies, retaining explicit chapter context. */
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),C=require('../dist/content.js');
const baseline=require('./marine-unit-baseline.json');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=row=>crypto.createHash('sha256').update(JSON.stringify(stable(Object.fromEntries(['kind','faction','name','data','enabled'].map(k=>[k,row[k]]))))).digest('hex');
function consolidate(rows){
 const factions=new Set(baseline.map(r=>r.faction)),units=rows.filter(r=>r.kind==='unit'&&factions.has(r.faction));
 assert.equal(units.length,baseline.length,'Marine unit scope changed; review the catalog again.');
 const byKey=new Map(units.map(r=>[r.key,r]));
 for(const old of baseline){const row=byKey.get(old.key);assert.ok(row,'Unit missing: '+old.key);assert.equal(row.revision,old.revision,'Unit revision changed: '+old.key);assert.equal(digest(row),old.digest,'Unit changed: '+old.key);}
 const groups=new Map(),byId=new Map(units.map(r=>[r.data.id,r]));
 for(const r of units){const id=r.data.importSource?.sourceId;assert.ok(id,'Missing source identity: '+r.key);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);}
 const omit=new Set(['id','faction','inheritedFrom','duplicatedFrom','keywords','abilities','bodyguardIds']);
 const common=r=>stable(Object.fromEntries(Object.entries(r.data).filter(([k])=>!omit.has(k))));
 const source=id=>byId.get(id)?.data.importSource.sourceId;
 const changes=[],summary=[];
 for(const [sourceId,group] of groups){
  const base=group.find(r=>r.faction==='Space Marines');assert.ok(base,'Missing parent datasheet: '+sourceId);assert.ok(group.length>1,'No shared copies: '+sourceId);
  const members=[base,...group.filter(r=>r!==base).sort((a,b)=>a.faction.localeCompare(b.faction))];
  const data=structuredClone(base.data);data.unitMemberships=[];
  for(const r of members){
   assert.deepEqual(common(r),common(base),'Datasheet variants must stay separate: '+r.key);
   const keywordAdditions=r.data.keywords.filter(k=>!base.data.keywords.includes(k));assert.deepEqual([...base.data.keywords,...keywordAdditions],r.data.keywords,'Non-additive chapter keywords: '+r.key);
   const bodyguards=base.data.bodyguardIds.flatMap(id=>{const match=groups.get(source(id))?.find(u=>u.faction===r.faction);return match?[match.data.id]:[];});
   assert.deepEqual(bodyguards,r.data.bodyguardIds,'Chapter attachment restriction differs: '+r.key);
   data.unitMemberships.push({faction:r.faction,unitId:r.data.id,keywordAdditions,abilities:structuredClone(r.data.abilities)});
  }
  changes.push({...structuredClone(base),data});
  for(const r of members.slice(1))changes.push({...structuredClone(r),enabled:false,data:{...structuredClone(r.data),sharedUnitId:base.data.id}});
  summary.push({id:base.data.id,name:base.name,factions:members.map(r=>r.faction)});
 }
 changes.forEach(C.validate);return {changes,summary};
}
module.exports={consolidate,digest,baseline};
if(require.main===module){
 const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Provide a current catalog JSON path and output SQL path.');
 const result=consolidate(JSON.parse(fs.readFileSync(input))),entries=result.changes.map(({key,kind,faction,name,data,enabled,revision})=>({key,kind,faction,name,data,enabled,expectedRevision:revision}));
 let sql="begin;\nselect set_config('request.jwt.claim.sub',(select user_id::text from public.site_admins),true);\nset local role authenticated;\n";
 for(let i=0;i<entries.length;i+=500){const payload=JSON.stringify(entries.slice(i,i+500));assert.ok(!payload.includes('$shared_units$'));sql+='select count(*) as entries_saved from public.import_rules_catalog($shared_units$'+payload+'$shared_units$::jsonb);\n';}
 fs.writeFileSync(out,sql+'commit;\n');fs.writeFileSync(out+'.summary.json',JSON.stringify(result.summary,null,2));console.log(JSON.stringify({sharedDatasheets:result.summary.length,archivedCopies:entries.length-result.summary.length,changed:entries.length}));
}
