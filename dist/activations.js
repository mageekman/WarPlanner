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
    priority:has(u,'War Walkers')?10:has(u,'Shroud Runners')?15:has(u,'Falcon')?20:100,
    orderHint:has(u,'War Walkers')?'Consider early: its marked target can help later shooters.':has(u,'Shroud Runners')?'Consider early: Target Acquisition can remove cover before later shooters.':has(u,'Falcon')?'Consider before models that disembarked from this Falcon.':''};
  });
 }
 function orderedUnits(state){const list=units(state.army);return state.phase===2&&state.turn==='you'?list.sort((a,b)=>a.priority-b.priority):list;}
 function sourceUnit(state,unit,name){return units(state.army).filter(u=>u.id!==unit.id&&has(u,name));}
 function leading(unit,name,bodyguard){return unit.attached&&unit.leaders.some(m=>m.role==='leader'&&norm(m.name)===norm(name))&&(!bodyguard||norm(unit.body.name)===norm(bodyguard));}
 function fits(a,state,unit){
  if(!a||!L.matches(a,state.army))return false;
  if(a.leadingUnitRequired&&(!unit.attached||!unit.leaders.some(m=>m.role==='leader'&&a.units.includes(m.name))))return false;
  if(a.expanded&&a.enhancement&&!unit.members.some(m=>m.details.some(d=>/^enhancement\s*:/i.test(d)&&norm(d.replace(/^enhancement\s*:/i,'')).includes(norm(a.enhancement)))))return false;
  if(a.expanded&&a.sourceRuleId){
   const refs=unit.members.flatMap(m=>(L.unitInfo(m.name)?.abilities||[]).filter(r=>r.id===a.sourceRuleId).map(r=>({entry:m,ref:r})));
   if(refs.length&&refs.every(({entry,ref})=>ref.wargear&&!entry.details.some(d=>norm(d).includes(norm(ref.wargear)))))return false;
  }
  if(['swift','flitting','star-engines','opportunity','fade','sudden'].includes(a.id)&&!unit.members.every(m=>L.unitHasRule(m,'battle-focus-aeldari')))return false;
  if(a.id==='deep-strike'&&!unit.members.every(m=>L.unitHasRule(m,'deep-strike')))return false;
  if(a.units.length&&!a.units.some(name=>has(unit,name)))return false;
  if(['path-warrior','khaines','final-breath','aspect-stratagems'].includes(a.id)&&!unitIsAspect(unit)&&!has(unit,'Avatar of Khaine'))return false;
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
 function selected(ids,state,unit){return ids.map(ability).filter(a=>fits(a,state,unit)).flatMap(a=>{
  const card={...a,targetUnits:unit.members};
  if(a.id==='aspect-stratagems'){
   const conditions=['This is an optional Stratagem window, not an automatic bonus.','Check the full current rule for CP cost, effect and restrictions before using it.'];
   const cards=[{...card,id:'warrior-focus-stratagem',name:'Warrior Focus',summary:'Consider this Stratagem before selecting an eligible unit to shoot or fight. Read the full effect and cost in your current rules.',conditions}];
   if(state.phase===2&&state.turn==='you'&&unitIsAspect(unit))cards.push({...card,id:'preternatural-precision-stratagem',name:'Preternatural Precision',summary:'A before-shooting option for an Aspect Warriors unit. Check the full rule, including its optional Aspect Shrine Token choice.',conditions});
   if(state.phase===2&&state.turn==='you'&&has(unit,'Avatar of Khaine'))cards.push({...card,id:'doom-inescapable-stratagem',name:'Doom Inescapable',summary:'A before-shooting option for the Avatar of Khaine. Check the full current effect and cost before declaring it.',conditions});
   return cards;
  }
  return card;
 });}
 function fightsFirst(state,unit){
  if(state.phase!==4||!L.isAeldari(state.army))return false;
  if(leading(unit,'The Visarch'))return true;
  return unit.members.length>0&&unit.members.every(m=>L.unitHasRule(m,'fights-first')||['howlingbanshees','jainzar'].includes(norm(m.name))||(norm(m.name)==='autarch'&&leading(unit,'Autarch','Howling Banshees')));
 }
 function targeting(a,state){
  if(!['army','stratagem'].includes(a.category))return null;
  if(a.expanded)return {label:a.category==='stratagem'?'Target':'Applies to',text:a.targetText||'Check this rule’s target restrictions.'};
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
  return {label:a.category==='stratagem'?'Target':'Applies to',text:descriptions[a.id]||'Check this rule’s conditions for eligible targets.'};
 }
 function rangeBonus(unit){
  if(!leading(unit,'Fuegan','Fire Dragons'))return null;
  return {id:'fuegan-burning-lance',name:'Burning Lance · Fuegan leading',category:'ability',units:['Fuegan'],phase:[2],turn:'you',window:'before',status:'community-checked',sourceIds:['fuegan'],targetUnits:unit.members,
   summary:'While Fuegan is still leading this unit, its Melta weapons add 6 inches to their Range characteristic. Check the resulting range before choosing targets.',
   conditions:['Requires Fuegan to be attached as a leader to this Fire Dragons unit and still leading it.','Only Melta weapons receive the increase. Keep each weapon’s other rules and limits.'],question:'Does a separate Fuegan elsewhere in your army extend this unit’s range?',answer:'No. Being in the same army is not enough; the leading relationship is required.'};
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
   const sudden=L.isAeldari(state.army)&&unit.members.every(m=>L.unitHasRule(m,'battle-focus-aeldari'))?inherited('sudden','Sudden Strike · only if used earlier','If this unit used Sudden Strike at the end of its charge move earlier this turn, its pile-in and consolidation distance is 6 inches for the turn.',['This is a reminder of an existing effect, not a new activation window for that manoeuvre.','The move still has all its other positioning and eligibility requirements.'],state,unit):null;
   return [{id:'move',title:mode==='pile'?'Pile In':'Consolidate',hint:'Use the appropriate separate movement step. Increasing distance does not remove positioning requirements.',cards:sudden?[sudden]:[]}];
  }
  return [];
 }
 function stages(state,unit,mode){
  const rows=baseStages(state,unit,mode);
  if(!unit||!rows.length||['pile','consolidate'].includes(mode))return rows;
  const cards=L.abilities.filter(a=>a.expanded&&a.phase.includes(state.phase)&&(a.turn==='either'||a.turn===state.turn)&&['act','select','react','after','arrivals'].includes(a.window)&&fits(a,state,unit));
  for(const card of cards){const row=card.window==='after'?rows[rows.length-1]:card.window==='select'||card.window==='arrivals'?rows[0]:rows.find(r=>r.id==='attacks')||rows[0];row.cards.push({...card,targetUnits:unit.members});}
  return rows;
 }
 function steps(state){
  const base=L.getSteps(state);const p=state.phase;
  if(![1,2,3,4].includes(p))return base;
  if(p===4)return base.map(s=>s.id==='fight-pile'?{...s,activationMode:'pile'}:s.id==='fight-resolve'?{...s,id:'fight-activations',title:'Unit Fights',activationMode:'fight'}:s.id==='fight-consolidate'?{...s,activationMode:'consolidate'}:s);
  const first=base[0],last=base[base.length-1];
  const mode=state.turn==='opponent'?'response':p===1?'movement':p===2?'shooting':'charge';
  // Opponent charge sequence has no friendly activations to invent.
  if(p===3&&state.turn==='opponent')return base;
  const verbs={movement:'Move Units',shooting:'Unit Shooting',charge:'Charge Moves',response:p===2?'Opponent’s Shooting':'Opponent’s Movement'};
  const body={movement:'Scan your shared movement options and the units with relevant abilities below. Resolve moves in any legal order; there is no unit checklist to complete.',shooting:'Scan the unit cards as your army shoots. Setup shooters appear early because their effects may help later units. You choose the legal order.',charge:'Keep these cards beside your charge decisions. Check the relevant unit’s conditions without selecting it in the app.',response:'The opponent resolves one unit at a time. Your shared responses and affected-unit reminders are visible together below; this does not activate your army in place of theirs.'};
  const merged={...base[1],id:mode==='response'?'opponent-'+(p===1?'movement':'shooting')+'-activations':mode+'-activations',title:verbs[mode],body:body[mode],activationMode:mode,coreHelp:base.slice(1,-1),window:'activation',why:'Keep the rules attached to the unit and the actual event, rather than splitting one activation across generic screens.',question:'When should you select another unit?',answer:'After resolving the current unit’s legal sequence and immediate effects. End-of-phase rules still wait until the phase closes.'};
  return [first,merged,last];
 }
 function flashcards(state,step){
  const sharedMap=new Map(),unitCards=[],records=[];
  for(const unit of orderedUnits(state)){
   const rows=step.activationMode?stages(state,unit,step.activationMode):[{title:'At this step',cards:L.forStep(state,step).filter(a=>!a.sequencePreview&&fits(a,state,unit))}];
   const items=[],sharedIds=new Set(),seen=new Set();
   for(const row of rows)for(const a of row.cards){
    // A provider's own unit card explains the effect once, rather than repeating
    // the same hypothetical benefit under every possible recipient.
    if(a.borrowedEffect&&['walker','falcon','avatar-aura'].includes(a.id))continue;
    const key=a.id+'|'+a.name+'|'+a.summary;
    if(seen.has(key))continue;seen.add(key);
    const item={...a,timing:a.expanded?(a.triggerText||row.title):row.title};
    if(a.category==='army'||a.category==='stratagem'){
     if(!sharedMap.has(key))sharedMap.set(key,{...item,key,appliesTo:[]});
     sharedMap.get(key).appliesTo.push(unit);sharedIds.add(key);
    }else items.push(item);
   }
   if(items.length)records.push({unit,items,sharedIds});
  }
  // Count imported battlefield units before identical squads are visually merged.
  // A leader/bodyguard group is one user of a rule, not one user per model.
  const repeated=new Map();
  const ruleKey=a=>JSON.stringify([a.id,a.name,a.summary,a.conditions,a.sourceIds]);
  for(const record of records)for(const item of record.items){
   const key=ruleKey(item);
   if(!repeated.has(key))repeated.set(key,{item,units:new Map()});
   repeated.get(key).units.set(record.unit.id,record.unit);
  }
  for(const [key,entry] of repeated){
   if(entry.units.size<=2)continue;
   const sharedKey='repeated:'+key;
   sharedMap.set(sharedKey,{...entry.item,key:sharedKey,appliesTo:[...entry.units.values()],promoted:true});
   for(const record of records){
    if(!record.items.some(a=>ruleKey(a)===key))continue;
    record.items=record.items.filter(a=>ruleKey(a)!==key);
    record.sharedIds.add(sharedKey);
   }
  }
  for(const {unit,items,sharedIds} of records){
   // A unit-only card adds no information when all its rules are already shared.
   if(!items.length)continue;
   const signature=JSON.stringify([unit.body.name,unit.leaders.map(m=>m.name),items.map(a=>[a.id,a.name,a.summary,a.conditions]),[...sharedIds]]);
   const existing=unitCards.find(c=>c.signature===signature);
   if(existing)existing.instances.push(unit);
   else unitCards.push({signature,unit,instances:[unit],items,sharedIds:[...sharedIds]});
  }
  const shared=[...sharedMap.values()];
  return {shared,unitCards,count:shared.length+unitCards.length};
 }
 const api={units,orderedUnits,stages,steps,rangeBonus,leading,support,has,flashcards,fightsFirst,targeting};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlanActivations=api;
})(typeof window!=='undefined'?window:globalThis);
