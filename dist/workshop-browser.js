/* Folder navigation for the shared rules catalog; writes remain in the admin service. */
(function(root){
 'use strict';
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),sort=(a,b)=>a.name.localeCompare(b.name);
 const ALL='__all__',SHARED='__shared__';
 const definitions=[
  {id:'faction',name:'Faction details',kind:'faction'},
  {id:'unit',name:'Units',kind:'unit'},
  {id:'detachment',name:'Detachments',kind:'detachment'},
  {id:'army',name:'Army & detachment rules',kind:'rule',category:'army'},
  {id:'ability',name:'Abilities',kind:'rule',category:'ability'},
  {id:'stratagem',name:'Stratagems',kind:'rule',category:'stratagem'},
  {id:'enhancement',name:'Enhancements',kind:'rule',category:'enhancement'},
  {id:'rule',name:'All rules & abilities',kind:'rule'},
  {id:'step',name:'Core guide pages',kind:'step'}
 ];
 function factions(records){
  const found=new Map();
  for(const r of records.filter(r=>r.kind==='faction'))found.set(norm(r.name),{id:r.name,name:r.name,group:r.data.group||'Other'});
  for(const r of records)if(r.faction&&r.faction!=='*'&&!found.has(norm(r.faction)))found.set(norm(r.faction),{id:r.faction,name:r.faction,group:'Other'});
  const order=['Space Marines','Imperium','Chaos','Xenos','Other'];return [...found.values()].sort((a,b)=>order.indexOf(a.group)-order.indexOf(b.group)||sort(a,b));
 }
 function scoped(records,scope){
  if(!scope)return [];
  if(scope===ALL)return records;
  if(scope===SHARED)return records.filter(r=>r.kind==='step'||r.faction==='*'||!r.faction&&r.kind!=='faction');
  return records.filter(r=>r.kind==='faction'?norm(r.name)===norm(scope):norm(r.faction)===norm(scope));
 }
 function entries(records,scope,folder){
  const def=definitions.find(d=>d.id===folder);if(!def)return [];
  return scoped(records,scope).filter(r=>r.kind===def.kind&&(!def.category||r.data.category===def.category)).sort(sort);
 }
 function folders(records,scope){
  if(!scope)return [];
  return definitions.filter(d=>d.id!=='step'||scope===SHARED||scope===ALL).filter(d=>scope!==SHARED||!['faction','unit','detachment'].includes(d.id)).map(d=>({...d,name:d.id==='faction'&&scope===ALL?'Factions':d.name,count:entries(records,scope,d.id).length}));
 }
 function related(records,parent){
  if(!parent||!['detachment','unit'].includes(parent.kind))return [];
  const refs=(parent.kind==='unit'?parent.data.abilities||[]:[...(parent.data.rules||[]),...(parent.data.stratagems||[]),...(parent.data.enhancements||[])]).map(r=>norm(typeof r==='string'?r:r.id||r.name)).filter(Boolean);
  return records.filter(r=>r.kind==='rule'&&norm(r.faction)===norm(parent.faction)&&(parent.kind==='detachment'?norm(r.data.detachment)===norm(parent.name)||[r.data.id,r.data.sourceRuleId,r.name].some(id=>refs.includes(norm(id))):(r.data.units||[]).some(n=>norm(n)===norm(parent.name))||[r.data.id,r.data.sourceRuleId,r.name].some(id=>refs.includes(norm(id))))).sort(sort);
 }
 const api={ALL,SHARED,definitions,factions,scoped,entries,folders,related};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerWorkshopBrowser=api;
})(typeof window!=='undefined'?window:globalThis);
