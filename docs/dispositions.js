/* Mission Deck 2026–27: optional, source-based primary mission cheat sheets. */
(function(root){
 'use strict';
 const sourceUrl='https://wahapedia.ru/wh40k11ed/the-rules/mission-deck-2026-27/';
 const names=['Take and Hold','Purge the Foe','Disruption','Reconnaissance','Priority Assets'];
 const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const resolve=value=>names.find(name=>normalize(name)===normalize(value))||null;
 // Rows are YOUR disposition; columns are the OPPONENT'S disposition.
 const matrix=[
  ['Battlefield Dominance','Immovable Object','Determined Acquisition','Purge and Secure','Inescapable Dominion'],
  ['Unstoppable Force','Meatgrinder','Punishment','Consecrate',"Destroyer's Wrath"],
  ['Death Trap','Delaying Action','Outmanoeuvre','Smoke and Mirrors','Locate and Deny'],
  ['Reconnaissance Sweep','Triangulation','Surveil the Foe','Gather Intel','Search and Scour'],
  ['Secure Asset','Vital Link','Extract Relic','Vanguard Operation','Sabotage']
 ];
 const missions={};
 function mission(name,command,turn,options={}){missions[name]={name,command,turn,...options};}
 const nonHome='one or more objectives other than your home objective';
 mission('Battlefield Dominance','3VP per controlled objective; add 2VP per non-home objective if you also control your home objective.','Rounds 1–2: 2VP if you control more objectives than the opponent.',{turnMax:2});
 mission('Immovable Object','5VP per controlled non-home objective.','3VP if you control any central objective.');
 mission('Determined Acquisition','3VP per controlled objective, plus 3VP per such objective in enemy territory.','2VP per non-home objective you control now but did not control at turn start.');
 mission('Purge and Secure','4VP per controlled non-home objective.','3VP if an enemy was destroyed by a friendly unit in objective range, OR if an enemy that began the turn in objective range was destroyed; these alternatives do not stack. From round 2, also gain 3VP for controlling any new non-home objective you did not control at turn start.');
 mission('Inescapable Dominion','5VP for controlling at least 2 objectives; also 4VP for controlling more than the opponent.','4VP for controlling at least 3 objectives.',{battle:'5VP if you control the enemy home objective.'});
 mission('Unstoppable Force','4VP per controlled non-home objective.','3VP if any enemy unit was destroyed this turn. From round 2, also gain 3VP if you control any new non-home objective you did not control at turn start.',{battle:'5VP if you control any central objective.'});
 mission('Meatgrinder','4VP for controlling '+nonHome+'.','3VP if any enemy unit was destroyed this turn. From round 2: also 5VP if more enemy units died this turn than friendly units died in the previous turn, and 5VP if you control the enemy home objective.');
 mission('Punishment','4VP for controlling '+nonHome+'; also 5VP if you control more objectives than the opponent.','At the end of either turn: 5VP if any condemned enemy unit left the battlefield this turn.',{eitherTurn:true,start:'At your turn start, condemn 1–3 on-battlefield enemy units that are in objective range and/or destroyed friendly units in the previous turn. If none qualify, condemn 1 on-battlefield enemy instead. They remain condemned until your next turn starts.',battle:'8VP if you control the enemy home objective.'});
 mission('Consecrate','4VP for controlling '+nonHome+'; also 4VP if you control more objectives than the opponent.','Before checking score, each consecration unit may consecrate an unconsecrated non-home objective it is in range of: place your operation marker and it ceases to be a consecration unit. Score 3VP for 1–2 consecrated objectives, or 6VP for at least 3.',{event:'Whenever a friendly unit destroys a unit, that friendly unit becomes a consecration unit.',battle:'5VP if the enemy home objective is consecrated.'});
 mission("Destroyer's Wrath",'4VP for controlling '+nonHome+'; also 6VP if you control more objectives than the opponent.','3VP if any enemy unit was destroyed this turn. From round 2: also 4VP if more enemy units died this turn than friendly units died in the previous turn.');
 mission('Death Trap','4VP for controlling '+nonHome+'.','2VP per terrain area trapped this turn, plus 3VP per such terrain area that is an objective. Also 3VP if an enemy that began the turn in a trapped terrain area was destroyed.');
 mission('Delaying Action','4VP for controlling one or more objectives other than home objectives.','2VP per enemy unit destroyed this turn. From round 2: also 3VP if you control at least 1 central and at least 1 expansion objective.');
 mission('Outmanoeuvre','Rounds 2–3: 5VP per controlled non-home objective.','10VP if you control the enemy home objective. Round 1: also 4VP per controlled non-home objective. Rounds 4–5: also 6VP per controlled non-home objective.',{commandMax:3});
 mission('Smoke and Mirrors','4VP for controlling '+nonHome+'.','2VP per decoyed objective, plus 2VP per such objective in enemy territory.',{battle:'10VP if at least 4 objectives are decoyed.'});
 mission('Locate and Deny','4VP for controlling '+nonHome+'.','4VP if an enemy that began the turn in objective range was destroyed. Also 4VP if exactly 1 of your operation markers remains, a friendly unit is in its terrain area, and no enemies are in that area.',{setup:'At battle start, place 1 of your operation markers in each of 5 terrain areas outside your deployment zone. If fewer than 5 qualify, place one in each qualifying area.',battle:'5VP if exactly 1 of your operation markers remains, a friendly unit is in its terrain area, and no enemies are in that area.'});
 mission('Reconnaissance Sweep','3VP for controlling '+nonHome+'.','3VP for at least 3 friendly units wholly within 3 different table quarters and outside 6 inches of the centre; OR 6VP for at least 4 such units in all 4 quarters. Also 1VP per enemy unit destroyed this turn.');
 mission('Triangulation','4VP for controlling '+nonHome+'.','From round 2: 3VP for 1 triangulated objective, 6VP for 2, OR 10VP for at least 3.',{turnMin:2,battle:'10VP if you control at least 4 objectives.'});
 mission('Surveil the Foe','4VP for controlling '+nonHome+'; also 4VP if you control more objectives than the opponent.','4VP if any enemy was surveilled this turn, unless every surveilled unit is in range of objectives with operation markers. From round 2: also 5VP if none of the opponent’s operation markers remain.',{event:'Whenever a friendly unit ends a move in range of an objective bearing enemy operation markers, remove those markers.'});
 mission('Gather Intel','4VP for controlling '+nonHome+'.','Round 1: 6VP if you control any central objective. From round 2: 7VP per friendly unit that completed Extract Intelligence this turn.',{battle:'5VP if at least 3 of your operation markers remain; also 5VP if one is in range of the enemy home objective.'});
 mission('Search and Scour','4VP per controlled non-home objective.','3VP if you control any central objective. Also 2VP if an enemy that began the turn in a terrain area was destroyed.',{battle:'5VP if no enemy unit is wholly within your territory.'});
 mission('Secure Asset','4VP for controlling '+nonHome+'; also 4VP if you control at least 3 objectives.','4VP if a friendly unit secured the asset this turn. Also 2VP if an enemy that began the turn in range of a central objective was destroyed.');
 mission('Vital Link','4VP for controlling '+nonHome+'; add 4VP if any is a central objective.','2VP if you control any central objective, plus 1VP per friendly operation marker in range of those controlled central objectives.',{battle:'10VP if you control the enemy home objective.'});
 mission('Extract Relic','4VP for controlling '+nonHome+'.','4VP if a friendly unit performed a sensor sweep this turn. Also 3VP if an enemy that began the turn in objective range was destroyed. Also 4VP if exactly 1 enemy operation marker remains, a friendly unit shares its terrain area, and no enemies are in that area.',{battle:'5VP if exactly 1 enemy operation marker remains, a friendly unit shares its terrain area, and no enemies are in that area.'});
 mission('Vanguard Operation','4VP for controlling '+nonHome+'.','4VP if a friendly unit performed a vanguard operation this turn; also 2VP if any enemy unit was destroyed this turn.',{battle:'10VP if you control the enemy home objective.'});
 mission('Sabotage','4VP for controlling '+nonHome+'.','3VP per friendly unit that committed sabotage this turn, plus 2VP per such unit in range of an objective in enemy territory.');
 function action(missionName,name,units,completion,effect,options={}){missions[missionName].action={name,units,completion,effect,limit:'Once per turn.',min:1,...options};}
 const control='At your turn end, if the acting unit controls that objective.';
 action('Death Trap','Booby Trap','A friendly unit in range of a non-home objective or in a terrain area outside your deployment zone; the terrain area must not already be trapped.','Immediately.','Trap that terrain area and place your operation marker inside it.',{limit:'Unlimited; each acting unit must be in a different terrain area.'});
 action('Smoke and Mirrors','Decoy','A friendly unit in range of a non-home objective that is not already decoyed.',control,'Decoy that objective and place your operation marker in range.',{limit:'Unlimited; each acting unit must be at a different objective.'});
 for(const name of ['Locate and Deny','Extract Relic'])action(name,'Sensor Sweep','A friendly unit in range of a central objective.',control,'Perform a sensor sweep and remove one operation marker from the battlefield.',{restriction:'Cannot start if only one operation marker remains.'});
 action('Triangulation','Triangulate','A friendly unit in range of a non-home objective.',control,'Triangulate that objective and place your operation marker in range.',{min:2});
 action('Surveil the Foe','Surveil the Foe','A friendly unit.','Immediately.','Select a visible enemy within 18 inches that has not been surveilled this turn; it is surveilled until the turn ends.',{limit:'Unlimited.'});
 action('Gather Intel','Extract Intelligence','A unit in range of a non-home objective with none of your operation markers in range.',control,'Place your operation marker in range of that objective.',{min:2,limit:'Unlimited; each acting unit must be at a different objective.'});
 action('Secure Asset','Secure Asset','A friendly unit in range of a non-home objective.',control,'That unit secures the asset.');
 action('Vital Link','Maintain Control','A friendly unit in range of a central objective.',control,'Place your operation marker in range of that objective.');
 action('Vanguard Operation','Vanguard Operation','A friendly unit in a terrain area in enemy territory.','At your turn end, if no enemy unit is in that terrain area.','That unit performs a vanguard operation.');
 action('Sabotage','Sabotage','A unit in range of a non-home objective.',control,'That unit commits sabotage.',{limit:'Unlimited; each acting unit must be at a different objective.'});
 function matchup(own,opponent){const a=resolve(own),b=resolve(opponent);return a&&b?missions[matrix[names.indexOf(a)][names.indexOf(b)]]:null;}
 function reminders(state,step){
  if(state.guideDisposition?.enabled!==true||state.guideRuleTypes?.disposition===false)return [];
  const m=matchup(state.army.disposition,state.guideDisposition.opponent);if(!m)return [];
  const round=state.round,own=state.turn==='you',rows=[];if(round<1||round>5)return rows;
  const add=(id,title,text)=>rows.push({id:'mission-'+normalize(m.name)+'-'+id,title,mission:m.name,text:text+(/scoring/.test(title.toLowerCase())?' Primary mission limits: 15VP per battle round and 45VP total.':''),sourceUrl});
  const opening=state.phase===0&&step.id==='round-start';
  if(round===1&&state.turn===state.firstPlayer&&opening&&m.setup)add('setup','Battle setup',m.setup);
  if(own&&state.phase===0&&step.id==='turn-start'&&m.start)add('start','Start of your turn',m.start);
  if(own&&state.phase===0&&step.id==='command-end'&&round>=2&&round<=Math.min(4,m.commandMax||4))add('command','Primary scoring · End of Command',m.command);
  if(own&&state.phase===2&&step.activationMode==='shooting'&&m.action&&round>=m.action.min){
   const a=m.action;add('action',a.name+' · Objective action','Start in your Shooting phase. '+a.units+' Use limit: '+a.limit+' Completes: '+a.completion+' Effect: '+a.effect+(a.restriction?' '+a.restriction:'')+' Check core action eligibility before starting; this reminder does not establish that a unit can act.');
  }
  if(m.event&&((m.name==='Consecrate'&&[2,4].includes(state.phase)&&step.activationMode)||m.name==='Surveil the Foe'&&state.phase===1&&step.activationMode))add('event','Mission opportunity',m.event);
  if(state.phase===4&&step.id==='turn-end'){
   if(own&&m.action&&round>=m.action.min&&m.action.completion!=='Immediately.')add('complete','Complete '+m.action.name,m.action.completion+' '+m.action.effect);
   if(own&&round>= (m.turnMin||1)&&round<=(m.turnMax||5))add('turn','Primary scoring · End of your turn',m.turn);
   else if(!own&&m.eitherTurn)add('turn','Primary scoring · End of opponent’s turn',m.turn);
   if(own&&round===5&&(!m.commandMax||m.commandMax>=5))add('command','Round 5 primary scoring',m.command+' Score this at turn end instead of Command-phase end.');

  }
  if(round===5&&step.id==='round-end'&&m.battle)add('battle','End-of-battle primary scoring',m.battle);
  return rows;
 }
 const api={names,resolve,matchup,reminders};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerDispositions=api;
})(typeof window!=='undefined'?window:globalThis);
