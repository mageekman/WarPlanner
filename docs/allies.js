/* Assigned Agents: runtime views of source datasheets, never editable copies. */
(function(root){
 'use strict';
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),agent=f=>['imperialagents','agentsoftheimperium'].includes(norm(f));
 const has=(u,k)=>(u?.keywords||[]).some(v=>norm(v)===norm(k));
 function policy(catalog){return catalog.factions?.find(f=>agent(f.name))?.assignedAgents||null;}
 function imperial(catalog,faction){const f=catalog.factions?.find(f=>norm(f.name)===norm(faction)||(f.aliases||[]).some(a=>norm(a)===norm(faction)));return !!f&&['Imperium','Space Marines'].includes(f.group)&&!agent(f.name);}
 const indexes=new WeakMap();
 function invalidate(catalog){indexes.delete(catalog);detachmentGeneration++;}
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
 function projectAgents(catalog,rules){
  const p=policy(catalog);if(!p?.enabled)return;
  const native=catalog.units.filter(u=>agent(u.faction)&&!u.allied&&has(u,'Imperium')&&has(u,'Agents of the Imperium')&&!p.excludedUnitIds.includes(u.id));
  const nativeIds=new Set(native.map(u=>u.id));
  const sources=rules.filter(r=>agent(r.faction)&&!r.allied);if(!sources.some(r=>r.id===p.sourceRuleId))return;const factions=catalog.factions.filter(f=>imperial(catalog,f.name));
  for(const f of factions){
   const prefix='assigned-'+f.id+'-',id=x=>prefix+x,projected=[];
   for(const u of native){const slot=has(u,'Dedicated Transport')?'transport':has(u,'Character')?'character':has(u,'Retinue')?'retinue':has(u,'Requisitioned')?'requisitioned':null;if(!slot)continue;
    projected.push({...u,id:id(u.id),faction:f.name,originFaction:u.faction,sourceUnitId:u.id,sourceCatalogKey:u.sourceCatalogKey||'unit:'+u.id,allied:true,alliedSlot:slot,bodyguardIds:u.bodyguardIds.filter(b=>nativeIds.has(b)).map(id),abilities:u.abilities.map(a=>({...a}))});
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
 function assessAgents(army,catalog){const p=policy(catalog);if(!p?.enabled||!imperial(catalog,army.faction))return null;
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
 // Reviewed against the GSC faction pack v1.1 and current detachment reference.
 // Runtime projections preserve one editable source record per datasheet/rule.
 const gscModes=[
  {id:'brood-brothers',detachment:'Brood Brothers Auxilia',faction:'Astra Militarum',excluded:['Aircraft','Commissar','Epic Hero','Militarum Tempestus','Ogryn','Ratling','Tech-priest Enginseer','Ministorum Priest'],blocked:['voice-of-command-astra-militarum','orders-astra-militarum']},
  {id:'final-day',detachment:'Final Day',faction:'Tyranids',required:['Vanguard Invader'],excluded:['Aircraft','Broodlord','Genestealers'],blocked:['synapse-tyranids','shadow-in-the-warp-tyranids']}
 ];
 const gsc=f=>norm(f)==='genestealercults';
 let detachmentGeneration=0;const detachmentCache=new WeakMap();
 function selected(catalog,army){const signature=JSON.stringify([army.faction,army.detachments,army.detachment]),cached=detachmentCache.get(army);if(cached?.generation===detachmentGeneration&&cached.signature===signature&&cached.detachments===catalog.detachments&&cached.length===catalog.detachments.length)return cached.names;const names=Array.isArray(army.detachments)?army.detachments:[army.detachment].filter(Boolean),core=typeof module!=='undefined'&&module.exports?require('./core.js'):root.WarPlan;const resolved=(core?.resolveDetachmentNames?core.resolveDetachmentNames(names,catalog.detachments.filter(d=>norm(d.faction)===norm(army.faction)),{knownOnly:true}):names).map(norm);detachmentCache.set(army,{signature,generation:detachmentGeneration,names:resolved,detachments:catalog.detachments,length:catalog.detachments.length});return resolved;}
 function eligible(catalog,source,army){return source?.alliedKind!=='gsc'||!!army&&gsc(army.faction)&&selected(catalog,army).includes(norm(source.alliedDetachment));}
 function projectGsc(catalog,rules){
  const host=catalog.factions.find(f=>gsc(f.name));if(!host)return;
  for(const mode of gscModes){if(!catalog.detachments.some(d=>gsc(d.faction)&&norm(d.name)===norm(mode.detachment)))continue;
   const sourceRules=rules.filter(r=>norm(r.faction)===norm(mode.faction)&&!r.allied),forbidden=new Set([...mode.blocked,...sourceRules.filter(r=>r.category==='army'||mode.id==='brood-brothers'&&r.requiresArmyAbility==='voice-of-command-astra-militarum').map(r=>r.sourceRuleId||r.id)]),prefix='gsc-'+mode.id+'-',id=x=>prefix+x;
   const native=catalog.units.filter(u=>!u.allied&&norm(u.faction)===norm(mode.faction)&&!u.legend&&!((u.importSource?.record?.game_modes||[]).length&&(u.importSource.record.game_modes).every(m=>m==='combat-patrol'))&&has(u,mode.faction)&&(mode.required||[]).every(k=>has(u,k))&&!mode.excluded.some(k=>has(u,k)||norm(k)==='ratling'&&has(u,'Ratlings')));
   const ids=new Set(native.map(u=>u.id)),views=native.map(u=>({...u,id:id(u.id),faction:host.name,originFaction:mode.faction,sourceUnitId:u.id,sourceCatalogKey:u.sourceCatalogKey||'unit:'+u.id,allied:true,alliedKind:'gsc',alliedDetachment:mode.detachment,bodyguardIds:(u.bodyguardIds||[]).filter(b=>ids.has(b)).map(id),abilities:u.abilities.filter(a=>!forbidden.has(a.id)).map(a=>({...a}))}));
   const ruleMap=new Map();for(const r of sourceRules){if(r.detachment||r.enhancement||!['ability','core'].includes(r.category)||forbidden.has(r.id)||forbidden.has(r.sourceRuleId))continue;
    const owners=views.filter(u=>u.abilities.some(a=>a.id===r.id||a.id===r.sourceRuleId));if(!owners.length)continue;
    const view={...r,id:id(r.id),sourceRuleId:r.sourceRuleId||r.id,sourceCatalogKey:r.sourceCatalogKey||'rule:'+r.id,faction:host.name,originFaction:r.faction,allied:true,alliedKind:'gsc',alliedDetachment:mode.detachment,alliedUnitIds:owners.map(u=>u.id),units:owners.map(u=>u.name),detachment:mode.detachment,memberships:undefined,membershipFaction:undefined};ruleMap.set(r.id,view.id);if(r.sourceRuleId)ruleMap.set(r.sourceRuleId,view.id);rules.push(view);catalog.rules.push({...view});
   }
   for(const u of views)u.abilities=u.abilities.map(a=>ruleMap.has(a.id)?{...a,id:ruleMap.get(a.id)}:a);catalog.units.push(...views);
  }
 }
 function project(catalog,rules){projectAgents(catalog,rules);projectGsc(catalog,rules);}
 function hostTarget(rule,source){const id=rule.sourceRuleId||rule.id,keys=ks=>ks.every(k=>has(source,k));
  if(id==='a-dark-network-brood-brothers-auxilia-genestealer-cults')return (has(source,'Astra Militarum')||has(source,'Genestealer Cults'))&&!has(source,'Monster')&&!has(source,'Vehicle');
  if(id==='regimental-reinforcements-brood-brothers-auxilia-genestealer-cults')return keys(['Astra Militarum','Infantry','Regiment'])&&!has(source,'Artillery')&&!has(source,'Character');
  if(id==='in-the-shadow-of-iron-brood-brothers-auxilia-genestealer-cults')return keys(['Astra Militarum','Vehicle']);
  if(['acceptable-losses-brood-brothers-auxilia-genestealer-cults','suppress-and-overwhelm-brood-brothers-auxilia-genestealer-cults'].includes(id))return has(source,'Astra Militarum');
  if(['integrated-tactics-genestealer-cults','brood-brothers-genestealer-cults','symbiotic-destruction-brood-brothers-auxilia-genestealer-cults'].includes(id))return has(source,'Astra Militarum')||has(source,'Genestealer Cults');
  if(['darting-attacks-final-day-genestealer-cults','psi-surge-final-day-genestealer-cults','synaptic-auger-final-day-genestealer-cults'].includes(id))return has(source,'Tyranids');
  if(id==='avenge-the-star-children-final-day-genestealer-cults')return keys(['Tyranids','Character']);
  if(id==='vanguard-tyrant-final-day-genestealer-cults')return has(source,'Winged Hive Tyrant');
  if(['psionic-parasitism-genestealer-cults','resistance-tunnels-final-day-genestealer-cults'].includes(id))return has(source,'Tyranids')||has(source,'Genestealer Cults');
  return null;
 }
 function allowsRule(catalog,rule,source,army){
  if(source?.alliedKind==='gsc'&&!eligible(catalog,source,army))return false;
  if(gsc(army.faction)&&source&&!rule.allied&&rule.faction!=='*'){const target=hostTarget(rule,source);if(target!==null)return target;}
  if(rule.allied)return !!source&&rule.alliedUnitIds.includes(source.id);
  if(source?.allied)return rule.faction==='*';return true;
 }
 // Match only explicit runtime/canonical identities; similar names never grant eligibility.
 function bearerRestrictionMatches(source,restriction){return !!source&&(!restriction.unit_id||[source.id,source.sourceUnitId,source.canonicalUnitId].includes(restriction.unit_id))&&(!restriction.keywords||restriction.keywords.every(k=>has(source,k)))&&(!restriction.excluded_keywords||restriction.excluded_keywords.every(k=>!has(source,k)))&&(!restriction.required_abilities||restriction.required_abilities.every(id=>source.abilities.some(a=>a.id===id)));}
 function allowsEnhancement(catalog,enhancement,source,army){if(!source?.allied)return true;if(source.alliedKind!=='gsc'||!eligible(catalog,source,army)||!has(source,'Character')||has(source,'Epic Hero'))return false;return ['synaptic-auger-final-day-genestealer-cults','vanguard-tyrant-final-day-genestealer-cults'].includes(enhancement.sourceRuleId||enhancement.id)&&hostTarget(enhancement,source)===true;}
 function assessGsc(army,catalog){if(!gsc(army.faction))return null;const entries=army.units.map(entry=>({entry,source:resolve(catalog,entry,army.faction)})),allies=entries.filter(x=>x.source?.alliedKind==='gsc'),notes=[],limit=Number(army.limit)||2000,cap=limit<=1000?500:limit<=2000?1000:1500,totals={};
  for(const mode of gscModes){const members=allies.filter(x=>x.source.alliedDetachment===mode.detachment),known=members.filter(x=>Number.isInteger(Number(x.entry.points))&&Number(x.entry.points)>0),points=known.reduce((n,x)=>n+Number(x.entry.points),0);totals[mode.detachment]={points,unknown:members.length-known.length,cap};if(points>cap)notes.push(mode.detachment+' allies exceed the '+cap+'-point allowance.');if(members.length>known.length)notes.push(mode.detachment+': enter current total points (including enhancements) for every allied unit; allowance is not yet verified.');}
  for(const {entry,source} of allies){if(!eligible(catalog,source,army))notes.push(source.name+' requires '+source.alliedDetachment+'; change detachment or remove this ally.');if(entry.warlord||(entry.details||[]).some(d=>/^warlord$/i.test(d)))notes.push(source.name+' cannot be your Warlord; choose a Genestealer Cults model.');const eid=entry.enhancementId,details=(entry.details||[]).filter(d=>/^enhancement\s*:/i.test(d));if(eid||details.length){const e=catalog.enhancements.find(e=>e.id===eid||!eid&&details.some(d=>norm(d.replace(/^enhancement\s*:/i,''))===norm(e.name)));if(!e||!allowsEnhancement(catalog,e,source,army))notes.push(source.name+' has an enhancement not available to this allied bearer.');}}
  for(const {entry,source} of entries)if(!source)notes.push('Confirm the datasheet source and allied eligibility of '+entry.name+'.');
  return {kind:'gsc',title:'GSC allied units',totals,cap,notes:[...new Set(notes)],alliedCount:allies.length};
 }
 function assess(army,catalog){return assessGsc(army,catalog)||assessAgents(army,catalog);}
 function grantsDeepStrike(catalog,army,member){if(!member.group||!['leader','support'].includes(member.role))return false;const source=resolve(catalog,member,army.faction);if(!has(source,'Inquisitor'))return false;return army.units.some(b=>b.group===member.group&&b.role==='bodyguard'&&(resolve(catalog,b,army.faction)?.abilities||[]).some(a=>a.id.endsWith('rites-of-teleportation-agents-of-the-imperium')));}
 const api={bearerRestrictionMatches,invalidate,grantsDeepStrike,policy,imperial,resolve,project,assess,eligible,allowsRule,allowsEnhancement,gscModes};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerAllies=api;
})(typeof window!=='undefined'?window:globalThis);
