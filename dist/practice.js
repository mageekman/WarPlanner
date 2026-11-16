/* Multiple-choice recall from the current catalog. No invented stats or rule text. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports,P=node?require('./unit-profiles.js'):root.WarPlannerUnitProfiles,M=node?require('./mechanics.js'):root.WarPlannerMechanics,L=node?require('./lessons.js'):root.WarPlanLessons;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),text=s=>String(s||'').trim(),copy=x=>structuredClone(x);
 const modes={mixed:'Mixed practice',rules:'Match the rule',stats:'Unit stats',abilities:'Unit abilities',units:'Which unit has this ability?'};
 const opponentModes={mixed:'Mixed opponent practice',effects:'Recognize the effect',timing:'Spot the timing',units:'Identify the opposing unit',abilities:'Know its abilities',stats:'Know its profile',rules:'Name the rule'};
 const categories={ability:'Ability',army:'Army / Detachment',core:'Core Rule','core-stratagem':'Core Stratagems',stratagem:'Stratagem',enhancement:'Enhancement'};
 function shuffle(items,random=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
 function usable(rule){return !!text(rule.name)&&Object.hasOwn(categories,rule.category)&&!!text(rule.summary)&&(!M||M.summaryState(rule)==='available')&&!/needs a checked summary|no complete mechanics|no effect mechanics|check its full wording|source does not support a complete/i.test(rule.summary);}
 function format(value,key){return key==='M'?value+'″':['Sv','Ld','invuln_sv'].includes(key)?value+'+':String(value);}
 function known(value,key){return typeof value==='number'&&Number.isInteger(value)&&value>=(['Sv','Ld','invuln_sv'].includes(key)?1:0)&&value<=999||typeof value==='string'&&/^\d*D\d+(?:[+-]\d+)?$/.test(value);}
 function hideName(summary,name,replacement='this rule'){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return summary.replace(new RegExp('(^|[^a-z0-9])'+escaped+'(?=$|[^a-z0-9])','gi'),(_match,prefix)=>prefix+replacement);}
 function buildBank({rules=[],units=[],faction,army=null,excludeReferenceOnly=false,detachments:catalogDetachments=[],random=Math.random}={}){
  // Catalog names and summaries recur in the choice/ownership loops. Keep this
  // cache local to one build so subsequent edits cannot retain stale values.
  const normalized=new Map(),norm=value=>{if(!normalized.has(value))normalized.set(value,String(value||'').toLowerCase().replace(/[^a-z0-9]/g,''));return normalized.get(value);};
  const matches=r=>r.siteExcluded!=='combat-patrol'&&!r.sourceReview&&(army||!r.allied)&&r.enabled!==false&&!!norm(faction)&&!!norm(r.faction)&&norm(r.faction)===norm(faction);
  const roster=army&&Array.isArray(army.units)?army.units:[],rosterNames=new Set(roster.map(u=>norm(u.name)));
  const validArmy=!army||!!roster.length&&!!norm(army.faction)&&(norm(army.faction)===norm(faction)||L?.factionMatches(army.faction,faction));
  const factionUnits=units.filter(matches),listUnits=validArmy?factionUnits.filter(u=>!army||roster.some(entry=>{const choices=factionUnits.filter(v=>norm(v.name)===norm(entry.name));return entry.catalogUnitId?u.id===entry.catalogUnitId:choices.length===1&&choices[0]===u;})):[];
  const detachments=new Set((army?(L?.armyDetachments?L.armyDetachments(army,catalogDetachments):Array.isArray(army.detachments)?army.detachments:army.detachment?[army.detachment]:[]):[]).map(norm));
  for(const d of catalogDetachments.filter(matches))if(detachments.has(norm(d.name)))for(const id of [d.id,d.importSource?.sourceId,d.importSource?.record?.id])if(id)detachments.add(norm(id));
  const detachmentOf=r=>r.detachment||r.importSource?.record?.detachment_id||'';
  function equipped(r){if(r.automaticForDetachment)return roster.some(u=>L.enhancementEquipped(r,u,army));const name=r.enhancement||r.name,ids=new Set([r.id,r.sourceRuleId,r.importSource?.sourceId,...(r.sharedRuleIds||[]),...Object.keys(L?.aliases||{}).filter(id=>L.aliases[id]===r.id)].filter(Boolean));return roster.some(u=>u.enhancementId?ids.has(u.enhancementId):(u.details||[]).some(d=>/^enhancement\s*:/i.test(d)&&norm(d.replace(/^enhancement\s*:/i,''))===norm(name)));}
  function relevant(r){
   if(!army)return true;
   if(!validArmy)return false;
   if(r.allied&&!listUnits.some(u=>r.alliedUnitIds.includes(u.id)))return false;
   if(r.memberships){if(!L.ruleInArmy(r,army))return false;}
   else if(detachmentOf(r)&&!detachments.has(norm(detachmentOf(r))))return false;
   if((r.enhancement||r.category==='enhancement')&&!equipped(r))return false;
   if(r.units?.length)return listUnits.some(u=>r.units.some(name=>norm(name)===norm(u.name))&&(!u.allied||r.allied||['core','core-stratagem'].includes(r.category)));
   if(r.category==='ability')return listUnits.some(u=>hasRule(u,r));
   if(r.category==='core'&&factionUnits.some(u=>hasRule(u,r)))return listUnits.some(u=>hasRule(u,r));
   return true;
  }
  // A repeated name within a detachment represents one possible answer.
  const unique=new Map();
  const scoped=rules.filter(matches).map(r=>({...(M?M.enrich(r):r),faction:r.faction})),eligible=scoped.filter(relevant).filter(r=>usable(r)&&(!excludeReferenceOnly||!r.referenceOnly));
  for(const r of eligible){const key=[r.category,norm(r.name),norm(r.detachment)].join(':');if(!unique.has(key))unique.set(key,r);}
  const all=[...unique.values()],label=r=>r.name+(r.detachment?' · '+r.detachment:''),questions=[];
  const choices=(correct,others)=>shuffle([correct,...shuffle(others,random).slice(0,3)],random).map(option=>({...option,faction}));
  const ruleView=r=>Object.fromEntries(['id','sourceRuleId','sourceCatalogKey','originFaction','allied','name','faction','memberships','units','category','summary','conditions','sourceIds','sourceUrl','sourceLabel','status','referenceOnly','mechanicsDetails','targetText','triggerText','phase','turn','window','timings','detachment'].filter(key=>r[key]!==undefined).map(key=>[key,copy(r[key])]));
  const unitView=u=>({id:u.id,name:u.name,faction:u.faction,...(u.sourceCatalogKey?{sourceCatalogKey:u.sourceCatalogKey,originFaction:u.originFaction}:{}),...(u.fightsFirst?{fightsFirst:u.fightsFirst}:{})});
  const explain=r=>({summary:r.summary,conditions:Array.isArray(r.conditions)?r.conditions:[],sourceUrl:/^https?:\/\//i.test(r.sourceUrl||'')?r.sourceUrl:'',sourceLabel:r.sourceLabel||'Current catalog study summary',detachment:r.detachment||''});
  for(const r of all){
   const seen=new Set([norm(label(r))]),other=all.filter(a=>{if(a.category!==r.category||norm(a.summary)===norm(r.summary)||norm(a.name)===norm(r.name)||seen.has(norm(label(a))))return false;seen.add(norm(label(a)));return true;});
   if(other.length<3)continue;
   const id='rule:'+r.id;questions.push({id,mode:'rules',category:r.category,prompt:'Which '+(categories[r.category]||'rule').toLowerCase()+' matches this description?',clue:hideName(r.summary,r.name),correct:r.id,options:choices({id:r.id,label:label(r)},other.map(a=>({id:a.id,label:label(a)}))),review:{kind:'rule',rule:ruleView(r),units:[]},explanation:explain(r)});
  }
  const unitNames=new Map();for(const u of listUnits){const key=norm(u.name);if(!unitNames.has(key))unitNames.set(key,u);}
  const selectedUnits=[...unitNames.values()];
  function hasRule(u,r){
   if(r.units?.length)return r.units.some(n=>norm(n)===norm(u.name));
   const ids=new Set([r.id,r.sourceRuleId].filter(Boolean));return (u.abilities||[]).some(a=>ids.has(a.id));
  }
  for(const u of selectedUnits){
   const owned=all.filter(r=>['ability','core'].includes(r.category)&&hasRule(u,r));
   const ownedNames=new Set(owned.map(r=>norm(r.name))),ownedSummaries=new Set(owned.map(r=>norm(r.summary)));
   for(const r of owned){
    const seen=new Set(),other=all.filter(a=>{const key=norm(label(a));if(a.category!==r.category||ownedNames.has(norm(a.name))||ownedSummaries.has(norm(a.summary))||hasRule(u,a)||seen.has(key))return false;seen.add(key);return true;});
    if(other.length<3)continue;
    questions.push({id:'unit-rule:'+u.id+':'+r.id,mode:'abilities',category:r.category,prompt:'Which ability is listed for '+u.name+'?',clue:'Choose the ability associated with this unit. Its normal conditions still apply.',correct:r.id,options:choices({id:r.id,label:label(r)},other.map(a=>({id:a.id,label:label(a)}))),review:{kind:'ability',rule:ruleView(r),units:[unitView(u)]},explanation:{...explain(r),summary:u.name+' — '+r.name+'\n'+r.summary}});
   }
  }
  for(const r of all.filter(r=>['ability','core'].includes(r.category))){
   const owners=selectedUnits.filter(u=>hasRule(u,r)&&hideName(r.name,u.name)===r.name);
   const equivalent=scoped.filter(a=>norm(a.name)===norm(r.name)||norm(a.summary)===norm(r.summary)||(a.sourceRuleId||a.id)===(r.sourceRuleId||r.id));
   const allOwners=selectedUnits.filter(u=>equivalent.some(a=>hasRule(u,a)));
   const others=selectedUnits.filter(u=>!allOwners.includes(u));
   if(!owners.length||others.length<3)continue;
   const owner=shuffle(owners,random)[0];
   let description=r.summary;for(const u of [...allOwners].sort((a,b)=>b.name.length-a.name.length))description=hideName(description,u.name,'this unit');
   questions.push({id:'ability-unit:'+r.id,mode:'units',category:r.category,prompt:'Which unit has this ability?',clue:r.name+'\n\n'+description,correct:owner.id,options:choices({id:owner.id,label:owner.name},others.map(u=>({id:u.id,label:u.name}))),review:{kind:'ability',rule:ruleView(r),units:[unitView(owner)]},explanation:{...explain(r),summary:owner.name+' — '+r.name+'\n'+r.summary}});
  }
  const profiles=[];
  for(const u of selectedUnits){const read=P?P.read(u):[],names=new Map();for(const p of read){const key=norm(p.name||u.name);names.set(key,(names.get(key)||0)+1);}for(const p of read){if(names.get(norm(p.name||u.name))>1)continue;for(const f of P.fields)if(known(p[f.key],f.key))profiles.push({unit:u,profile:p,field:f,value:format(p[f.key],f.key)});}}
  const statSeen=new Set();
  const statValues=new Map();for(const p of profiles){if(!statValues.has(p.field.key))statValues.set(p.field.key,new Set());statValues.get(p.field.key).add(p.value);}
  for(const item of profiles){
   const {unit:u,profile:p,field:f,value}=item,id=['stat',u.id,norm(p.name||u.name),f.key].join(':');if(statSeen.has(id))continue;statSeen.add(id);
   const values=[...statValues.get(f.key)].filter(v=>v!==value);if(values.length<3)continue;
   const profileLabel=p.name&&norm(p.name)!==norm(u.name)?' ('+p.name+' profile)':'';
   questions.push({id,mode:'stats',category:'stats',prompt:'What is '+u.name+'’s '+f.label+profileLabel+'?',clue:'Choose the value in the saved unit profile.',correct:value,options:choices({id:value,label:value},values.map(v=>({id:v,label:v}))),review:{kind:'stats',units:[unitView(u)],profile:copy(p),stat:f.key,sourceUrl:u.sourceUrl||'',sourceLabel:u.sourceLabel||'Current catalog unit profile'},explanation:{summary:u.name+profileLabel+': '+f.label+' '+value+'.',conditions:[],sourceUrl:/^https?:\/\//i.test(u.sourceUrl||'')?u.sourceUrl:'',sourceLabel:u.sourceLabel||'Current catalog unit profile'}});
  }
  for(const q of questions)if(q.review.kind==='rule'&&['ability','core'].includes(q.review.rule.category))q.review.units=selectedUnits.filter(u=>hasRule(u,q.review.rule)).map(unitView);
  return {studyRules:all.map(ruleView),faction,scope:army?'list':'faction',listName:army?.name||'',unmatchedUnits:army?[...rosterNames].filter(name=>!factionUnits.some(u=>norm(u.name)===name)).map(name=>roster.find(u=>norm(u.name)===name).name):[],questions:questions.map(q=>({...q,faction})),counts:Object.fromEntries(['rules','stats','abilities','units'].map(mode=>[mode,questions.filter(q=>q.mode===mode).length]))};
 }
 function buildOpponentBank({detachment='',...args}={}){
  const chosen=(args.detachments||[]).find(d=>norm(d.faction)===norm(args.faction)&&norm(d.name)===norm(detachment)&&d.enabled!==false&&d.siteExcluded!=='combat-patrol');
  const ids=new Set(chosen?[chosen.name,chosen.id,chosen.importSource?.sourceId,chosen.importSource?.record?.id].filter(Boolean).map(norm):[]);
  const rules=(args.rules||[]).filter(r=>(!detachment||chosen&&(r.memberships?L.ruleInArmy(r,{faction:args.faction,detachments:[chosen.name]}):!text(r.detachment||r.importSource?.record?.detachment_id)||ids.has(norm(r.detachment||r.importSource?.record?.detachment_id)))));
  const base=buildBank({...args,army:null,excludeReferenceOnly:true,units:detachment&&!chosen?[]:args.units,rules:detachment&&!chosen?[]:rules}),material=base.studyRules||[],questions=base.questions.map(q=>({...q,prompt:q.mode==='units'?'Which opposing unit has this ability?':q.mode==='abilities'?q.prompt.replace('Which ability is listed for ','Which ability should you check on the opposing '):q.mode==='stats'?q.prompt.replace('What is ','What is the opposing '):q.prompt}));
  const explanation=r=>({summary:r.summary,conditions:r.conditions||[],sourceUrl:/^https?:\/\//i.test(r.sourceUrl||'')?r.sourceUrl:'',sourceLabel:r.sourceLabel||'Current catalog study summary',detachment:r.detachment||''});
  const options=(correct,others)=>shuffle([correct,...shuffle(others,args.random).slice(0,3)],args.random).map(o=>({...o,faction:args.faction}));
  const review=r=>({kind:'rule',rule:copy(r),units:[]});
  for(const r of material){
   const seen=new Set([norm(hideName(r.summary,r.name))]),others=material.filter(a=>{const key=norm(hideName(a.summary,a.name));if(a.category!==r.category||norm(a.name)===norm(r.name)||seen.has(key))return false;seen.add(key);return true;});
   if(others.length<3)continue;
   questions.push({id:'opponent-effect:'+r.id,mode:'effects',category:r.category,faction:args.faction,prompt:'What effect should you expect from your opponent’s '+r.name+'?',clue:[r.detachment?'Opponent detachment: '+r.detachment:'',r.units?.length?'Applies to: '+r.units.join(' · '):''].filter(Boolean).join('\n')||'Recall the effect; its targets and conditions still apply.',correct:r.id,options:options({id:r.id,label:hideName(r.summary,r.name)},others.map(a=>({id:a.id,label:hideName(a.summary,a.name)}))),review:review(r),explanation:explanation(r)});
  }
  const flip=turn=>turn==='you'?'opponent':turn==='opponent'?'you':'either';
  const timingRows=material.flatMap(r=>{
   const timings=L.ruleTimings(r),unique=new Map(timings.map(t=>[JSON.stringify([t.phase,t.turn,t.window]),t]));
   if(unique.size!==1)return [];
   const t=[...unique.values()][0];
   if(t.phase?.length!==1||!Number.isInteger(t.phase[0])||t.phase[0]<0||t.phase[0]>4||!['you','opponent','either'].includes(t.turn)||!L.timingWindows[t.window]||['round','round-end','prebattle'].includes(t.window))return [];
   return [{rule:r,label:L.timingLabel({...t,turn:flip(t.turn)})}];
  });
  const timingChoices=[...new Set(timingRows.map(t=>t.label))];
  for(const {rule:r,label} of timingRows){
   const others=timingChoices.filter(t=>t!==label);if(others.length<3)continue;
   questions.push({id:'opponent-timing:'+r.id,mode:'timing',category:r.category,faction:args.faction,prompt:'When does your opponent’s '+r.name+' apply?',clue:[r.detachment?'Opponent detachment: '+r.detachment:'',r.units?.length?'Applies to: '+r.units.join(' · '):'','Recall its recorded phase, player turn and timing window. Turn labels are from your perspective.'].filter(Boolean).join('\n'),correct:label,options:options({id:label,label},others.map(label=>({id:label,label}))),review:review(r),explanation:{...explanation(r),opponentTiming:label}});
  }
  return {...base,perspective:'opponent',detachment:chosen?.name||'',invalidDetachment:!!detachment&&!chosen,questions,counts:Object.fromEntries(Object.keys(opponentModes).filter(m=>m!=='mixed').map(m=>[m,questions.filter(q=>q.mode===m).length]))};
 }
 function createSession(bank,{mode='mixed',types,count=10,random=Math.random}={}){
  const registry=bank.perspective==='opponent'?opponentModes:modes,kinds=Object.keys(registry).filter(key=>key!=='mixed');
  if(!Object.hasOwn(registry,mode)||![5,10,20].includes(count))throw Error('Choose practice types and 5, 10 or 20 questions.');
  if(types!==undefined&&(!Array.isArray(types)||!types.length||types.some(type=>!kinds.includes(type))))throw Error('Select at least one valid question type.');
  const selected=[...new Set(types===undefined?(mode==='mixed'?kinds:[mode]):types)];
  const pools=Object.fromEntries(selected.map(m=>[m,shuffle(bank.questions.filter(q=>q.mode===m&&!!norm(bank.faction)&&norm(q.faction)===norm(bank.faction)&&q.options.length===4&&q.options.every(o=>norm(o.faction)===norm(bank.faction))),random)])),questions=[],availableTypes=selected.filter(m=>pools[m].length);
  while(questions.length<count){const available=shuffle(availableTypes.filter(m=>pools[m].length),random);if(!available.length)break;for(const m of available){if(questions.length>=count)break;questions.push(copy(pools[m].pop()));}}
  return {perspective:bank.perspective||'army',detachment:bank.detachment||'',faction:bank.faction,scope:bank.scope||'faction',listName:bank.listName||'',mode:availableTypes.length===1?availableTypes[0]:'mixed',types:availableTypes,requestedTypes:selected,questions,index:0,answers:[]};
 }

 function answer(session,id){const q=session.questions[session.index];if(!q||session.answers.length!==session.index||!q.options.some(o=>o.id===id))return false;session.answers.push({id,correct:id===q.correct});return true;}
 function retryMissed(session,{random=Math.random}={}){
  const questions=shuffle(session.questions.filter((q,i)=>session.answers[i]&&!session.answers[i].correct).map(q=>({...copy(q),options:shuffle(copy(q.options),random)})),random);
  const types=session.types.filter(type=>questions.some(q=>q.mode===type));
  return {...session,questions,index:0,answers:[],isRetry:true,types,mode:types.length===1?types[0]:'mixed'};
 }
 const api={opponentModes,buildOpponentBank,retryMissed,modes,categories,shuffle,buildBank,createSession,answer};if(node)module.exports=api;else root.WarPlannerPractice=api;
})(typeof window!=='undefined'?window:globalThis);
