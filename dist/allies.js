/* Assigned Agents: runtime views of source datasheets, never editable copies. */
(function(root){
 'use strict';
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),agent=f=>['imperialagents','agentsoftheimperium'].includes(norm(f));
 const has=(u,k)=>(u?.keywords||[]).some(v=>norm(v)===norm(k));
 function policy(catalog){return catalog.factions?.find(f=>agent(f.name))?.assignedAgents||null;}
 function imperial(catalog,faction){const f=catalog.factions?.find(f=>norm(f.name)===norm(faction)||(f.aliases||[]).some(a=>norm(a)===norm(faction)));return !!f&&['Imperium','Space Marines'].includes(f.group)&&!agent(f.name);}
 const indexes=new WeakMap();
 function invalidate(catalog){indexes.delete(catalog);}
 function index(catalog){let cached=indexes.get(catalog);if(cached&&cached.units===catalog.units&&cached.length===catalog.units.length&&cached.factions===catalog.factions&&cached.factionCount===(catalog.factions?.length||0))return cached;
  const aliases=new Map();for(const f of catalog.factions||[])for(const name of [f.name,...(f.aliases||[])])aliases.set(norm(name),norm(f.name));if(!aliases.size){aliases.set('asuryani','aeldari');aliases.set('aeldari','aeldari');}
  const canonical=f=>aliases.get(norm(f||'Aeldari'))||norm(f||'Aeldari'),names=new Map();for(const u of catalog.units){const key=canonical(u.faction)+'|'+norm(u.name);if(!names.has(key))names.set(key,[]);names.get(key).push(u);}
  cached={units:catalog.units,length:catalog.units.length,factions:catalog.factions,factionCount:catalog.factions?.length||0,canonical,names};indexes.set(catalog,cached);return cached;
 }
 function resolve(catalog,entry,faction){const name=typeof entry==='string'?entry:entry?.name,cached=index(catalog),choices=cached.names.get(cached.canonical(faction)+'|'+norm(name))||[];
  if(typeof entry==='object'&&entry?.catalogUnitId)return choices.find(u=>u.id===entry.catalogUnitId&&(!entry.catalogFaction||cached.canonical(u.originFaction||u.faction)===cached.canonical(entry.catalogFaction)));
  // Ambiguous imports need a source selection; do not silently choose a variant.
  return choices.length===1?choices[0]:undefined;
 }
 function project(catalog,rules){
  const p=policy(catalog);if(!p?.enabled)return;
  const native=catalog.units.filter(u=>agent(u.faction)&&!u.allied&&has(u,'Imperium')&&has(u,'Agents of the Imperium')&&!p.excludedUnitIds.includes(u.id));
  const sources=rules.filter(r=>agent(r.faction)&&!r.allied);if(!sources.some(r=>r.id===p.sourceRuleId))return;const factions=catalog.factions.filter(f=>imperial(catalog,f.name));
  for(const f of factions){
   const prefix='assigned-'+f.id+'-',id=x=>prefix+x,projected=[];
   for(const u of native){const slot=has(u,'Dedicated Transport')?'transport':has(u,'Character')?'character':has(u,'Retinue')?'retinue':has(u,'Requisitioned')?'requisitioned':null;if(!slot)continue;
    projected.push({...u,id:id(u.id),faction:f.name,originFaction:u.faction,sourceUnitId:u.id,sourceCatalogKey:u.sourceCatalogKey||'unit:'+u.id,allied:true,alliedSlot:slot,bodyguardIds:u.bodyguardIds.map(id),abilities:u.abilities.map(a=>({...a}))});
   }
   const ruleMap=new Map();
   for(const r of sources){if(r.detachment||r.enhancement||!['ability','core','army'].includes(r.category))continue;
    const owners=projected.filter(u=>u.abilities.some(a=>a.id===r.id||a.id===r.sourceRuleId));if(!owners.length)continue;
    const view={...r,id:id(r.id),sourceRuleId:r.id,sourceCatalogKey:r.sourceCatalogKey||'rule:'+r.id,faction:f.name,originFaction:r.faction,allied:true,alliedUnitIds:owners.map(u=>u.id),units:owners.map(u=>u.name),detachment:'',memberships:undefined,membershipFaction:undefined};
    ruleMap.set(r.id,view.id);rules.push(view);catalog.rules.push({...view});
   }
   for(const u of projected){u.abilities=u.abilities.map(a=>ruleMap.has(a.id)?{...a,id:ruleMap.get(a.id)}:a);
    // Each of the four source Inquisitors may also lead IMPERIUM INFANTRY BATTLELINE.
    if(p.battlelineLeaderIds.includes(u.sourceUnitId))u.bodyguardIds=[...new Set([...u.bodyguardIds,...catalog.units.filter(b=>!b.allied&&norm(b.faction)===norm(f.name)&&['Imperium','Infantry','Battleline'].every(k=>has(b,k))).map(b=>b.id)])];
   }
   catalog.units.push(...projected);
  }
 }
 function assess(army,catalog){const p=policy(catalog);if(!p?.enabled||!imperial(catalog,army.faction))return null;
  const entries=army.units.map(entry=>({entry,source:resolve(catalog,entry,army.faction)})),allies=entries.filter(x=>x.source?.allied),counts={character:0,retinue:0,requisitioned:0,transport:0};
  for(const x of allies)counts[x.source.alliedSlot]++;
  const size=Number(army.limit)||2000,tier=size<=1000?'incursion':size<=2000?'strike-force':'onslaught',limits=p.limits[tier],notes=[];
  const inquisitors=allies.filter(x=>has(x.source,'Inquisitor')).length,voidfarers=allies.filter(x=>has(x.source,'Voidfarers')&&has(x.source,'Character')).length;
  const freeHenchmen=Math.min(inquisitors,allies.filter(x=>x.source.sourceUnitId==='inquisitorial-agents').length),freeVoidsmen=Math.min(voidfarers,allies.filter(x=>x.source.sourceUnitId==='voidsmen-at-arms').length),chargedRetinue=counts.retinue-freeHenchmen-freeVoidsmen;
  for(const slot of ['character','retinue','requisitioned'])if((slot==='retinue'?chargedRetinue:counts[slot])>limits[slot])notes.push('Assigned Agents exceeds the '+slot+' allowance for this battle size.');
  if(allies.length){for(const x of entries)if(!x.source)notes.push('Confirm the datasheet source and IMPERIUM eligibility of '+x.entry.name+'.');else if(!has(x.source,'Imperium'))notes.push('Every model must have IMPERIUM to use Assigned Agents; review '+x.entry.name+'.');
   const seen=new Set();for(const x of allies.filter(x=>has(x.source,'Officio Assassinorum'))){if(seen.has(x.source.sourceUnitId))notes.push('Only one '+x.source.name+' may be included.');seen.add(x.source.sourceUnitId);}
   for(const {entry,source} of allies){if(entry.enhancementId||(entry.details||[]).some(d=>/^Enhancement\s*:/i.test(d)))notes.push(source.name+' is an allied Agent; host-detachment enhancements are not available.');if(has(source,'Officio Assassinorum')&&(entry.warlord||(entry.details||[]).some(d=>/^warlord$/i.test(d))))notes.push(source.name+' cannot be your Warlord.');}
  }
  return {counts:{...counts,chargedRetinue},limits,tier,exemptRetinue:freeHenchmen+freeVoidsmen,notes:[...new Set(notes)],alliedCount:allies.length};
 }
 function grantsDeepStrike(catalog,army,member){if(!member.group||!['leader','support'].includes(member.role))return false;const source=resolve(catalog,member,army.faction);if(!has(source,'Inquisitor'))return false;return army.units.some(b=>b.group===member.group&&b.role==='bodyguard'&&(resolve(catalog,b,army.faction)?.abilities||[]).some(a=>a.id.endsWith('rites-of-teleportation-agents-of-the-imperium')));}
 const api={invalidate,grantsDeepStrike,policy,imperial,resolve,project,assess};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerAllies=api;
})(typeof window!=='undefined'?window:globalThis);
