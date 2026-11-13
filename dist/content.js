/* Account-authorized, database-backed study content. Bundled data is the offline fallback. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const L=node?require('./lessons.js'):root.WarPlanLessons;
 const A=node?require('./activations.js'):root.WarPlanActivations;
 const copy=v=>structuredClone(v),norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const kinds=['rule','unit','detachment','faction','step'];
 const windows=['round','turn-start','start','core-cp','shock','act','select','before','after','react','arrivals','end','turn-end','round-end','prebattle'];
 L.catalog.factions=L.catalog.factions||[{id:'aeldari',name:'Aeldari',group:'Xenos',aliases:['Asuryani']}];
 L.sources.admin={name:'WarPlanner maintained content',version:'Edited in the site rules editor',url:'https://mageekman.github.io/WarPlanner/',status:'admin-reviewed'};
 function seed(){
  const rows=[],put=(kind,data,faction)=>rows.push({key:kind+':'+data.id,kind,faction,name:data.name||data.title,data:copy(data),enabled:true,revision:1});
  L.catalog.factions.forEach(f=>put('faction',f,''));
  L.catalog.units.forEach(u=>put('unit',{...u,faction:u.faction||'Aeldari'},u.faction||'Aeldari'));
  L.catalog.detachments.forEach(d=>put('detachment',{...d,faction:d.faction||'Aeldari'},d.faction||'Aeldari'));
  L.abilities.forEach(a=>put('rule',{...a,faction:a.faction||'Aeldari'},a.faction||'Aeldari'));
  const steps=new Map(L.phases.flatMap(p=>p.steps).map(s=>[s.id,s]));
  for(let phase=0;phase<5;phase++)for(const turn of ['you','opponent'])for(const firstPlayer of ['you','opponent']){
   const state={army:{faction:'Aeldari',units:[]},phase,turn,firstPlayer};
   for(const step of [...L.getSteps(state),...A.steps(state)])if(!steps.has(step.id))steps.set(step.id,step);
  }
  for(const step of steps.values()){
   const {coreHelp,activationMode,...data}=step;put('step',data,'*');
  }
  return rows;
 }
 const defaults=seed(),defaultEnhancements=copy(L.catalog.enhancements);
 function stringList(value,label){if(!Array.isArray(value)||value.some(s=>typeof s!=='string'||s.length>2000))throw Error(label+' must be a list of text values.');}
 function validate(row){
  if(!row||!kinds.includes(row.kind)||!row.data||typeof row.data!=='object'||Array.isArray(row.data))throw Error('Choose a content type.');
  const d=row.data;
  if(typeof d.id!=='string'||!/^[a-zA-Z0-9_-]{1,180}$/.test(d.id)||row.key!==row.kind+':'+d.id)throw Error('Use a stable ID with letters, numbers, dashes or underscores.');
  if(typeof row.name!=='string'||!row.name.trim()||row.name.length>180)throw Error('Enter a name (up to 180 characters).');
  if(typeof row.faction!=='string'||row.faction.length>100)throw Error('Choose a faction.');
  if(typeof row.enabled!=='boolean')throw Error('Choose whether this entry is enabled.');
  if(d.sourceUrl&&!/^https?:\/\//i.test(d.sourceUrl))throw Error('Source links must start with https:// or http://.');
  if(JSON.stringify(d).length>100000)throw Error('This entry is too large.');
  if(row.kind==='rule'){
   if(!Object.hasOwn(L.categories,d.category)||!['you','opponent','either'].includes(d.turn)||!windows.includes(d.window))throw Error('Choose a valid category, player turn and timing.');
   if(!Array.isArray(d.phase)||d.phase.some(n=>!Number.isInteger(n)||n<0||n>4))throw Error('Choose valid phases.');
   for(const k of ['units','conditions','sourceIds'])stringList(d[k],k);
   if(typeof d.summary!=='string'||!d.summary.trim())throw Error('Enter the rule text or study summary.');
   if(!row.faction)throw Error('Choose a faction, or All factions.');
  }
  if(row.kind==='unit'){
   for(const k of ['keywords','bodyguardIds'])stringList(d[k],k);
   if(!Array.isArray(d.abilities)||d.abilities.some(a=>!a||typeof a.id!=='string'))throw Error('Review this unit’s ability references.');
   if(!Array.isArray(d.modelCounts)||!d.modelCounts.length||d.modelCounts.some(n=>!Number.isInteger(n)||n<1||n>100))throw Error('Enter model counts from 1 to 100.');
  }
  if(['unit','detachment'].includes(row.kind)&&(!row.faction||row.faction==='*'))throw Error('Choose one faction.');
  if(row.kind==='detachment')for(const k of ['rules','stratagems','enhancements','dispositions','gameModes'])stringList(d[k],k);
  if(row.kind==='faction'){
   if(!['Imperium','Chaos','Xenos'].includes(d.group))throw Error('Choose Imperium, Chaos or Xenos.');stringList(d.aliases,'Aliases');
  }
  if(row.kind==='step'&&(!row.enabled||typeof d.body!=='string'||!d.body.trim()))throw Error('Core pages must remain enabled and have instructions.');
  return row;
 }
 function apply(rows){
  const entries=new Map(defaults.map(r=>[r.key,copy(r)]));
  for(const row of rows){validate(row);entries.set(row.key,copy(row));}
  const enabled=[...entries.values()].filter(r=>r.enabled),select=kind=>enabled.filter(r=>r.kind===kind).map(r=>({...r.data,faction:r.faction}));
  L.catalog.factions.splice(0,L.catalog.factions.length,...select('faction'));
  L.catalog.units.splice(0,L.catalog.units.length,...select('unit'));
  L.catalog.detachments.splice(0,L.catalog.detachments.length,...select('detachment'));
  L.abilities.splice(0,L.abilities.length,...select('rule'));
  // Rebuild references from the same rule objects that the guide reads.
  L.catalog.rules.splice(0,L.catalog.rules.length,...L.abilities.map(a=>({...a,id:a.sourceRuleId||a.id})));
  L.stepOverrides.clear();for(const r of enabled.filter(r=>r.kind==='step'))L.stepOverrides.set(r.data.id,copy(r.data));
  L.catalog.enhancements.splice(0,L.catalog.enhancements.length,...L.abilities.filter(a=>a.category==='enhancement').map(a=>{
   const id=a.sourceRuleId||a.id,old=defaultEnhancements.find(e=>e.id===id),det=L.catalog.detachments.find(d=>L.factionMatches(d.faction,a.faction)&&norm(d.name)===norm(a.detachment));
   return {...(old||{keywords:[],restrictions:[],upgrade:false}),id,name:a.enhancement||a.name,detachmentId:det?.id||'',faction:a.faction,keywords:a.bearerKeywords||old?.keywords||[]};
  }));
  // A unit rule's selected units are also its references in the roster view.
  for(const unit of L.catalog.units){
   const refs=new Map(unit.abilities.map(a=>[a.id,a]));
   for(const rule of L.abilities)if(L.factionMatches(rule.faction,unit.faction)&&rule.units.some(n=>norm(n)===norm(unit.name))){const id=rule.sourceRuleId||rule.id;if(!refs.has(id))refs.set(id,{id});}
   unit.abilities=[...refs.values()];
  }
 }
 function create(client,userId){
  let records=[],isAdmin=false,disposed=false;
  const check=()=>{if(disposed)throw Error('This account session has ended.');};
  const result=r=>{if(r.error)throw Error(r.error.message||'The content database could not be reached.');return r.data;};
  async function read(){
   const all=[];for(let start=0;;start+=500){check();const page=result(await client.from('rules_catalog').select('*').order('key').range(start,start+499))||[];all.push(...page);if(page.length<500)break;}
   all.forEach(validate);check();records=all;return copy(records);
  }
  return {
   get isAdmin(){return isAdmin&&!disposed;},get records(){return copy(records);},get userId(){return userId;},
   async load(){check();const admin=result(await client.from('site_admins').select('user_id').eq('user_id',userId).maybeSingle());isAdmin=!!admin;await read();return this;},
   async reload(){return read();},
   async save(row){
    check();if(!isAdmin)throw Error('Administrator access is required.');validate(row);
    const payload={key:row.key,kind:row.kind,faction:row.faction,name:row.name.trim(),data:copy(row.data),enabled:row.enabled};
    let query;
    if(row.revision)query=client.from('rules_catalog').update(payload).eq('key',row.key).eq('revision',row.revision).select('*').maybeSingle();
    else query=client.from('rules_catalog').insert(payload).select('*').single();
    const saved=result(await query);check();if(!saved)throw Error('This entry changed in another tab. Reload the catalog before saving; your draft is still here.');
    records=records.filter(r=>r.key!==saved.key).concat([saved]);return copy(saved);
   },
   async history(key){check();if(!isAdmin)throw Error('Administrator access is required.');return result(await client.from('rules_catalog_history').select('*').eq('key',key).order('revision',{ascending:false}).limit(30))||[];},
   dispose(){disposed=true;isAdmin=false;records=[];}
  };
 }
 const api={kinds,windows,seed:()=>copy(defaults),validate,apply,reset:()=>apply([]),create};
 if(node)module.exports=api;else root.WarPlannerContent=api;
})(typeof window!=='undefined'?window:globalThis);
