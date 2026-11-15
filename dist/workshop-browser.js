/* Folder navigation for the shared rules catalog; writes remain in the admin service. */
(function(root){
 'use strict';
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),sort=(a,b)=>a.name.localeCompare(b.name);
 const ALL='__all__',SHARED='__shared__';
 const memberships=r=>r.kind==='unit'&&r.data.unitMemberships||r.kind==='rule'&&r.data.memberships||[{faction:r.faction,detachments:r.data.detachment?[r.data.detachment]:[]}];
 const visible=r=>!r.data.sharedRuleId&&!r.data.sharedUnitId;
 const definitions=[
  {id:'faction',name:'Faction details',kind:'faction'},
  {id:'unit',name:'Units',kind:'unit'},
  {id:'detachment',name:'Detachments',kind:'detachment'},
  {id:'army',name:'Army & detachment rules',kind:'rule',category:'army'},
  {id:'ability',name:'Abilities',kind:'rule',category:'ability'},
  {id:'core-stratagem',name:'Core Stratagems',kind:'rule',category:'core-stratagem'},
  {id:'stratagem',name:'Stratagems',kind:'rule',category:'stratagem'},
  {id:'enhancement',name:'Enhancements',kind:'rule',category:'enhancement'},
  {id:'rule',name:'All rules & abilities',kind:'rule'},
  {id:'step',name:'Core guide pages',kind:'step'}
 ];
 function factions(records){
  const found=new Map();
  for(const r of records.filter(r=>r.kind==='faction'))found.set(norm(r.name),{id:r.name,name:r.name,group:r.data.group||'Other'});
  for(const r of records)if(r.faction&&r.faction!=='*'&&!found.has(norm(r.faction)))found.set(norm(r.faction),{id:r.faction,name:r.faction,group:'Other'});
  for(const r of records.filter(visible))for(const m of memberships(r))if(m.faction&&m.faction!=='*'&&!found.has(norm(m.faction)))found.set(norm(m.faction),{id:m.faction,name:m.faction,group:'Other'});
  const order=['Space Marines','Imperium','Chaos','Xenos','Other'];return [...found.values()].sort((a,b)=>order.indexOf(a.group)-order.indexOf(b.group)||sort(a,b));
 }
 function scoped(records,scope){
  if(!scope)return [];
  records=records.filter(visible);
  if(scope===ALL)return records;
  if(scope===SHARED)return records.filter(r=>r.kind==='step'||r.faction==='*'||!r.faction&&r.kind!=='faction');
  return records.filter(r=>r.kind==='faction'?norm(r.name)===norm(scope):memberships(r).some(m=>norm(m.faction)===norm(scope)||m.faction==='*'&&r.data.memberships));
 }
 function entries(records,scope,folder){
  const def=definitions.find(d=>d.id===folder);if(!def)return [];
  return scoped(records,scope).filter(r=>r.kind===def.kind&&(!def.category||r.data.category===def.category)).sort(sort);
 }
 function folders(records,scope){
  if(!scope)return [];
  const rows=scoped(records,scope),counts=new Map();
  for(const r of rows){counts.set(r.kind,(counts.get(r.kind)||0)+1);if(r.kind==='rule')counts.set('category:'+r.data.category,(counts.get('category:'+r.data.category)||0)+1);}
  return definitions.filter(d=>d.id!=='step'||scope===SHARED||scope===ALL).filter(d=>scope!==SHARED||!['faction','unit','detachment'].includes(d.id)).map(d=>({...d,name:d.id==='faction'&&scope===ALL?'Factions':d.name,count:counts.get(d.category?'category:'+d.category:d.kind)||0}));
 }
 function related(records,parent,scope=parent?.faction){
  if(!parent||!['detachment','unit'].includes(parent.kind))return [];
  const member=parent.data.unitMemberships?.find(m=>norm(m.faction)===norm(scope)),faction=member?.faction||parent.faction;
  const refs=(parent.kind==='unit'?member?.abilities||parent.data.abilities||[]:[...(parent.data.rules||[]),...(parent.data.stratagems||[]),...(parent.data.enhancements||[])]).map(r=>norm(typeof r==='string'?r:r.id||r.name)).filter(Boolean);
  return records.filter(r=>visible(r)&&r.kind==='rule'&&memberships(r).some(m=>norm(m.faction)===norm(faction)||m.faction==='*')&&(parent.kind==='detachment'?memberships(r).some(m=>(norm(m.faction)===norm(faction)||m.faction==='*')&&(r.data.memberships&&!m.detachments.length||m.detachments.some(d=>norm(d)===norm(parent.name))))||!r.data.memberships&&[r.data.id,r.data.sourceRuleId,r.name,...(r.data.sharedRuleIds||[])].some(id=>refs.includes(norm(id))):(r.data.units||[]).some(n=>norm(n)===norm(parent.name))||[r.data.id,r.data.sourceRuleId,r.name,...(r.data.sharedRuleIds||[])].some(id=>refs.includes(norm(id))))).sort(sort);
 }
 function review(records,{faction,detachment='',query=''}={}){
  const L=typeof module!=='undefined'&&module.exports?require('./lessons.js'):root.WarPlanLessons;
  const canonical=records.filter(visible),core=faction===SHARED;
  const rows=core?canonical.filter(r=>r.kind==='rule'&&r.faction==='*'):scoped(canonical,faction);
  const detachmentNames=[...new Set(rows.flatMap(r=>r.kind==='detachment'?[r.name]:r.kind==='rule'?L.ruleDetachments({...r.data,faction:r.faction},faction):[]))].sort((a,b)=>a.localeCompare(b));
  detachment=detachmentNames.find(d=>norm(d)===norm(detachment))||'';
  const eligible=r=>!detachment||(r.kind==='rule'?L.ruleInArmy({...r.data,faction:r.faction},{faction,detachments:[detachment]}):r.kind==='detachment'?norm(r.name)===norm(detachment):!r.data.detachment||norm(r.data.detachment)===norm(detachment));
  const source=rows.filter(eligible),allowed=new Set(source.map(r=>r.key)),rulePool=canonical.filter(r=>r.kind==='rule'&&(r.faction==='*'||allowed.has(r.key))&&eligible(r));
  const q=String(query).trim().toLowerCase(),matches=r=>!q||[r.name,r.data.summary,r.data.description,...(r.data.keywords||[]),...(r.data.conditions||[]),...(r.data.abilities||[]).map(a=>typeof a==='string'?a:a.id)].join(' ').toLowerCase().includes(q);
  const units=source.filter(r=>r.kind==='unit').sort(sort).map(row=>({row,rules:related(rulePool,row,faction)})).filter(u=>matches(u.row)||u.rules.some(matches));
  const rules=source.filter(r=>r.kind==='rule'&&matches(r)).sort(sort);
  return {detachment,detachmentNames,units,rules,armyRules:rules.filter(r=>r.data.category==='army'&&!L.ruleDetachments({...r.data,faction:r.faction},faction).length),detachments:source.filter(r=>r.kind==='detachment').sort(sort).map(row=>({row,rules:related(rulePool,row,faction).filter(matches)})).filter(d=>matches(d.row)||d.rules.length),matches};
 }
 const api={ALL,SHARED,definitions,factions,scoped,entries,folders,related,review};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerWorkshopBrowser=api;
})(typeof window!=='undefined'?window:globalThis);
