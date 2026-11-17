/* Unit-centred study flow. Walkthrough progress is not an eligibility engine. */
(function(root){
 'use strict';
 const L=typeof module!=='undefined'&&module.exports?require('./lessons.js'):root.WarPlanLessons;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const has=(unit,name)=>unit.members.some(m=>norm(m.name)===norm(name));
 const aspect=['Dire Avengers','Howling Banshees','Dark Reapers','Fire Dragons','Swooping Hawks','Warp Spiders','Fuegan','Asurmen','Jain Zar'];
 const unitIsAspect=u=>aspect.some(n=>has(u,n))||u.members.some(m=>L.unitInfo(m.name)?.keywords.some(k=>['aspectwarrior','aspectwarriors'].includes(norm(k))));
 const ability=id=>L.abilities.find(a=>a.id===id);
 function units(army){
  const result=[],groups=new Map();
  for(const entry of army.units){
   if(entry.group){
    if(!groups.has(entry.group)){const group={id:'group-'+entry.group,members:[],attached:false};groups.set(entry.group,group);result.push(group);}
    groups.get(entry.group).members.push(entry);
   }else result.push({id:entry.id,members:[entry],attached:false});
  }
  return result.map(u=>{
   const bodies=u.members.filter(m=>m.role==='bodyguard');
   const leaders=u.members.filter(m=>m.role==='leader'||m.role==='support');
   const body=bodies.length===1?bodies[0]:u.members[0];
   return {...u,body,leaders,attached:bodies.length===1&&leaders.length>0,
    priority:100,orderHint:''};
  });
 }
 function orderedUnits(state){return units(state.army).map(unit=>{
  const hints=unit.members.map(m=>L.guideMeta(L.unitInfo(m,state.army.faction)||{},'unit',state));
  const hint=chooseOrder(hints);return {...unit,priority:hint.priority,orderHint:hint.note};
 }).sort((a,b)=>a.priority-b.priority);}
 function chooseOrder(hints){const early=hints.filter(h=>h.priority<100).sort((a,b)=>a.priority-b.priority);return early[0]||hints.filter(h=>h.priority>100).sort((a,b)=>b.priority-a.priority)[0]||{priority:100,label:'',note:'',order:'normal'};}

 function sourceUnit(state,unit,name){return units(state.army).filter(u=>u.id!==unit.id&&has(u,name));}
 function leading(unit,name,bodyguard){return unit.attached&&unit.leaders.some(m=>m.role==='leader'&&norm(m.name)===norm(name))&&(!bodyguard||norm(unit.body.name)===norm(bodyguard));}
 // These are datasheet abilities, not permissions granted to every roster entry.
 const datasheetCoreIds=new Set(['damaged','damaged-objective-control','deadly-demise','feel-no-pain','firing-deck','hover','infiltrators','leader','lone-operative','scouts','stealth','super-heavy-walker','support']);
 function datasheetCoreId(rule){if(rule?.category!=='core')return null;const id=rule.sourceRuleId||rule.importSource?.sourceId||rule.id.replace(/^core-/,'');return datasheetCoreIds.has(id)?id:null;}
 function coreBearers(rule,state,unit){const id=datasheetCoreId(rule);return id?unit.members.filter(m=>L.unitInRule(m,rule,state.army)&&(!rule.units?.length||rule.units.some(name=>norm(name)===norm(m.name)))&&(L.unitHasRule(m,id,state.army.faction,state.army)||L.unitHasRule(m,rule.id,state.army.faction,state.army))):unit.members;}
 function fits(a,state,unit,armyMatched=false){
  if(!a||!L.guideRule(a,state)||(!armyMatched&&!L.matches(a,state.army))||!L.ruleMatchesContext(a,state))return false;
  // Native Support models can supply their own attached-unit abilities. A
  // manually assigned Support role alone cannot bypass the catalog requirement.
  if(!unit.members.some(m=>L.unitInRule(m,a,state.army)))return false;
  if(datasheetCoreId(a)&&!coreBearers(a,state,unit).length)return false;
  if(a.requiredLeaderKeywords&&(!unit.attached||!unit.leaders.some(m=>a.requiredLeaderKeywords.every(k=>L.unitInfo(m,state.army.faction)?.keywords.some(v=>norm(v)===norm(k))))))return false;
  if(a.leadingUnitRequired&&(!unit.attached||!unit.leaders.some(m=>a.units.includes(m.name)&&(m.role==='leader'||m.role==='support'&&L.unitHasRule(m,'support',state.army.faction)))||(a.leadingBodyguard&&norm(a.leadingBodyguard)!==norm(unit.body.name))))return false;
  if(a.enhancement&&!unit.members.some(m=>L.enhancementEquipped(a,m,state.army)))return false;
  if(a.expanded&&a.sourceRuleId){
   const refs=unit.members.flatMap(m=>(L.unitInfo(m,state.army.faction)?.abilities||[]).filter(r=>(r.id===a.sourceRuleId||r.id===a.id)).map(r=>({entry:m,ref:r})));
   if(refs.length&&refs.every(({entry,ref})=>ref.wargear&&!entry.details.some(d=>norm(d).includes(norm(ref.wargear)))))return false;
  }
  if(['swift','flitting','star-engines','opportunity','fade','sudden'].includes(a.id)&&!unit.members.every(m=>L.unitHasRule(m,'battle-focus-aeldari',state.army.faction)))return false;
  if(L.isDeepStrike(a)&&!unit.members.every(m=>L.unitHasRule(m,'deep-strike',state.army.faction,state.army)))return false;
  if(a.units.length&&!unit.members.some(m=>L.unitInRule(m,a,state.army)&&a.units.some(name=>norm(name)===norm(m.name))))return false;
  if(['path-warrior','khaines','final-breath','aspect-stratagems'].includes(a.id)&&!unitIsAspect(unit)&&!has(unit,'Avatar of Khaine'))return false;
  if(a.id==='warrior-focus-stratagem'&&!unitIsAspect(unit)&&!has(unit,'Avatar of Khaine'))return false;
  if(a.id==='preternatural-precision-stratagem'&&!unitIsAspect(unit))return false;
  if(a.id==='doom-inescapable-stratagem'&&!has(unit,'Avatar of Khaine'))return false;
  if(a.id==='murder'&&!unit.members.some(m=>norm(m.name)==='autarch'&&m.details.some(d=>norm(d).includes('aspectofmurder'))))return false;
  if(a.id==='fights-first'&&has(unit,'Autarch')&&!has(unit,'Howling Banshees')&&!has(unit,'Jain Zar'))return false;
  if(['whirling'].includes(a.id)&&!leading(unit,'Jain Zar'))return false;
  if(['asurmen-move'].includes(a.id)&&!leading(unit,'Asurmen'))return false;
  if(a.id==='strategist'&&!leading(unit,'Autarch'))return false;
  // Unknown equipment is a conditional reminder, never a presumed extra token.
  if(a.id==='token'){
   const equipped=unit.members.some(m=>m.details.some(d=>/aspect shrine token/i.test(d)));
   const sampleUnknown=unit.members.some(m=>String(m.id).startsWith('sample-'));
   if(!equipped&&!sampleUnknown)return false;
  }
  return true;
 }
 function selected(ids,state,unit){return ids.map(ability).filter(a=>!a?.adminManaged&&fits(a,state,unit)).flatMap(a=>{
  const card={...a,targetUnits:unit.members};
  if(a.id==='aspect-stratagems'){
   const ids=['warrior-focus-stratagem'];
   if(state.phase===2&&state.turn==='you'&&unitIsAspect(unit))ids.push('preternatural-precision-stratagem');
   if(state.phase===2&&state.turn==='you'&&has(unit,'Avatar of Khaine'))ids.push('doom-inescapable-stratagem');
   return ids.map(ability).filter(a=>a&&!a.adminManaged&&fits(a,state,unit)).map(a=>({...a,targetUnits:unit.members}));
  }
  return card;
 });}
 function fightsFirst(state,unit){
  if(state.phase!==4)return false;
  return unit.members.length>0&&unit.members.every(m=>{
   const override=L.unitInfo(m,state.army.faction)?.fightsFirst;
   if(override==='yes')return true;if(override==='no')return false;
   return L.isAeldari(state.army)&&leading(unit,'The Visarch')||L.unitHasRule(m,'fights-first',state.army.faction)||L.isAeldari(state.army)&&(['howlingbanshees','jainzar'].includes(norm(m.name))||(norm(m.name)==='autarch'&&leading(unit,'Autarch','Howling Banshees')));
  });
 }
 function targeting(a,state){
  if(!a.guideShared&&!['army','stratagem','core-stratagem'].includes(a.category))return null;
  if(a.expanded||a.targetText)return {label:['stratagem','core-stratagem'].includes(a.category)?'Target':'Applies to',text:a.targetText||'Check this rule’s target restrictions.'};
  const descriptions={
   'battle-focus':'Your army’s Battle Focus pool; no individual unit is targeted.',
   'battle-focus-end':'Your army’s unspent Battle Focus tokens; no individual unit is targeted.',
   swift:'One eligible friendly Battle Focus unit selected for a Normal, Advance or Fall Back move.',
   flitting:'One eligible friendly Battle Focus unit at its move-selection, battlefield-setup or charge-declaration trigger.',
   'star-engines':'One eligible friendly Vehicle unit with Battle Focus, selected to Advance.',
   opportunity:'One eligible friendly non-Titanic Battle Focus unit that started the phase engaged with the enemy that just finished Falling Back.',
   fade:'One eligible friendly non-Titanic Battle Focus unit hit by the enemy unit that just shot.',
   sudden:a.borrowedEffect?'The Battle Focus unit that used Sudden Strike earlier this turn; this is not a new activation window.':'One eligible friendly Battle Focus unit that just ended a charge move.',
   'path-warrior':'Your Aspect Warriors or Avatar of Khaine unit, when selected to shoot or fight.',
   khaines:'One friendly Aspect Warriors or Avatar of Khaine unit engaged with an enemy just selected to Fall Back. That enemy cannot be a Monster or Vehicle.',
   skyborne:'One unengaged friendly Asuryani unit that was eligible to fight, plus a friendly Transport it can embark within. The unit must be wholly within 6 inches to embark.',
   'final-breath':'One friendly Aspect Warriors or Avatar of Khaine unit selected as a target of the enemy unit’s attacks, just after those targets are selected.',
   'warrior-focus-stratagem':`One friendly Aspect Warriors or Avatar of Khaine unit not yet selected to ${state.phase===4?'fight':'shoot'} this phase.`,
   'preternatural-precision-stratagem':'One friendly Aspect Warriors unit not yet selected to shoot this phase.',
   'doom-inescapable-stratagem':'One friendly Avatar of Khaine model not yet selected to shoot this phase.',
   'aspect-stratagems':'Warrior Focus: an eligible Aspect Warriors or Avatar unit. Preternatural Precision: an eligible Aspect Warriors unit. Doom Inescapable: an eligible Avatar model. Check their individual timing restrictions.'
  };
  return {label:['stratagem','core-stratagem'].includes(a.category)?'Target':'Applies to',text:descriptions[a.id]||'Check this rule’s conditions for eligible targets.'};
 }
 function rangeBonus(unit){
  if(!leading(unit,'Fuegan','Fire Dragons'))return null;
  const rule=ability('fuegan-burning-lance');return rule&&!rule.adminManaged?{...rule,targetUnits:unit.members}:null;
 }
 function inherited(id,name,summary,conditions,state,unit){const a=ability(id);return a?{...a,name,summary,conditions,targetUnits:unit.members,borrowedEffect:true}:null;}
 function support(state,unit){
  if(!L.isAeldari(state.army))return [];
  const cards=[];
  if(state.phase===2&&state.turn==='you'){
   if(sourceUnit(state,unit,'War Walkers').length)cards.push(inherited('walker','Crystalline Targeting · from an earlier shooter','If friendly War Walkers already hit and selected this enemy for Crystalline Targeting this phase, improve AP by 1 for your qualifying Aeldari attacks against that enemy.',['The provider must have already shot, hit, and selected this same target.','Do not apply the benefit to attacks resolved earlier or stack repeated target selections contrary to the rule.'],state,unit));
   if(sourceUnit(state,unit,'Falcon').length)cards.push(inherited('falcon','Fire Support · only qualifying disembarked models','If these models disembarked from the relevant Falcon this turn, and that Falcon already hit and selected this enemy for Fire Support, their attacks against that enemy can reroll wounds for the turn.',['You must confirm which Falcon the models disembarked from; the export does not tell us.','Proximity or having a Falcon in the army does not establish the benefit.'],state,unit));
  }
  if([1,3].includes(state.phase)&&state.turn==='you'&&sourceUnit(state,unit,'Avatar of Khaine').length)cards.push(inherited('avatar-aura','The Bloody-Handed · check the Avatar’s aura','If this friendly Aeldari unit is within 6 inches of the Avatar when applicable, add 1 to its Advance or Charge roll.',['Check the actual aura distance.','This modifies a roll; it does not create an Advance roll when another rule replaces it.'],state,unit));
  return cards.filter(Boolean);
 }
 function baseStages(state,unit,mode){
  if(!unit)return [];
  if(mode==='response'){
   const phase=state.phase;
   if(phase===1)return [{id:'events',title:'When this unit can respond',hint:'Check the exact enemy event. Selection to Fall Back and the end of a Fall Back move are different windows.',cards:selected(['khaines','opportunity','strategist','autarch-discount'],state,unit)}];
   return [{id:'defence',title:'As attacks affect this unit',hint:'Check defensive conditions when an attack is allocated or targets this unit.',cards:selected(['avatar-defence','serpent-shield','deadly-demise','autarch-discount'],state,unit)},
    {id:'after',title:'After that enemy unit shoots',hint:'Resolve a response in its actual window before the next enemy activation.',cards:selected(['fade','strategist'],state,unit)}];
  }
  if(mode==='shooting'){
   const before=selected(['path-warrior','asurmen-hand','aspect-stratagems','autarch-discount'],state,unit);
   const range=L.isAeldari(state.army)?rangeBonus(unit):null;if(range)before.push(range);
   return [{id:'before',title:'Before this unit shoots',hint:'Check eligibility, weapons, range and targets. Make any before-selection or selection-time choices in their proper order.',cards:before},
    {id:'attacks',title:'Attacks',hint:'Keep bearer-only effects separate from whole-unit effects; check the target conditions before applying a benefit.',cards:[...selected(['dragons','bladestorm','reapers','jain-attacks','token'],state,unit),...support(state,unit)]},
    {id:'after',title:'After this unit shoots',hint:'Resolve these effects now, before selecting your next shooter.',cards:selected(['walker','falcon','asurmen-move'],state,unit)}];
  }
  if(mode==='movement')return [{id:'before',title:'Choose this unit’s move',hint:'Choose a legal move type. Apply choices at selection, not after seeing how the move turns out.',cards:[...selected(['swift','flitting','star-engines','whirling','strategist','flickerjump','deep-strike','avatar-aura'],state,unit),...support(state,unit)]},
   {id:'after',title:'After this unit moves or arrives',hint:'Check completed-move or setup triggers. An end-of-phase consequence still waits until the end of Movement.',cards:selected(['hawks'],state,unit)}];
  if(mode==='charge')return [{id:'before',title:'Charge Move',hint:'Check eligibility, roll, then attempt a legal charge move. A relevant exception does not cancel unrelated restrictions.',cards:[...selected(['acrobatic','flitting','avatar-aura'],state,unit),...support(state,unit)]},
   {id:'after',title:'After the charge move',hint:'These opportunities require the move to have actually happened.',cards:selected(['sudden'],state,unit)}];
  if(mode==='fight')return [{id:'before',title:'When this unit is selected to fight',hint:'Follow the phase’s activation order. Check Fights First and before-selection effects before rolling attacks.',cards:selected(['fights-first','path-warrior','aspect-stratagems','autarch-discount'],state,unit)},
   {id:'attacks',title:'Attacks',hint:'Apply the unit’s relevant melee effects. A token does not affect a Character model’s own roll.',cards:selected(['token','jain-attacks','murder'],state,unit)}];
  if(mode==='pile'||mode==='consolidate'){
   const sudden=L.isAeldari(state.army)&&unit.members.every(m=>L.unitHasRule(m,'battle-focus-aeldari',state.army.faction))?inherited('sudden','Sudden Strike · only if used earlier','If this unit used Sudden Strike at the end of its charge move earlier this turn, its pile-in and consolidation distance is 6 inches for the turn.',['This is a reminder of an existing effect, not a new activation window for that manoeuvre.','The move still has all its other positioning and eligibility requirements.'],state,unit):null;
   return [{id:'move',title:mode==='pile'?'Pile In':'Consolidate',hint:'Use the appropriate separate movement step. Increasing distance does not remove positioning requirements.',cards:sudden?[sudden]:[]}];
  }
  return [];
 }
 function activationCandidates(state,rules=L.abilities,armyMatched=false){return rules.map(a=>L.guideRule(a,state)).filter(Boolean).filter(a=>a.expanded&&L.ruleMatchesContext(a,state)&&(armyMatched||L.matches(a,state.army))).flatMap(a=>L.timingsFor(a,state).filter(t=>['act','select','before','react','after','arrivals'].includes(t.window)).map(t=>a.timings?{...a,window:t.window}:a));}
 function stages(state,unit,mode,candidates){
  const rows=baseStages(state,unit,mode);
  if(!unit||!rows.length)return rows;
  const moving=['pile','consolidate'].includes(mode),cards=(candidates||activationCandidates(state)).filter(a=>fits(a,state,unit,true)&&(moving?(L.fightMovementWindows?.(a)||[]).includes(mode):!(L.fightMovementWindows?.(a)||[]).length));
  for(const card of cards){const row=card.window==='after'?rows[rows.length-1]:card.window==='select'||card.window==='before'||card.window==='arrivals'?rows[0]:rows.find(r=>r.id==='attacks')||rows[0];row.cards.push({...card,targetUnits:unit.members});}
  return rows;
 }
 function baseSteps(state){
  const base=L.getSteps(state);const p=state.phase;
  if(state.guideMode==='learn'){const modes={'movement-select':state.turn==='opponent'?'response':'movement','shooting-select':state.turn==='opponent'?'response':'shooting','shooting-attacks':state.turn==='opponent'?'response':'shooting','shooting-after':state.turn==='opponent'?'response':'shooting','charge-declare':state.turn==='you'?'charge':null,'charge-move':state.turn==='you'?'charge':null,'fight-pile':'pile','fight-resolve':'fight','fight-consolidate':'consolidate'};return base.map(step=>modes[step.id]?{...step,activationMode:modes[step.id],learningWindowed:true}:step);}
  if(![1,2,3,4].includes(p))return base;
  if(p===4)return base.map(s=>s.id==='fight-pile'?{...s,activationMode:'pile'}:s.id==='fight-resolve'?{...s,id:'fight-activations',title:'Unit Fights',activationMode:'fight'}:s.id==='fight-consolidate'?{...s,activationMode:'consolidate'}:s);
  const first=base[0],last=base[base.length-1];
  const mode=state.turn==='opponent'?'response':p===1?'movement':p===2?'shooting':'charge';
  // Opponent charge sequence has no friendly activations to invent.
  if(p===3&&state.turn==='opponent')return base;
  const verbs={movement:'Move Units',shooting:'Unit Shooting',charge:'Charge Moves',response:p===2?'Opponent’s Shooting':'Opponent’s Movement'};
  const body={movement:'Select each eligible unit in turn, including units that Remain Stationary. Resolve its move and immediate effects before selecting another unit. Apply the separate rules for embarked units and arrivals.',shooting:'Scan the unit cards as your army shoots. Setup shooters appear early because their effects may help later units. You choose the legal order.',charge:'Keep these cards beside your charge decisions. Check the relevant unit’s conditions without selecting it in the app.',response:'The opponent resolves one unit at a time. Your shared responses and affected-unit reminders are visible together below; this does not activate your army in place of theirs.'};
  const merged={...base[1],id:mode==='response'?'opponent-'+(p===1?'movement':'shooting')+'-activations':mode+'-activations',title:verbs[mode],body:body[mode],activationMode:mode,coreHelp:base.slice(1,-1),window:'activation',why:'Keep the rules attached to the unit and the actual event, rather than splitting one activation across generic screens.',question:'When should you select another unit?',answer:'After resolving the current unit’s legal sequence and immediate effects. End-of-phase rules still wait until the phase closes.'};
  return [first,merged,last];
 }
 function steps(state){return baseSteps(state).map(step=>{const result=L.applyStep(step);return state.turn==='opponent'?{...result,body:result.body.replace(/your unit/g,'the active unit')}:result;});}
 function isAnyTimeRule(rule,state){const projected=L.guideRule(rule,state);return !!projected&&L.timingsFor(projected,state).some(t=>t.window==='react'||t.window==='act'&&(projected.category==='core'||[0,1,2,3,4].every(phase=>t.phase?.includes(phase))));}
 function flashcards(state,step,prepared=null){
  const sharedMap=new Map(),types=new Map();
  const candidates=step.activationMode?(prepared?.activation||activationCandidates(state)):null;
  const stepCards=step.activationMode?null:L.forStep(state,step,prepared?.rules,!!prepared).filter(a=>!a.sequencePreview);
  const ruleKey=a=>JSON.stringify([a.id,a.name,a.summary,a.conditions,a.sourceIds]);
  function typeFor(member){
   const key=norm(member.name)+(member.catalogUnitId?'|'+member.catalogUnitId:'');
   if(!types.has(key)){
    const display=units({faction:state.army.faction,units:[{...structuredClone(member),group:'',role:''}]})[0];display.id='unit-type-'+key;
    types.set(key,{unit:display,instances:[],items:new Map(),sharedIds:new Set()});
   }
   return types.get(key);
  }
  function owners(a,unit){
   if(datasheetCoreId(a))return coreBearers(a,state,unit);
   if(a.enhancement)return unit.members.filter(m=>L.enhancementEquipped(a,m,state.army));
   return a.units?.length?unit.members.filter(m=>L.unitInRule(m,a,state.army)&&a.units.some(name=>norm(name)===norm(m.name))):unit.members;
  }
  for(const unit of orderedUnits(state)){
   for(const member of [unit.body,...unit.members.filter(m=>m!==unit.body)]){const record=typeFor(member);if(!record.instances.some(u=>u.id===unit.id))record.instances.push(unit);}
   const rows=step.activationMode?stages(state,unit,step.activationMode,candidates):[{title:step.anyTime?'Throughout this phase — check trigger':'At this step',cards:stepCards.filter(a=>fits(a,state,unit,true))}];
   const seen=new Set();
   for(const row of rows)for(const a of row.cards){
    if(step.learningWindowed&&!a.borrowedEffect&&!L.timingMatches(a,state,step))continue;
    if(prepared?.skipAnyTime&&isAnyTimeRule(a,state)||step.anyTime&&!isAnyTimeRule(a,state))continue;
    if(state.guideRuleTypes?.[a.category]===false)continue;
    if(a.borrowedEffect&&['walker','falcon','avatar-aura'].includes(a.id))continue;
    const key=ruleKey(a);if(seen.has(key))continue;seen.add(key);
    const item={...a,guideMeta:L.ruleGuideMeta(a,state),timing:a.timings?L.ruleTimingLabel(a):a.expanded?(a.triggerText||row.title):row.title};
    if(a.guideShared||['army','stratagem','core-stratagem'].includes(a.category)){
     if(!sharedMap.has(key))sharedMap.set(key,{...item,key,appliesTo:[],battlefieldUnits:[]});
     const shared=sharedMap.get(key);const bearers=owners(a,unit),display=datasheetCoreId(a)?{...unit,members:bearers,body:bearers.includes(unit.body)?unit.body:bearers[0]}:unit;shared.battlefieldUnits.push(display);
     for(const member of (datasheetCoreId(a)?bearers:unit.members).filter(m=>L.unitInRule(m,a,state.army))){const record=typeFor(member);if(!shared.appliesTo.some(u=>norm(u.body.name)===norm(member.name)))shared.appliesTo.push(record.unit);record.sharedIds.add(key);}
    }else{
     for(const member of owners(a,unit)){
      const record=typeFor(member);
      if(!record.items.has(key))record.items.set(key,{...item,targetUnits:[member]});
     }
    }
   }
  }
  // Share a repeated rule across distinct unit types, not repeated squads.
  const repeated=new Map();
  for(const record of types.values())for(const [key,item] of record.items){
   if(!repeated.has(key))repeated.set(key,{item,records:[]});repeated.get(key).records.push(record);
  }
  for(const [key,entry] of repeated){
   if(entry.records.length<=2||entry.item.id==='fights-first')continue;
   const sharedKey='repeated:'+key;
   sharedMap.set(sharedKey,{...entry.item,key:sharedKey,appliesTo:entry.records.map(r=>r.unit),promoted:true});
   for(const record of entry.records){record.items.delete(key);record.sharedIds.add(sharedKey);}
  }
  const unitCards=[...types.values()].map(r=>{
   const source=L.unitInfo(r.unit.body,state.army.faction)||{},unitMeta=L.guideMeta(state.guideRuleTypes?.ability===false?{}:source,'unit',state);
   const items=[...r.items.values()].sort((a,b)=>a.guideMeta.priority-b.guideMeta.priority);
   const hints=[unitMeta,...items.map(a=>a.guideMeta)],order=chooseOrder(hints);
   const mainActivation=!!step.activationMode&&!['pile','consolidate'].includes(step.activationMode);
   const first=state.guideRuleTypes?.ability!==false&&state.phase===4&&r.instances.every(unit=>fightsFirst(state,unit));
   const conditionalFirst=state.guideRuleTypes?.ability!==false&&state.phase===4&&source.fightsFirst==='yes'&&!first;
   const flags=[...new Set([...(conditionalFirst?['Fights First · check attachments']:[]),...hints.flatMap(h=>h.flags).filter(flag=>!first||norm(flag)!=='fightsfirst')])];
   const notes=[...new Set([...(conditionalFirst?['This datasheet is marked Fights First. Every model in its attached unit must also qualify.']:[]),...hints.filter(h=>h.note&&(h.priority!==100||h.flags.length)).map(h=>h.note)])];
   return {unit:{...r.unit,priority:order.priority,orderHint:order.note},instances:r.instances,items,sharedIds:[...r.sharedIds],guideMeta:{...order,flags,notes},fightsFirst:first,show:items.length>0||mainActivation&&(first||flags.length>0||order.priority!==100)};
  }).filter(r=>r.show).sort((a,b)=>a.unit.priority-b.unit.priority);
  const shared=[...sharedMap.values()].sort((a,b)=>a.guideMeta.priority-b.guideMeta.priority);
  return {shared,unitCards,count:shared.length+unitCards.length};
 }

 // Each Guide owns a bounded cache. Catalog revisions and roster changes discard it.
 function createSession(){
  let context=null,armyRules=[];const decks=new Map(),coverageCache=new Map(),activationCache=new Map();
  function reset(){context=null;armyRules=[];decks.clear();coverageCache.clear();activationCache.clear();}
  function prepare(state){
   const generation=root.WarPlannerContent?.generation;
   const next=JSON.stringify([generation??null,state.army,state.firstPlayer,state.guideMode,state.guideShowCoreStratagems===true,state.guideShowDeepStrike!==false,state.guideRuleTypes]);
   if(context!==next){reset();context=next;armyRules=L.abilities.filter(a=>L.matches(a,state.army));}
  }
  function deck(state,step,skipAnyTime=false){
   prepare(state);
   const key=JSON.stringify([state.phase,state.turn,state.round,step,skipAnyTime]);
   if(!decks.has(key)){
    if(decks.size>=80)decks.delete(decks.keys().next().value);
    const phaseKey=JSON.stringify([state.phase,state.turn,state.round]);
    if(!activationCache.has(phaseKey)){if(activationCache.size>=80)activationCache.delete(activationCache.keys().next().value);activationCache.set(phaseKey,activationCandidates(state,armyRules,true));}
    decks.set(key,flashcards(state,step,{rules:armyRules,activation:activationCache.get(phaseKey),skipAnyTime}));
   }
   return decks.get(key);
  }
  function coverage(state){
   prepare(state);
   const key=JSON.stringify([state.phase,state.turn,state.round]);
   if(!coverageCache.has(key)){
    if(coverageCache.size>=80)coverageCache.delete(coverageCache.keys().next().value);
    coverageCache.set(key,{
     unsupported:state.army.units.filter(u=>!L.unitInfo(u,state.army.faction)),
     phaseHasAbilities:L.phases[state.phase].steps.some(step=>L.forStep(state,step,armyRules,true).some(a=>!['core','core-stratagem'].includes(a.category)))
    });
   }
   return coverageCache.get(key);
  }
  return {deck,stepDeck:(state,step)=>deck(state,step,true),anyTime:state=>deck(state,{id:'guide-any-time',window:'act',anyTime:true}),coverage,reset};
 }

 const api={units,orderedUnits,stages,steps,rangeBonus,leading,support,has,flashcards,fightsFirst,targeting,createSession};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlanActivations=api;
})(typeof window!=='undefined'?window:globalThis);
