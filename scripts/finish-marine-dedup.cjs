/* Consolidate only equivalent reviewed Marine rules; archive originals through the revision-checked admin RPC. */
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),C=require('../dist/content.js');
const sources=require('../tests/fixtures/marines-audit-sources.json');
const rawById=new Map(Object.entries(sources).filter(([file])=>file.startsWith('enrichment/')&&file.endsWith('/abilities.json')).flatMap(([,rows])=>rows.map(r=>[r.ability_id,r])));
const stable=v=>JSON.stringify(v,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const hash=v=>crypto.createHash('sha256').update(stable(v)).digest('hex'),copy=v=>structuredClone(v),norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const omit=(data,keys)=>Object.fromEntries(Object.entries(data).filter(([k])=>!keys.includes(k)));
function source(row){const audit=row.data.summaryAudit,raw=rawById.get(audit?.mechanicsSourceId);return raw&&hash(raw)===audit.mechanicsHash?raw:row.data.importSource?.record&&hash(row.data.importSource.record)===audit?.mechanicsHash?row.data.importSource.record:null;}
function automaticTarget(d,faction=d.faction){return d.targetText==='Eligible '+faction+' units or targets specified in the summary.'||d.targetText==='This '+(d.units||[]).join(' / ')+'. Apply the summary’s target and range conditions.';}
function fingerprint(row){
 const d=copy(row.data),raw=source(row);if(!raw||d.memberships||d.sharedRuleId)return 'separate:'+row.key;
 const fields=omit(d,['id','name','faction','importSource','summaryAudit','sourceRuleId','inheritedFrom','duplicatedFrom','mechanicsDetails','detachment','units','targetText']);
 for(const [k,v] of Object.entries({enhancement:null,bearerKeywords:[],bearerRestrictions:[],enhancementUpgrade:false}))if(fields[k]===undefined||fields[k]==='')fields[k]=v;
 return hash({name:norm(row.name),fields,mechanics:omit(raw,['ability_id','faction_id','detachment_id','unit_ids','name','source_digest','authored_by']),core:omit(d.summaryAudit.coreSource||{},['id','ability_id','name','detachment_id','external_refs']),target:automaticTarget(d,row.faction)?'automatic-unit-list':d.targetText||''});
}
function scope(rs,faction){const units=rs.every(r=>stable(r.data.units)===stable(rs[0].data.units))?copy(rs[0].data.units):rs.some(r=>!r.data.units.length)?[]:[...new Set(rs.flatMap(r=>r.data.units))];const targetText=rs.length>1&&rs.every(r=>automaticTarget(r.data,r.faction))?'Eligible '+faction+' units or targets specified in the summary.':rs[0].data.targetText||'';return {units,targetText};}
function consolidate(rows){
 const baseline=require('./marine-dedup-baseline.json'),byKey=new Map(rows.map(r=>[r.key,r]));assert.equal(rows.length,baseline.length,'Catalog scope changed');for(const old of baseline){const row=byKey.get(old.key);assert.ok(row,'Missing '+old.key);const {revision,...data}=row;assert.equal(revision,old.revision,'Revision changed '+old.key);assert.equal(hash(Object.fromEntries(['key','kind','faction','name','data','enabled'].map(k=>[k,data[k]]))),old.digest,'Content changed '+old.key);}
 const rules=rows.filter(r=>r.enabled&&r.kind==='rule'&&!r.data.sharedRuleId),groups=new Map();for(const row of rules){const key=fingerprint(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const changes=[],summary=[],variants=[];
 for(const group of groups.values()){
  if(group.length<2)continue;
  // A single faction cannot gain different unit eligibility across detachments.
  const factionGroups=Map.groupBy(group,r=>r.faction);
  if([...factionGroups.values()].some(rs=>new Set(rs.map(r=>stable([r.data.units,r.data.targetText]))).size>1&&new Set(rs.map(r=>r.data.detachment||'')).size>1)){variants.push(group.map(r=>r.key));continue;}
  const ordered=[...group].sort((a,b)=>(Number(b.faction==='Space Marines')-Number(a.faction==='Space Marines'))||a.key.localeCompare(b.key)),base=ordered[0],data=copy(base.data);
  data.faction=base.faction;data.detachment='';Object.assign(data,scope(factionGroups.get(base.faction),base.faction));
  data.memberships=[...factionGroups].sort(([a],[b])=>a.localeCompare(b)).map(([faction,rs])=>{const member={faction,detachments:rs.some(r=>!r.data.detachment)?[]:[...new Set(rs.map(r=>r.data.detachment))].sort()};const scoped=scope(rs,faction);if(stable(scoped.units)!==stable(data.units))member.units=scoped.units;if(scoped.targetText!==data.targetText)member.targetText=scoped.targetText;return member;});
  data.sharedRuleIds=[...new Set(ordered.flatMap(r=>[r.data.id,...(r.data.sharedRuleIds||[])]))].filter(id=>id!==data.id).sort();delete data.inheritedFrom;delete data.duplicatedFrom;
  changes.push({...copy(base),data});for(const old of ordered.slice(1))changes.push({...copy(old),enabled:false,data:{...copy(old.data),sharedRuleId:data.id}});
  summary.push({id:data.id,name:base.name,copies:group.length,memberships:copy(data.memberships)});
 }
 changes.forEach(C.validate);
 const unitRows=rows.filter(r=>r.enabled&&r.kind==='unit');assert.equal(new Set(unitRows.map(r=>norm(r.name))).size,unitRows.length,'Unreviewed duplicate unit names');
 return {changes,summary,variants,units:unitRows.length};
}
function plan(rows,changes){const byKey=new Map(rows.map(r=>[r.key,r]));return changes.map(r=>{const old=byKey.get(r.key);return {key:r.key,expectedRevision:old.revision,enabled:r.enabled,patch:Object.fromEntries(Object.entries(r.data).filter(([k,v])=>!(k in old.data)||hash(v)!==hash(old.data[k]))),remove:Object.keys(old.data).filter(k=>!(k in r.data))};});}
function sql(operations,actor){assert.match(actor,/^[a-f0-9-]{36}$/i);let text="begin;\nselect set_config('request.jwt.claim.sub','"+actor+"',true);\nset local role authenticated;\n";for(let i=0;i<operations.length;i+=500){const batch=JSON.stringify(operations.slice(i,i+500));assert.ok(!batch.includes('$marine_dedup$'));text+=`with plan as (select value as p from jsonb_array_elements($marine_dedup$${batch}$marine_dedup$::jsonb)), entries as (select jsonb_agg(jsonb_build_object('key',p->>'key','kind',r.kind,'faction',r.faction,'name',r.name,'data',(r.data || (p->'patch')) - array(select jsonb_array_elements_text(p->'remove')),'enabled',(p->>'enabled')::boolean,'expectedRevision',(p->>'expectedRevision')::integer)) as payload from plan left join public.rules_catalog r on r.key=p->>'key') select count(*) as entries_saved from entries cross join lateral public.import_rules_catalog(entries.payload);\n`; }return text+'commit;\n';}
module.exports={consolidate,fingerprint,hash,plan,sql};
if(require.main===module){const [input,out,actor]=process.argv.slice(2);assert.ok(input&&out,'Provide catalog JSON and output prefix');const rows=JSON.parse(fs.readFileSync(input)),result=consolidate(rows),operations=plan(rows,result.changes);fs.writeFileSync(out+'.changes.json',JSON.stringify(result.changes));fs.writeFileSync(out+'.plan.ndjson',operations.map(p=>JSON.stringify(p)).join('\n')+'\n');if(actor)fs.writeFileSync(out+'.sql',sql(operations,actor));fs.writeFileSync(out+'.summary.json',JSON.stringify({...result,changes:undefined},null,2));console.log({sharedRules:result.summary.length,archived:result.changes.filter(r=>!r.enabled).length,units:result.units,variants:result.variants.length});}
