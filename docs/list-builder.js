/* Editable working rosters; uploaded export text is retained verbatim. */
(function(root){
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./aeldari-data.js'):root.WarPlannerAeldariData;
 const Allies=typeof module!=='undefined'&&module.exports?require('./allies.js'):root.WarPlannerAllies;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const title=s=>String(s).split('-').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');
 const canonical=value=>{const key=norm(value||'Aeldari'),f=data.factions?.find(f=>norm(f.name)===key||(f.aliases||[]).some(a=>norm(a)===key));return f?norm(f.name):['aeldari','asuryani'].includes(key)?'aeldari':key;};
 const same=(a,b)=>canonical(a)===canonical(b);
 const factions=()=>data.factions||[{id:'aeldari',name:'Aeldari',group:'Xenos'}];
 const hasFaction=name=>factions().some(f=>same(f.name,name)||(f.aliases||[]).some(a=>same(a,name)));
 const info=(entry,faction='Aeldari')=>Allies?Allies.resolve(data,entry,factions().find(f=>same(f.name,faction))?.name||faction):data.units.find(u=>same(u.faction,faction)&&norm(u.name)===norm(typeof entry==='object'?entry.name:entry));
 const detachments=(faction='Aeldari')=>data.detachments.filter(d=>same(d.faction,faction)).sort((a,b)=>a.name.localeCompare(b.name));
 const dispositions=(faction='Aeldari')=>[...new Set(detachments(faction).flatMap(d=>d.dispositions||[]))].map(title).sort();
 function selectedDetachments(army){const names=Array.isArray(army.detachments)?army.detachments:army.detachment?[army.detachment]:[],core=typeof module!=='undefined'&&module.exports?require('./core.js'):root.WarPlan;return core?.resolveDetachmentNames?core.resolveDetachmentNames(names,detachments(army.faction),{knownOnly:true}):[...new Set(names)];}
 function setDetachments(army,names){army.detachments=[...new Map(names.map(s=>String(s).trim()).filter(Boolean).map(name=>[norm(name),name])).values()];army.detachment=army.detachments[0]||'';}
 function newArmy(){return {name:'',faction:'Aeldari',detachment:'',disposition:'',points:0,limit:2000,version:'Created in WarPlanner',origin:'builder',units:[]};}
 function search(query,faction='Aeldari',army=null){const q=norm(query);return data.units.filter(u=>same(u.faction,faction)&&(!u.alliedKind||Allies.eligible(data,u,army))&&(!q||norm(u.name).includes(q))).sort((a,b)=>a.name.localeCompare(b.name));}
 function add(army,id,unitId){const source=data.units.find(u=>u.id===id&&same(u.faction,army.faction));if(!source||Allies?.eligible(data,source,army)===false)throw Error('Choose a unit available for this faction and detachment.');army.units.push({id:unitId,name:source.name,points:0,role:'',group:'',details:[],modelCount:source.modelCounts?.find(n=>n>0)||1,...(source.allied||data.units.some(u=>same(u.faction,army.faction)&&norm(u.name)===norm(source.name)&&u.id!==source.id)?{catalogUnitId:source.id,catalogFaction:source.originFaction||source.faction||army.faction}: {})});}
 function cleanup(army){
  const groups=new Set(army.units.map(u=>u.group).filter(Boolean));
  for(const group of groups){const members=army.units.filter(u=>u.group===group);if(members.length<2||members.filter(u=>u.role==='bodyguard').length!==1)for(const unit of members){unit.group='';unit.role='';unit.details=unit.details.filter(d=>!/^Attached as:/i.test(d));}}
 }
 function remove(army,id){army.units=army.units.filter(u=>u.id!==id);cleanup(army);}
 function attachedTo(army,unit){return unit.group&&['leader','support'].includes(unit.role)?army.units.find(u=>u.group===unit.group&&u.role==='bodyguard')?.id||'':'';}
 function eligibleBodies(army,unit){const source=info(unit,army.faction);return army.units.filter(u=>u.id!==unit.id&&!['leader','support'].includes(u.role)&&source?.bodyguardIds.includes(info(u,army.faction)?.id)&&Allies?.eligible(data,source,army)!==false&&Allies?.eligible(data,info(u,army.faction),army)!==false);}
 function attach(army,id,bodyId){
  const unit=army.units.find(u=>u.id===id);if(!unit)throw Error('Unit not found.');
  if(bodyId&&!eligibleBodies(army,unit).some(u=>u.id===bodyId))throw Error('That attachment is not in the available source.');
  unit.group='';unit.role='';unit.details=unit.details.filter(d=>!/^Attached as:/i.test(d));cleanup(army);
  if(!bodyId)return;
  const body=army.units.find(u=>u.id===bodyId);const group=body.group||'attached-'+body.id;
  body.group=group;body.role='bodyguard';unit.group=group;unit.role=info(unit,army.faction)?.abilities.some(a=>a.id==='support')?'support':'leader';
 }
 const enhancement=unit=>unit.details.find(d=>/^Enhancement\s*:/i.test(d))?.replace(/^Enhancement\s*:\s*/i,'')||'';
 function enhancements(army,unit){
  const source=info(unit,army.faction);if(source?.allied&&!source.alliedKind)return [];const keys=(source?.keywords||[]).map(norm),dets=data.detachments.filter(d=>same(d.faction,army.faction)&&selectedDetachments(army).some(name=>norm(name)===norm(d.name)));
  const eligible=data.enhancements.filter(e=>same(e.faction,army.faction)&&Allies?.allowsEnhancement(data,e,source,army)!==false&&dets.some(d=>e.detachmentId===d.id)&&(e.upgrade||keys.includes('character')&&!keys.includes('epichero'))&&e.keywords.every(k=>keys.includes(norm(k)))&&(!e.restrictions.length||e.restrictions.some(r=>(!r.unit_id||r.unit_id===(source?.sourceUnitId||source?.id))&&(!r.keywords||r.keywords.every(k=>keys.includes(norm(k))))&&(!r.excluded_keywords||r.excluded_keywords.every(k=>!keys.includes(norm(k))))&&(!r.required_abilities||r.required_abilities.every(id=>source?.abilities.some(a=>a.id===id)))))).sort((a,b)=>a.name.localeCompare(b.name));
  return [...new Map(eligible.map(e=>[e.id,e])).values()];
 }
 function setEnhancement(army,id,choice){
  const unit=army.units.find(u=>u.id===id);if(!unit)throw Error('Unit not found.');
  const available=enhancements(army,unit),matches=available.filter(e=>e.id===choice||e.name===choice);
  if(choice&&matches.length!==1)throw Error('Choose an enhancement available for this bearer and detachment.');
  unit.details=unit.details.filter(d=>!/^Enhancement\s*:/i.test(d));delete unit.enhancementId;
  if(choice){unit.details.push('Enhancement: '+matches[0].name);unit.enhancementId=matches[0].id;}
 }

 function tokens(unit){const text=unit.details.find(d=>/aspect shrine token/i.test(d));if(!text)return 0;return Number(text.match(/(\d+)\s*x/i)?.[1]||1);}
 function setTokens(unit,count){if(![0,1,2].includes(count))throw Error('Choose 0, 1 or 2 tokens.');unit.details=unit.details.filter(d=>!/aspect shrine token/i.test(d));if(count)unit.details.push(count+'x Aspect Shrine Token');}
 function commit(draft,original){
  const army=structuredClone(draft);army.name=String(army.name||'').trim();army.detachment=String(army.detachment||'').trim();army.disposition=String(army.disposition||'').trim();setDetachments(army,selectedDetachments(army));
  if(!army.name||!army.detachment||!army.disposition)throw Error('Enter a list name and choose a detachment and disposition.');
  if(!army.units.length)throw Error('Add at least one unit to your list.');
  if(new Set(army.units.map(u=>u.id)).size!==army.units.length)throw Error('Each unit needs its own list entry.');
  for(const unit of army.units){
   if(!unit.name||!Array.isArray(unit.details))throw Error('Review the unit entries.');
   if(unit.modelCount!==undefined&&(!Number.isInteger(unit.modelCount)||unit.modelCount<1||unit.modelCount>100))throw Error('Choose a valid model count.');
  }
  // The draft never owns the uploaded source, even if a caller changes this field.
  if(original&&Object.prototype.hasOwnProperty.call(original,'originalExport'))army.originalExport=original.originalExport;
  else delete army.originalExport;
  if(original?.originalRoster)army.originalRoster=structuredClone(original.originalRoster);
  else if(original&&!original.originalExport&&original.origin!=='builder'){const snapshot=structuredClone(original);delete snapshot.originalExport;delete snapshot.originalRoster;army.originalRoster=snapshot;}
  else delete army.originalRoster;
  return army;
 }
 function setSource(army,unit,id){const source=data.units.find(u=>same(u.faction,army.faction)&&norm(u.name)===norm(unit.name)&&u.id===id);if(!source||Allies?.eligible(data,source,army)===false)throw Error('Choose an available datasheet source for this detachment.');unit.catalogUnitId=source.id;unit.catalogFaction=source.originFaction||source.faction;unit.group='';unit.role='';cleanup(army);}
 const api={setSource,sources:(unit,faction)=>data.units.filter(u=>same(u.faction,faction)&&norm(u.name)===norm(unit.name)),alliedStatus:army=>Allies?.assess(army,data),factions,hasFaction,selectedDetachments,setDetachments,newArmy,search,info,detachments,dispositions,add,remove,attachedTo,eligibleBodies,attach,enhancement,enhancements,setEnhancement,tokens,setTokens,commit};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerListBuilder=api;
})(typeof window!=='undefined'?window:globalThis);
