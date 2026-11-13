/* Editable working rosters; uploaded export text is retained verbatim. */
(function(root){
 'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('./aeldari-data.js'):root.WarPlannerAeldariData;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const title=s=>String(s).split('-').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');
 const info=name=>data.units.find(u=>norm(u.name)===norm(name));
 const detachments=()=>[...data.detachments].sort((a,b)=>a.name.localeCompare(b.name));
 const dispositions=()=>[...new Set(data.detachments.flatMap(d=>d.dispositions||[]))].map(title).sort();
 function newArmy(){return {name:'',faction:'Aeldari',detachment:'',disposition:'',points:0,limit:2000,version:'Created in WarPlanner',origin:'builder',units:[]};}
 function search(query){const q=norm(query);return data.units.filter(u=>!q||norm(u.name).includes(q)).sort((a,b)=>a.name.localeCompare(b.name));}
 function add(army,id,unitId){const source=data.units.find(u=>u.id===id);if(!source)throw Error('Choose a unit from the catalog.');army.units.push({id:unitId,name:source.name,points:0,role:'',group:'',details:[],modelCount:source.modelCounts?.find(n=>n>0)||1});}
 function cleanup(army){
  const groups=new Set(army.units.map(u=>u.group).filter(Boolean));
  for(const group of groups){const members=army.units.filter(u=>u.group===group);if(members.length<2||members.filter(u=>u.role==='bodyguard').length!==1)for(const unit of members){unit.group='';unit.role='';unit.details=unit.details.filter(d=>!/^Attached as:/i.test(d));}}
 }
 function remove(army,id){army.units=army.units.filter(u=>u.id!==id);cleanup(army);}
 function attachedTo(army,unit){return unit.group&&['leader','support'].includes(unit.role)?army.units.find(u=>u.group===unit.group&&u.role==='bodyguard')?.id||'':'';}
 function eligibleBodies(army,unit){const source=info(unit.name);return army.units.filter(u=>u.id!==unit.id&&!['leader','support'].includes(u.role)&&source?.bodyguardIds.includes(info(u.name)?.id));}
 function attach(army,id,bodyId){
  const unit=army.units.find(u=>u.id===id);if(!unit)throw Error('Unit not found.');
  if(bodyId&&!eligibleBodies(army,unit).some(u=>u.id===bodyId))throw Error('That attachment is not in the available source.');
  unit.group='';unit.role='';unit.details=unit.details.filter(d=>!/^Attached as:/i.test(d));cleanup(army);
  if(!bodyId)return;
  const body=army.units.find(u=>u.id===bodyId);const group=body.group||'attached-'+body.id;
  body.group=group;body.role='bodyguard';unit.group=group;unit.role=info(unit.name)?.abilities.some(a=>a.id==='support')?'support':'leader';
 }
 const enhancement=unit=>unit.details.find(d=>/^Enhancement\s*:/i.test(d))?.replace(/^Enhancement\s*:\s*/i,'')||'';
 function enhancements(army,unit){
  const source=info(unit.name),keys=(source?.keywords||[]).map(norm),det=data.detachments.find(d=>norm(d.name)===norm(army.detachment));
  return data.enhancements.filter(e=>e.detachmentId===det?.id&&(e.upgrade||keys.includes('character')&&!keys.includes('epichero'))&&e.keywords.every(k=>keys.includes(norm(k)))&&(!e.restrictions.length||e.restrictions.some(r=>(!r.unit_id||r.unit_id===source?.id)&&(!r.keywords||r.keywords.every(k=>keys.includes(norm(k))))))).sort((a,b)=>a.name.localeCompare(b.name));
 }
 function setEnhancement(army,id,name){const unit=army.units.find(u=>u.id===id);if(!unit)throw Error('Unit not found.');if(name&&!enhancements(army,unit).some(e=>e.name===name))throw Error('Choose an enhancement available for this bearer and detachment.');unit.details=unit.details.filter(d=>!/^Enhancement\s*:/i.test(d));if(name)unit.details.push('Enhancement: '+name);}
 function tokens(unit){const text=unit.details.find(d=>/aspect shrine token/i.test(d));if(!text)return 0;return Number(text.match(/(\d+)\s*x/i)?.[1]||1);}
 function setTokens(unit,count){if(![0,1,2].includes(count))throw Error('Choose 0, 1 or 2 tokens.');unit.details=unit.details.filter(d=>!/aspect shrine token/i.test(d));if(count)unit.details.push(count+'x Aspect Shrine Token');}
 function commit(draft,original){
  const army=structuredClone(draft);army.name=String(army.name||'').trim();army.detachment=String(army.detachment||'').trim();army.disposition=String(army.disposition||'').trim();
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
 const api={newArmy,search,info,detachments,dispositions,add,remove,attachedTo,eligibleBodies,attach,enhancement,enhancements,setEnhancement,tokens,setTokens,commit};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerListBuilder=api;
})(typeof window!=='undefined'?window:globalThis);
