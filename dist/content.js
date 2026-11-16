/* Account-authorized, database-backed study content. Bundled data is the offline fallback. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const L=node?require('./lessons.js'):root.WarPlanLessons;
 const A=node?require('./activations.js'):root.WarPlanActivations;
 const M=node?require('./mechanics.js'):root.WarPlannerMechanics;
 const Allies=node?require('./allies.js'):root.WarPlannerAllies;
 const Profiles=node?require('./unit-profiles.js'):root.WarPlannerUnitProfiles;
 const copy=v=>structuredClone(v),norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 let generation=0;
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
 function validateTimings(timings){
  if(!Array.isArray(timings)||!timings.length||timings.length>20)throw Error('Add between 1 and 20 timings.');
  const seen=new Set();for(const t of timings){
   if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).some(k=>!['phase','turn','window'].includes(k))||!['you','opponent','either'].includes(t.turn)||!windows.includes(t.window))throw Error('Choose valid player turns and windows for each timing.');
   if(!Array.isArray(t.phase)||t.phase.length>5||new Set(t.phase).size!==t.phase.length||t.phase.some(p=>!Number.isInteger(p)||p<0||p>4))throw Error('Choose valid phases for each timing.');
   const key=JSON.stringify([[...t.phase].sort(),t.turn,t.window]);if(seen.has(key))throw Error('Remove duplicate timings.');seen.add(key);
  }
 }
 function captureTimings(data,fd){
  const ids=fd.getAll('rule-timing');
  if(!ids.length){
   // Old export/test forms must not flatten an existing multi-timing rule.
   if(data.timings)return;
   const before=JSON.stringify([data.phase,data.turn,data.window]);
   data.phase=fd.getAll('phase').map(Number);data.turn=String(fd.get('turn')||'');data.window=String(fd.get('window')||'');
   if(before!==JSON.stringify([data.phase,data.turn,data.window]))data.timingOverride=true;
   return;
  }
  const next=ids.map(id=>({phase:fd.getAll('timing-'+id+'-phase').map(Number),turn:String(fd.get('timing-'+id+'-turn')||''),window:String(fd.get('timing-'+id+'-window')||'')}));
  const before=JSON.stringify(L.ruleTimings(data).map(t=>({phase:[...t.phase].sort(),turn:t.turn,window:t.window})));
  if(before!==JSON.stringify(next))data.timingOverride=true;
  data.phase=[...new Set(next.flatMap(t=>t.phase))].sort();data.turn=next.every(t=>t.turn===next[0].turn)?next[0].turn:'either';data.window=next[0].window;
  if(next.length===1)delete data.timings;else{data.timings=next;data.timingOverride=true;}
 }
 function timingFields(data){
  const timings=L.ruleTimings(data),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<fieldset class="rule-timings" data-rule-timings><legend>Rule timings</legend><p class="admin-guide-note">The rule is available when any timing below matches. Each timing has its own phases, player turn and window.</p>${timings.map((t,i)=>`<fieldset class="rule-timing" data-timing-row><legend>Timing ${i+1}</legend><input type="hidden" name="rule-timing" value="${i}"><div class="rule-timing-phases">${L.phases.map((p,n)=>`<label><input type="checkbox" name="timing-${i}-phase" value="${n}" ${t.phase.includes(n)?'checked':''}>${e(p.name)}</label>`).join('')}</div><label>Player turn<select name="timing-${i}-turn">${[['you','Your turn'],['opponent','Opponent’s turn'],['either','Either turn']].map(([v,label])=>`<option value="${v}" ${t.turn===v?'selected':''}>${label}</option>`).join('')}</select></label><label>Timing window<select name="timing-${i}-window">${Object.entries(L.timingWindows).map(([v,label])=>`<option value="${v}" ${t.window===v?'selected':''}>${e(label)}</option>`).join('')}</select></label><button type="button" class="text-button" data-rule-timing-remove="${i}" ${timings.length===1?'disabled':''}>Remove timing ${i+1}</button></fieldset>`).join('')}<button type="button" class="outline" data-rule-timing-add ${timings.length>=20?'disabled':''}>Add timing</button><small>Leave phases empty only for reference or pre-battle content.</small></fieldset>`;
 }
 function editTimingRows(button,form){
  if(!form||!('ruleTimingAdd' in button.dataset||'ruleTimingRemove' in button.dataset))return false;
  const region=form.querySelector('[data-rule-timings]');if(!region)return false;
  const fd=new FormData(form),ids=fd.getAll('rule-timing'),timings=ids.map(id=>({phase:fd.getAll('timing-'+id+'-phase').map(Number),turn:String(fd.get('timing-'+id+'-turn')),window:String(fd.get('timing-'+id+'-window'))}));
  if('ruleTimingAdd' in button.dataset){if(timings.length>=20)return true;timings.push({phase:[],turn:'either',window:timings.at(-1)?.window||'react'});}
  else{if(timings.length<=1)return true;timings.splice(Number(button.dataset.ruleTimingRemove),1);}
  region.outerHTML=timingFields({timings});return true;
 }
 function validate(row){
  if(!row||!kinds.includes(row.kind)||!row.data||typeof row.data!=='object'||Array.isArray(row.data))throw Error('Choose a content type.');
  const d=row.data;
  if(d.guide!==undefined){
   const g=d.guide;
   if(!g||typeof g!=='object'||Array.isArray(g)||!['early','normal','late'].includes(g.order)||!['you','opponent','either'].includes(g.turn))throw Error('Choose a valid guide order and player turn.');
   if(!Number.isInteger(g.rank)||g.rank<1||g.rank>99)throw Error('Guide rank must be a whole number from 1 to 99.');
   if(!Array.isArray(g.phases)||g.phases.some(n=>!Number.isInteger(n)||n<0||n>4))throw Error('Choose valid guide hint phases.');
   if(typeof g.label!=='string'||g.label.length>50||typeof g.note!=='string'||g.note.length>2000)throw Error('Use a short guide badge (up to 50 characters) and explanation (up to 2000).');
   stringList(g.flags,'Guide badges');if(g.flags.length>12||g.flags.some(s=>!s.trim()||s.length>50))throw Error('Add up to 12 guide badges, each up to 50 characters.');
  }
  if(d.fightsFirst!==undefined&&!['auto','yes','no'].includes(d.fightsFirst))throw Error('Choose a valid Fights First setting.');
  if(typeof d.id!=='string'||!/^[a-zA-Z0-9_-]{1,180}$/.test(d.id)||row.key!==row.kind+':'+d.id)throw Error('Use a stable ID with letters, numbers, dashes or underscores.');
  if(row.kind!=='step'&&(typeof d.name!=='string'||!d.name.trim()||d.name.length>180))throw Error('The content data needs a text name (up to 180 characters).');
  if(typeof row.name!=='string'||!row.name.trim()||row.name.length>180)throw Error('Enter a name (up to 180 characters).');
  if(typeof row.faction!=='string'||row.faction.length>100)throw Error('Choose a faction.');
  if(typeof row.enabled!=='boolean')throw Error('Choose whether this entry is enabled.');
  if(d.sourceUrl&&!/^https?:\/\//i.test(d.sourceUrl))throw Error('Source links must start with https:// or http://.');
  if(JSON.stringify(d).length>100000)throw Error('This entry is too large.');
  if(row.kind==='rule'){
   if(d.sharedRuleId!==undefined&&(typeof d.sharedRuleId!=='string'||!/^[a-zA-Z0-9_-]{1,180}$/.test(d.sharedRuleId)||d.sharedRuleId===d.id))throw Error('Choose a different shared rule ID.');
   if(d.sharedRuleIds!==undefined){stringList(d.sharedRuleIds,'Linked rule IDs');if(d.sharedRuleIds.some(id=>!/^[a-zA-Z0-9_-]{1,180}$/.test(id)))throw Error('Invalid linked rule ID.');}
   if(d.memberships!==undefined){
    if(!Array.isArray(d.memberships)||!d.memberships.length||d.memberships.length>100)throw Error('Add between 1 and 100 faction memberships.');
    const seen=new Set();for(const m of d.memberships){if(!m||typeof m.faction!=='string'||!m.faction.trim()||m.faction.length>100||seen.has(norm(m.faction)))throw Error('Choose each membership faction once.');seen.add(norm(m.faction));stringList(m.detachments,'Membership detachments');if(m.units!==undefined)stringList(m.units,'Membership units');if(m.targetText!==undefined&&(typeof m.targetText!=='string'||m.targetText.length>20000))throw Error('Use text for membership targets.');if(m.detachments.some(d=>!d.trim()||d.length>180)||new Set(m.detachments.map(norm)).size!==m.detachments.length)throw Error('Choose each detachment once.');}
    if(d.memberships.length>1&&d.memberships.some(m=>m.faction==='*'))throw Error('Use All factions by itself, or choose individual faction memberships.');
    if(d.faction!==row.faction||!d.memberships.some(m=>m.faction===row.faction))throw Error('The primary faction must be one of the rule memberships.');
    if(d.detachment)throw Error('Use the membership detachments for a shared rule.');
   }
   for(const key of ['sourceRuleId','detachment','enhancement','leadingBodyguard'])if(d[key]!=null&&(typeof d[key]!=='string'||d[key].length>180))throw Error(key+' must be a short text value.');
   if(d.requiredLeaderKeywords!==undefined)stringList(d.requiredLeaderKeywords,'Required attached Leader keywords');
   if(d.bearerKeywords!==undefined)stringList(d.bearerKeywords,'Bearer keywords');
   if(d.bearerRestrictions!==undefined&&(!Array.isArray(d.bearerRestrictions)||d.bearerRestrictions.some(r=>!r||typeof r!=='object'||Array.isArray(r)||r.keywords!==undefined&&(!Array.isArray(r.keywords)||r.keywords.some(k=>typeof k!=='string')))))throw Error('Review the enhancement bearer restrictions.');
   for(const key of ['leadingUnitRequired','referenceOnly','enhancementUpgrade','timingOverride','automaticForDetachment'])if(d[key]!==undefined&&typeof d[key]!=='boolean')throw Error(key+' must be true or false.');
   if(!Object.hasOwn(L.categories,d.category)||!['you','opponent','either'].includes(d.turn)||!windows.includes(d.window))throw Error('Choose a valid category, player turn and timing.');
   if(!Array.isArray(d.phase)||d.phase.some(n=>!Number.isInteger(n)||n<0||n>4))throw Error('Choose valid phases.');
   if(d.timings!==undefined)validateTimings(d.timings);
   for(const k of ['units','conditions','sourceIds'])stringList(d[k],k);
   if(typeof d.summary!=='string'||!d.summary.trim())throw Error('Enter the rule text or study summary.');
   if(!row.faction)throw Error('Choose a faction, or All factions.');
  }
  if(row.kind==='unit'){
   if(d.sharedUnitId!==undefined&&(typeof d.sharedUnitId!=='string'||!/^[a-zA-Z0-9_-]{1,180}$/.test(d.sharedUnitId)||d.sharedUnitId===d.id))throw Error('Choose a different shared unit ID.');
   if(d.unitMemberships!==undefined){
    if(!Array.isArray(d.unitMemberships)||!d.unitMemberships.length||d.unitMemberships.length>100)throw Error('Add between 1 and 100 unit faction memberships.');
    const factions=new Set(),ids=new Set();for(const m of d.unitMemberships){
     if(!m||typeof m.faction!=='string'||!m.faction.trim()||m.faction==='*'||m.faction.length>100||factions.has(norm(m.faction)))throw Error('Choose each unit faction once.');factions.add(norm(m.faction));
     if(typeof m.unitId!=='string'||!/^[a-zA-Z0-9_-]{1,180}$/.test(m.unitId)||ids.has(m.unitId))throw Error('Each unit membership needs its original stable ID.');ids.add(m.unitId);
     stringList(m.keywordAdditions,'Chapter keywords');if(!Array.isArray(m.abilities)||m.abilities.some(a=>!a||typeof a.id!=='string'))throw Error('Review the chapter ability links.');
    }
    if(!d.unitMemberships.some(m=>m.faction===row.faction&&m.unitId===d.id))throw Error('Keep the primary unit faction and stable ID in its memberships.');
   }
   if(d.profiles!==undefined)Profiles.validate(d.profiles);
   for(const k of ['keywords','bodyguardIds'])stringList(d[k],k);
   if(!Array.isArray(d.abilities)||d.abilities.some(a=>!a||typeof a.id!=='string'))throw Error('Review this unit’s ability references.');
   if(!Array.isArray(d.modelCounts)||!d.modelCounts.length||d.modelCounts.some(n=>!Number.isInteger(n)||n<1||n>100))throw Error('Enter model counts from 1 to 100.');
  }
  if(['unit','detachment'].includes(row.kind)&&(!row.faction||row.faction==='*'))throw Error('Choose one faction.');
  if(row.kind==='detachment')for(const k of ['rules','stratagems','enhancements','dispositions','gameModes'])stringList(d[k],k);
  if(row.kind==='faction'){
   if(d.assignedAgents!==undefined){const p=d.assignedAgents;if(!p||typeof p.enabled!=='boolean'||typeof p.sourceRuleId!=='string'||!p.sourceRuleId)throw Error('Review the Assigned Agents policy.');stringList(p.excludedUnitIds,'Excluded Agents datasheets');stringList(p.battlelineLeaderIds,'Inquisitor attachment sources');for(const tier of ['incursion','strike-force','onslaught'])for(const slot of ['character','retinue','requisitioned'])if(!Number.isInteger(p.limits?.[tier]?.[slot])||p.limits[tier][slot]<0||p.limits[tier][slot]>10)throw Error('Review the Assigned Agents allowances.');}

   if(!['Space Marines','Imperium','Chaos','Xenos'].includes(d.group))throw Error('Choose Space Marines, Imperium, Chaos or Xenos.');stringList(d.aliases,'Aliases');
  }
  if(row.kind==='step'&&(!row.enabled||typeof d.body!=='string'||!d.body.trim()))throw Error('Core pages must remain enabled and have instructions.');
  return row;
 }
 function apply(rows){
  const entries=new Map(defaults.map(r=>[r.key,copy(r)]));
  for(const row of rows){validate(row);entries.set(row.key,copy(row));}
  const enabled=[...entries.values()].filter(r=>r.enabled&&!r.data.sharedRuleId&&!r.data.sharedUnitId),unitIds=new Map();
  for(const row of enabled.filter(r=>r.kind==='unit'))unitIds.set(row.data.id,new Map((row.data.unitMemberships||[{faction:row.faction,unitId:row.data.id}]).map(m=>[m.faction,m.unitId])));
  const select=kind=>enabled.filter(r=>r.kind===kind).flatMap(r=>{
   const data=kind==='rule'?M.enrich(r.data):r.data;
   if(kind==='unit'&&data.unitMemberships)return data.unitMemberships.map(m=>({...data,id:m.unitId,faction:m.faction,keywords:[...new Set([...data.keywords,...m.keywordAdditions])],abilities:copy(m.abilities),bodyguardIds:data.bodyguardIds.map(id=>unitIds.get(id)?.get(m.faction)).filter(Boolean)}));
   return kind==='rule'&&data.memberships?data.memberships.map(m=>({...data,...(m.units!==undefined?{units:copy(m.units)}:{}),...(m.targetText!==undefined?{targetText:m.targetText}:{}),faction:m.faction,membershipFaction:m.faction})): [{...data,faction:r.faction}];
  });
  L.catalog.factions.splice(0,L.catalog.factions.length,...select('faction'));
  const units=select('unit');
  if(units.some(u=>u.unitMemberships)){const order=new Map([...entries.keys()].map((key,i)=>[key,i]));units.sort((a,b)=>(order.get('unit:'+a.id)??Number.MAX_SAFE_INTEGER)-(order.get('unit:'+b.id)??Number.MAX_SAFE_INTEGER));}
  L.catalog.units.splice(0,L.catalog.units.length,...units);
  L.catalog.detachments.splice(0,L.catalog.detachments.length,...select('detachment'));
  L.abilities.splice(0,L.abilities.length,...select('rule'));
  const sharedIds=new Map();for(const r of enabled.filter(r=>r.kind==='rule'))for(const id of r.data.sharedRuleIds||[])sharedIds.set(id,r.data.id);
  for(const u of L.catalog.units)u.abilities=u.abilities.map(a=>sharedIds.has(a.id)?{...a,id:sharedIds.get(a.id)}:a);
  for(const d of L.catalog.detachments)for(const field of ['rules','stratagems','enhancements'])d[field]=[...new Set(d[field].map(id=>sharedIds.get(id)||id))];
  // Rebuild references from the same rule objects that the guide reads.
  L.catalog.rules.splice(0,L.catalog.rules.length,...L.abilities.map(a=>({...a,id:a.sourceRuleId||a.id})));
  L.stepOverrides.clear();for(const r of enabled.filter(r=>r.kind==='step'))L.stepOverrides.set(r.data.id,copy(r.data));
  L.catalog.enhancements.splice(0,L.catalog.enhancements.length,...L.abilities.filter(a=>a.category==='enhancement').flatMap(a=>{
   const id=a.sourceRuleId||a.id,old=defaultEnhancements.find(e=>e.id===id),names=a.memberships?L.ruleDetachments(a,a.faction):[a.detachment];
   const dets=L.catalog.detachments.filter(d=>L.factionMatches(d.faction,a.faction)&&(a.memberships&&!names.length||names.some(name=>norm(d.name)===norm(name))));
   return (dets.length?dets:[null]).map(det=>({... (old||{keywords:[],restrictions:[],upgrade:false}),id,name:a.enhancement||a.name,detachmentId:det?.id||'',faction:a.faction,keywords:a.bearerKeywords||old?.keywords||[],restrictions:a.bearerRestrictions||old?.restrictions||[],upgrade:a.enhancementUpgrade??old?.upgrade??false}));
  }));
  // Build faction/unit links once, preserving rule order and existing references.
  const factions=new Map(),links=new Map(),representatives=[];
  const factionKey=name=>{if(!factions.has(name)){let key=representatives.findIndex(f=>L.factionMatches(f,name));if(key<0){key=representatives.length;representatives.push(name);}factions.set(name,key);}return factions.get(name);};
  for(const rule of L.abilities)if(rule.id!=='fights-first'){
   const faction=factionKey(rule.faction);if(!links.has(faction))links.set(faction,new Map());const names=links.get(faction);
   for(const name of rule.units){const key=norm(name);if(!names.has(key))names.set(key,[]);names.get(key).push(rule.sourceRuleId||rule.id);}
  }
  for(const unit of L.catalog.units){
   const refs=new Map(unit.abilities.map(a=>[a.id,a]));
   for(const id of links.get(factionKey(unit.faction))?.get(norm(unit.name))||[])if(!refs.has(id))refs.set(id,{id});
   unit.abilities=[...refs.values()];
  }
  Allies?.project(L.catalog,L.abilities);
  Allies?.invalidate(L.catalog);
  generation++;

 }
 function filterRecords(records,{kind='rule',query='',reference='all'}={}){
  const text=query.trim().toLowerCase();
  return records.filter(row=>(!kind||row.kind===kind)&&(kind!=='rule'||reference==='all'||(reference==='reference')===(row.data.referenceOnly===true))&&(!text||[row.name,row.faction,row.data.detachment,...(row.data.unitMemberships||[]).map(m=>m.faction),...(row.data.memberships||[]).flatMap(m=>[m.faction,...m.detachments]),row.data.summary,row.data.importSource?.text].filter(Boolean).join(' ').toLowerCase().includes(text))).sort((a,b)=>a.name.localeCompare(b.name));
 }
 function create(client,userId){
  let records=[],isAdmin=false,disposed=false,version=0;
  const check=()=>{if(disposed)throw Error('This account session has ended.');};
  const result=r=>{if(r.error)throw Error(r.error.message||'The content database could not be reached.');return r.data;};
  async function read(){
   const pageSize=500;
   async function page(start,count=false){check();const response=await client.from('rules_catalog').select('*',count?{count:'exact'}:{}).order('key').range(start,start+pageSize-1);const rows=result(response)||[];check();return {rows,count:response.count};}
   const first=await page(0,true),all=[...first.rows];
   if(Number.isInteger(first.count)&&first.count>=0){
    // Fetch at most three independent ranges together; append in key order.
    // No partial catalog is published if any request fails or the account changes.
    for(let start=pageSize;start<first.count;start+=pageSize*3){const starts=[start,start+pageSize,start+pageSize*2].filter(n=>n<first.count);const pages=await Promise.all(starts.map(n=>page(n)));for(const p of pages)all.push(...p.rows);}
    if(all.length!==first.count)throw Error('The rules catalog changed while loading. Please reload and try again.');
   }else if(first.rows.length===pageSize){
    for(let start=pageSize;;start+=pageSize){const next=await page(start);all.push(...next.rows);if(next.rows.length<pageSize)break;}
   }
   all.forEach(validate);check();records=all;version++;return copy(records);
  }
  return {
   get isAdmin(){return isAdmin&&!disposed;},get records(){return copy(records);},get version(){return version;},get userId(){return userId;},
   async load(){check();const admin=result(await client.from('site_admins').select('user_id').eq('user_id',userId).maybeSingle());isAdmin=!!admin;await read();return this;},
   async reload(){return read();},
   async save(row){
    check();if(!isAdmin)throw Error('Administrator access is required.');validate(row);
    const payload={key:row.key,kind:row.kind,faction:row.faction,name:row.name.trim(),data:copy(row.data),enabled:row.enabled};
    let query;
    if(row.revision)query=client.from('rules_catalog').update(payload).eq('key',row.key).eq('revision',row.revision).select('*').maybeSingle();
    else query=client.from('rules_catalog').insert(payload).select('*').single();
    const saved=result(await query);check();if(!saved)throw Error('This entry changed in another tab. Reload the catalog before saving; your draft is still here.');
    records=records.filter(r=>r.key!==saved.key).concat([saved]);version++;return copy(saved);
   },
   async saveBatch(rows){
    check();if(!isAdmin)throw Error('Administrator access is required.');
    if(!Array.isArray(rows)||rows.length<1||rows.length>1000)throw Error('Import between 1 and 1000 entries.');rows.forEach(validate);
    const entries=rows.map(row=>({key:row.key,kind:row.kind,faction:row.faction,name:row.name.trim(),data:copy(row.data),enabled:row.enabled,expectedRevision:row.revision||0}));
    const saved=result(await client.rpc('import_rules_catalog',{entries}));check();
    if(!Array.isArray(saved)||saved.length!==entries.length)throw Error('Import response was incomplete. Reload the catalog to verify before trying again.');
    saved.forEach(validate);const map=new Map(records.map(r=>[r.key,r]));for(const row of saved)map.set(row.key,row);records=[...map.values()];version++;return copy(saved);
   },
   async submitReport(payload){check();const saved=result(await client.rpc('submit_rule_report',{payload:copy(payload)}));check();return saved;},
   async listReports(status='pending'){
    check();if(!isAdmin)throw Error('Administrator access is required.');const all=[];
    for(let start=0;;start+=500){let query=client.from('rule_reports').select('*').order('created_at',{ascending:false}).order('id');query=status==='pending'?query.eq('status','pending'):query.neq('status','pending');const page=result(await query.range(start,start+499))||[];check();all.push(...page);if(page.length<500)break;}return all;
   },
   async reviewReport(report,decision,proposal=null,mode='direct'){
    check();if(!isAdmin)throw Error('Administrator access is required.');if(proposal)validate(proposal);
    const saved=result(await client.rpc('review_rule_report',{payload:{id:report.id,decision,proposal:proposal?copy(proposal):null,expected_revision:proposal?.revision||0,mode}}));check();return saved;
   },
   async history(key){check();if(!isAdmin)throw Error('Administrator access is required.');return result(await client.from('rules_catalog_history').select('*').eq('key',key).order('revision',{ascending:false}).limit(30))||[];},
   dispose(){disposed=true;isAdmin=false;records=[];version++;}
  };
 }
 const api={get generation(){return generation;},filterRecords,kinds,windows,seed:()=>copy(defaults),validateTimings,captureTimings,timingFields,editTimingRows,validate,apply,reset:()=>apply([]),create};
 if(node)module.exports=api;else root.WarPlannerContent=api;
})(typeof window!=='undefined'?window:globalThis);
