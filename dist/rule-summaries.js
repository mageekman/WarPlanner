/* Player-facing summaries. Unsupported restrictions stay in the source-details view. */
(function(root){
 'use strict';
 const notes=typeof module!=='undefined'&&module.exports?require('./rule-notes.js'):root.WarPlannerRuleNotes;
 const only=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));
 const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
 const same=(a,b)=>stable(a)===stable(b),lower=s=>s[0].toLowerCase()+s.slice(1);
 const title=s=>String(s).replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
 const join=(items,word='and')=>items.length<2?items[0]||'':items.length===2?items[0]+' '+word+' '+items[1]:items.slice(0,-1).join(', ')+' '+word+' '+items.at(-1);
 const subjects={'this-unit':'This unit','this-model':'This model',attacker:'The attacker',defender:'The target','selected-unit':'The selected unit'};
 const stats={A:'Attacks',D:'Damage',M:'Move',T:'Toughness',S:'Strength',W:'Wounds',OC:'Objective Control',Ld:'Leadership',Sv:'Save'};
 const singular={Attacks:'Attack',Wounds:'Wound',Hit:'Hit',Wound:'Wound',Damage:'Damage',Strength:'Strength',Toughness:'Toughness','Objective Control':'Objective Control',Move:'Move',Leadership:'Leadership',Save:'Save'};
 const numeric=x=>typeof x==='number'&&Number.isFinite(x)||typeof x==='string'&&/^(?:\d+|\d*D\d+(?:[+-]\d+)?)$/i.test(x);
 function keyword(x){
  if(!only(x,['keyword_id','parameters'])||typeof x.keyword_id!=='string')return null;
  const p=x.parameters;
  if(!p)return title(x.keyword_id);
  if(only(p,['value'])&&numeric(p.value))return title(x.keyword_id)+' '+p.value;
  if(x.keyword_id==='anti'&&only(p,['target_keyword','threshold'])&&p.target_keyword&&numeric(p.threshold))return 'Anti-'+p.target_keyword+' '+p.threshold+'+';
  return null;
 }
 function weapons(w){
  if(!only(w,['type','name','keyword'])||w.type&&!['melee','ranged'].includes(w.type)||w.name&&typeof w.name!=='string')return null;
  const kw=w.keyword?keyword(w.keyword):'';if(w.keyword&&!kw)return null;
  return [kw,w.type,w.name?title(w.name):'', 'weapons'].filter(Boolean).join(' ');
 }
 function keywords(filter){
  if(!filter||typeof filter!=='object')return null;
  if(only(filter,['all_of'])&&Array.isArray(filter.all_of)&&filter.all_of.length)return join(filter.all_of.map(String));
  if(only(filter,['any_of'])&&Array.isArray(filter.any_of)&&filter.any_of.length)return join(filter.any_of.map(String),'or');
  return null;
 }
 function unitFilter(f){
  if(!only(f,['owner','all_of','any_of','within','visible','state','level'])||f.owner&&!['friendly','enemy','any'].includes(f.owner)||f.level&&!['unit','model'].includes(f.level)||f.all_of&&f.any_of)return null;
  const tags=f.all_of||f.any_of||[];if(!Array.isArray(tags)||tags.some(t=>typeof t!=='string'))return null;
  let noun=(f.owner&&f.owner!=='any'?f.owner+' ':'')+(f.level==='model'?'model':'unit')+(tags.length?' with '+join(tags,f.any_of?'or':'and'):'');const restrictions=[];
  if(f.within){const w=f.within;if(!only(w,['range','of'])||!only(w.range,['inches'])||!numeric(w.range.inches)||!subjects[w.of])return null;restrictions.push('within '+w.range.inches+'″ of '+lower(subjects[w.of]));}
  if(f.visible){if(!only(f.visible,['to'])||!subjects[f.visible.to])return null;restrictions.push('visible to '+lower(subjects[f.visible.to]));}
  if(f.state){const states={'battle-shocked':'Battle-shocked','on-battlefield':'on the battlefield','not-battle-shocked':'not Battle-shocked'};if(!states[f.state])return null;restrictions.push(states[f.state]);}
  return {noun,restrictions};
 }
 function condition(c,depth=0){
  if(depth>12)return null;
  if(only(c,['operator','operands'])&&c.operator==='not'&&Array.isArray(c.operands)&&c.operands.length===1){const inner=condition(c.operands[0],depth+1);return inner?'not ('+inner+')':null;}
  if(only(c,['operator','operands'])&&Array.isArray(c.operands)&&['and','or'].includes(c.operator)){const values=c.operands.map(v=>condition(v,depth+1));return values.length&&values.every(Boolean)?join(values.map(v=>'('+v+')'),c.operator):null;}
  if(!only(c,['type','parameters']))return null;const p=c.parameters;
  if(c.type==='attachment'&&same(p,{role:'leading',subject:'this-model'}))return 'this model is leading a unit';
  if(c.type==='attack-is'&&only(p,['attack_type'])&&['melee','ranged'].includes(p.attack_type))return 'the attack is '+p.attack_type;
  if(c.type==='phase-is'&&only(p,['phase'])&&typeof p.phase==='string')return 'it is the '+title(p.phase)+' phase';
  if(c.type==='player-turn-is'&&only(p,['turn'])&&['your-turn','opponent-turn'].includes(p.turn))return p.turn==='your-turn'?'it is your turn':'it is your opponent’s turn';
  if(c.type==='attack-is'&&same(p,{shooting_type:'snap'}))return 'this is a Snap Shot';
  if(c.type==='attack-compare'&&only(p,['left','comparison','right'])&&same(p.left,{of:'attacker',stat:'S'})&&same(p.right,{of:'defender',stat:'T'})&&['gt','lt','gte','lte'].includes(p.comparison))return 'the attack’s Strength is '+{gt:'greater than',lt:'less than',gte:'at least',lte:'at most'}[p.comparison]+' the target’s Toughness';
  if(c.type==='matches'&&only(p,['subject','filter'])){
   if(p.subject==='defender'){const keys=keywords(p.filter);if(keys)return 'the target is a '+keys+' unit';if(only(p.filter,['none_of'])&&p.filter.none_of?.length)return 'the target has neither '+join(p.filter.none_of,'nor');if(same(p.filter,{visible:{to:'attacker'}}))return 'the attacker can see the target';}
   if(['this-unit','this-model','selected-unit'].includes(p.subject)){
    const keys=keywords(p.filter);if(keys)return lower(subjects[p.subject])+' has '+keys;
    if(only(p.filter,['has_ability'])&&Array.isArray(p.filter.has_ability)&&p.filter.has_ability.length)return lower(subjects[p.subject])+' has '+join(p.filter.has_ability.map(title));
    const f=unitFilter(p.filter);if(f&&f.restrictions.length&&Object.keys(p.filter).every(k=>['state','within','visible'].includes(k)))return lower(subjects[p.subject])+' is '+join(f.restrictions);
   }
  }
  return null;
 }
 function rollAction(node,context={}){
  const names={...subjects,...context};
  const m=node?.modifier;if(node?.type!=='re-roll'||!only(node,['type','target','modifier'])||!names[node.target]||!only(m,['roll','subset','result_scope','count','weapons'])||!['hit','wound','damage','charge','advance','save'].includes(m.roll))return null;
  if(m.subset&&m.subset!=='ones'||m.result_scope&&!['any-result','all-failures'].includes(m.result_scope)||m.count!==undefined&&m.count!==1)return null;
  const w=m.weapons?weapons(m.weapons):'';if(m.weapons&&!w)return null;
  const roll=title(m.roll),scope=m.subset==='ones'?' of 1':'';
  return names[node.target]+' can re-roll '+(m.count===1?'one ':m.result_scope==='any-result'?'any ':m.result_scope==='all-failures'?'failed ':'')+roll+' roll'+(m.count===1?'':'s')+scope+(w?' with '+w:'')+'.';
 }
 function effect(node,depth=0,context={}){
  const names={...subjects,...context};
  if(depth>12||!node||typeof node!=='object')return null;
  if(node.type==='conditional'&&only(node,['type','condition','effect'])){
   const result=effect(node.effect,depth+1,context);if(!result)return null;
   if(same(node.condition,{type:'attachment',parameters:{role:'leading',subject:'this-model'}}))return 'While leading a unit, '+lower(result).replace(/^this unit’s/,'that unit’s') .replace(/^this unit /,'that unit ');
   const p=node.condition?.parameters,target=node.condition?.type==='matches'&&p?.subject==='defender'&&only(p,['subject','filter'])?keywords(p.filter):null;
   if(target)return 'Against '+target+' units, '+lower(result);
   if(node.condition?.operator==='and'&&only(node.condition,['operator','operands'])&&node.condition.operands?.length===2){
    const attack=node.condition.operands.find(c=>c.type==='attack-is'),defender=node.condition.operands.find(c=>c.type==='matches'&&c.parameters?.subject==='defender');
    const attackCondition=attack&&condition(attack),targetKeys=defender&&only(defender,['type','parameters'])&&only(defender.parameters,['subject','filter'])?keywords(defender.parameters.filter):null;
    if(attackCondition&&targetKeys)return 'For '+attack.parameters.attack_type+' attacks against '+targetKeys+' units, '+lower(result);
   }
   if(node.condition?.operator==='and'&&only(node.condition,['operator','operands'])&&node.condition.operands?.length===2){const p=node.condition.operands.find(c=>c.type==='phase-is'),t=node.condition.operands.find(c=>c.type==='player-turn-is');if(p&&t&&condition(p)&&condition(t))return 'During '+(t.parameters.turn==='your-turn'?'your':'your opponent’s')+' '+title(p.parameters.phase)+' phase, '+lower(result);}
   const c=condition(node.condition);return c?'If '+c+', '+lower(result):null;
  }
  if(node.type==='sequence'&&only(node,['type','steps'])&&Array.isArray(node.steps)&&node.steps.length){
   const steps=node.steps,rerolls=steps.map(s=>rollAction(s,context));
   if(steps.length>1&&steps[0]?.modifier?.count!==1&&rerolls.every(Boolean)&&steps.every(s=>s.target===steps[0].target&&same({...s.modifier,roll:''},{...steps[0].modifier,roll:''}))){
    const m=steps[0].modifier,rolls=join(steps.map(s=>title(s.modifier.roll))),w=m.weapons?weapons(m.weapons):'';
    return names[steps[0].target]+' can re-roll '+(m.count===1?'one ':m.result_scope==='any-result'?'any ':m.result_scope==='all-failures'?'failed ':'')+rolls+' rolls'+(m.subset==='ones'?' of 1':'')+(w?' with '+w:'')+'.';
   }
   const results=steps.map(s=>effect(s,depth+1,context));return results.every(Boolean)?results.join('\n'):null;
  }
  if(node.type==='select-units'&&only(node,['type','selector','effect'])&&only(node.selector,['filter','count','eligibility'])){
   const sel=node.selector,f=unitFilter(sel.filter);if(!f)return null;
   const count=sel.count===1?'one':same(sel.count,{min:1,max:1})?'one':null;if(!count)return null;
   const eligibility=sel.eligibility?condition(sel.eligibility):'';if(sel.eligibility&&!eligibility)return null;
   const result=effect(node.effect,depth+1,{...context,'selected-unit':'The selected unit'});if(!result)return null;
   return 'Choose '+count+' '+f.noun+(f.restrictions.length?' '+join(f.restrictions):'')+'.'+(eligibility?' It must meet this condition: '+eligibility+'.':'')+' '+result;
  }
  if(node.type==='choice'&&only(node,['type','options'])&&Array.isArray(node.options)&&node.options.length){const values=node.options.map(o=>effect(o,depth+1,context));if(!values.every(Boolean))return null;return 'Choose one:\n'+values.map(v=>'• '+v).join('\n');}
  const reroll=rollAction(node,context);if(reroll)return reroll;
  if(!only(node,['type','target','modifier'])||!names[node.target])return null;
  const subject=names[node.target],possessive=subject+'’s',m=node.modifier;
  if(node.type==='state-change'&&only(m,['state','set'])&&m.state==='battle-shocked'&&typeof m.set==='boolean')return subject+(m.set?' becomes Battle-shocked.':' is no longer Battle-shocked.');
  if(node.type==='stat-modifier'&&only(m,['stat','operation','value','weapons'])&&stats[m.stat]&&numeric(m.value)){
   const w=m.weapons?weapons(m.weapons):'';if(m.weapons&&!w)return null;const target=w?possessive+' '+w:possessive+' '+stats[m.stat];
   if(['add','increase'].includes(m.operation))return w?target+' gain '+m.value+' '+(Number(m.value)===1?singular[stats[m.stat]]||stats[m.stat]:stats[m.stat])+'.':'Add '+m.value+' to '+lower(target)+'.';
   if(['subtract','decrease'].includes(m.operation))return 'Subtract '+m.value+' from '+lower(target)+(w?' '+stats[m.stat]:'')+'.';
   if(m.operation==='improve')return 'Improve '+lower(target)+(w?' '+stats[m.stat]:'')+' by '+m.value+'.';
   if(['set','set-to'].includes(m.operation))return 'Set '+lower(target)+(w?' '+stats[m.stat]:'')+' to '+m.value+'.';
  }
  if(node.type==='roll-modifier'&&only(m,['roll','operation','value'])&&numeric(m.value)&&typeof m.roll==='string'){
   if(m.operation==='add')return 'Add '+m.value+' to '+lower(possessive)+' '+title(m.roll)+' rolls.';if(m.operation==='subtract')return 'Subtract '+m.value+' from '+lower(possessive)+' '+title(m.roll)+' rolls.';
  }
  if(node.type==='weapon-ability-grant'&&only(m,['keywords','weapons'])&&m.keywords?.length){const keys=m.keywords.map(keyword),w=m.weapons?weapons(m.weapons):'weapons';return keys.every(Boolean)&&w?possessive+' '+w+' gain '+join(keys)+'.':null;}
  if(node.type==='ability-grant'&&only(m,['ability'])&&typeof m.ability==='string')return subject+' gains '+title(m.ability)+'.';
  if(node.type==='feel-no-pain'&&only(m,['threshold','value','against'])&&!(m.threshold!==undefined&&m.value!==undefined)&&numeric(m.threshold??m.value)&&(!m.against||['mortal','psychic'].includes(m.against)))return subject+' has Feel No Pain '+(m.threshold??m.value)+'+'+(m.against?' against '+(m.against==='mortal'?'mortal wounds':'Psychic attacks'):'')+'.';
  if(node.type==='mortal-wounds'&&only(m,['count'])&&numeric(m.count))return subject+' suffers '+m.count+' mortal wounds.';
  if(node.type==='heal'&&only(m,['amount','per'])&&numeric(m.amount)&&(!m.per||m.per==='one-model'))return (m.per==='one-model'?'One model in '+lower(subject):subject)+' regains '+m.amount+' lost wounds.';
  if(node.type==='set-up'&&only(m,['to','from'])&&m.to==='strategic-reserves'&&(!m.from||m.from==='battlefield'))return (m.from?'Remove '+lower(subject)+' from the battlefield and place it':'Place '+lower(subject))+' into Strategic Reserves.';
  if(node.type==='move'&&only(m,['move_type','distance'])&&m.move_type==='normal'&&numeric(m.distance))return subject+' can make a '+m.distance+'″ Normal move.';
  if(node.type==='roll-result'&&only(m,['roll','critical_on'])&&m.roll==='hit'&&numeric(m.critical_on))return subject+' scores Critical Hits on '+m.critical_on+'+.';
  if(node.type==='roll-result'&&only(m,['roll','succeeds_on'])&&m.roll==='hit'&&numeric(m.succeeds_on))return subject+' scores hits on '+m.succeeds_on+'+.';
  if(node.type==='permission'&&only(m,['activity','allow','after','despite'])&&typeof m.allow==='boolean'){
   const activity={shoot:'shoot','declare-charge':'declare a charge',move:'move'},after={advance:'advancing','fall-back':'falling back','disembarked-this-turn':'disembarking this turn'};
   if(!activity[m.activity]||m.after&&!after[m.after])return null;const despite=m.despite===undefined?[]:Array.isArray(m.despite)?m.despite:[m.despite];if(!despite.every(d=>after[d]))return null;
   return subject+(m.allow?' can ':' cannot ')+activity[m.activity]+(m.after?' after '+after[m.after]:'')+(despite.length?' even after '+join(despite.map(d=>after[d]),'or'):'')+'.';
  }
  if(node.type==='cost-modifier'&&only(m,['of','operation','amount','applies_to'])&&m.of==='stratagem'&&m.operation==='decrease'&&numeric(m.amount)&&(!m.applies_to||m.applies_to==='the-triggering-use'))return 'A Stratagem targeting '+lower(subject)+' costs '+m.amount+' CP less.';
  return null;
 }
 function hallowed(record){
  const e=record.effect;if(e?.type!=='named-region-state')return null;
  const ref={region_id:'hallowed-ground',owner_faction:'grey-knights'},match=(subject,filter)=>({type:'matches',parameters:{subject,filter}}),attack=attack_type=>({type:'attack-is',parameters:{attack_type}});
  const range=e.modifier?.producer?.additive_extensions?.[0]?.range?.inches;if(!numeric(range))return null;
  const extension=territory=>({region:{territory},trigger:{event:'phase-started'},duration:'phase',condition:{type:'controls',parameters:{by:'friendly',objective:{territory},proportion:{fraction:0.5,comparison:'gte'}}},evaluation:'snapshot-once'});
  const part=(modifier,optional)=>({effect:{type:'ability-part',effect:{type:'re-roll',target:'attacker',modifier:{roll:'hit',...modifier}},optional}});
  const expected={type:'named-region-state',target:{owner:'friendly'},modifier:{region_ref:ref,branch_precedence:'qualified-replaces-default',producer:{mode:'complete',baseline:[{region:{territory:'your-deployment-zone'},duration:'permanent'}],parent_ref:null,region_ref:ref,phase_extensions:['no-mans-land','enemy-deployment-zone'].map(extension),additive_extensions:[{kind:'unit-proximity',range:{inches:range},filter:{owner:'friendly',all_of:['PURIFIER SQUAD']}}]},consumer:{state_ref:ref,membership:{relation:'wholly-within',unit_scope:'whole-unit'},default_branch:part({subset:'ones'},false),qualified_branch:part({result_scope:'any-result'},true),beneficiary_filter:{owner:'friendly',all_of:['GREY KNIGHTS']},attack_condition:{operator:'or',operands:[attack('melee'),{operator:'and',operands:[attack('ranged'),match('defender',{visible:{to:'attacker'}})]}]},qualified_condition:{operator:'or',operands:[match('this-unit',{all_of:['PURIFIER SQUAD']}),{type:'in-region',parameters:{models:'every',region:{rule_region:ref},wholly:true}}]}}}};
  if(!same(e,expected))return null;
  return 'Friendly GREY KNIGHTS re-roll Hit rolls of 1. PURIFIER SQUAD units, and units wholly within Hallowed Ground, can re-roll any Hit rolls instead. This applies to melee attacks and ranged attacks against targets the attacker can see.\n\nHallowed Ground includes:\n• Your deployment zone.\n• Within '+range+'″ of friendly PURIFIER SQUAD units.\n• No Man’s Land and/or the enemy deployment zone if you control at least half the objectives in that territory at the start of the phase. Check each territory separately; it counts for that phase.';
 }
 function usage(u){
  if(!u)return '';if(!only(u,['frequency','count','per']))return null;
  const freq={'once-per-battle':'Once per battle','once-per-turn':'Once per turn','once-per-battle-round':'Once per battle round','n-per-battle':u.count===1?'Once per battle':numeric(u.count)?u.count+' times per battle':null};
  if(!freq[u.frequency]||u.count!==undefined&&u.frequency!=='n-per-battle')return null;
  const per={army:'for your army',unit:'for this unit',model:'for this model'};if(u.per&&!per[u.per])return null;return freq[u.frequency]+(u.per?' '+per[u.per]:'')+'.';
 }
 function trigger(t){
  if(!t)return '';if(!only(t,['event','filter','subject','object','optional','condition']))return null;
  const subject=typeof t.subject==='string'?subjects[t.subject]:t.subject?unitFilter(t.subject):null;
  const object=typeof t.object==='string'?subjects[t.object]:t.object?unitFilter(t.object):null;
  if(t.subject&&!subject||t.object&&!object)return null;
  const phrase=x=>typeof x==='string'?lower(x):x?'a '+x.noun+(x.restrictions.length?' '+join(x.restrictions):''):'this unit';
  let text=null;
  if(['phase-started','phase-ended','round-started','round-ended','turn-ended','turn-started'].includes(t.event)&&!t.filter&&!t.subject&&!t.object)text={'phase-started':'At the start of the phase','phase-ended':'At the end of the phase','round-started':'At the start of the battle round','round-ended':'At the end of the battle round','turn-ended':'At the end of the turn','turn-started':'At the start of the turn'}[t.event];
  if(t.event==='selected'&&only(t.filter,['to'])&&['shoot','fight','move'].includes(t.filter.to)&&!t.object)text='When '+phrase(subject)+' is selected to '+t.filter.to;
  if(t.event==='targets-selected'&&same(t.filter,{kind:'attack'})&&object)text='When '+phrase(subject)+' selects '+phrase(object)+' as an attack target';
  if(t.event==='damage-allocated'&&!t.filter&&!t.subject&&object)text='When damage is allocated to '+phrase(object);
  if(t.event==='move-ended'&&only(t.filter,['move_types'])&&!t.object&&Array.isArray(t.filter.move_types)){const names={normal:'a Normal move',advance:'an Advance','fall-back':'a Fall Back move',charge:'a Charge move'};if(t.filter.move_types.every(n=>names[n]))text='After '+phrase(subject)+' finishes '+join(t.filter.move_types.map(n=>names[n]),'or');}
  if(t.event==='attacks-resolved'&&only(t.filter,['kind'])&&['shoot','fight'].includes(t.filter.kind)&&!t.object)text='After '+phrase(subject)+(t.filter.kind==='shoot'?' shoots':' fights');
  if(text&&t.condition){const c=condition(t.condition);if(!c)return null;text+=', if '+c;}
  return text?text+'.':null;
 }
 function strategist(record){
  const m=record.effect?.effect?.modifier;if(!numeric(m?.amount))return null;
  const expected={type:'conditional',condition:{type:'matches',parameters:{filter:{owner:'friendly'}}},effect:{type:'cost-modifier',target:'this-unit',modifier:{of:'stratagem',operation:'decrease',amount:m.amount,applies_to:'the-triggering-use'}}};
  if(!same(record.effect,expected)||!same(record.trigger,{event:'used',filter:{kind:'stratagem'},object:'this-unit',optional:true})||!same(record.usage,{frequency:'once-per-battle-round',per:'army'}))return null;
  return 'Once per battle round for your army, one of your Stratagems targeting this unit costs '+m.amount+' CP less.';
 }
 function summarize(record){
  if(!record||typeof record!=='object'||!record.effect)return null;
  const note=notes?.summarize(record);if(note)return note;
  const namedGround=hallowed(record),discount=strategist(record),special=namedGround||discount;
  const contexts=record.trigger?.event==='selected'?{'event-subject':'The selected unit'}:record.trigger?.event==='targets-selected'?{'event-subject':'The attacking unit'}:record.trigger?.event==='move-ended'?{'event-subject':'The unit that moved'}:{};
  let text=special||effect(record.effect,0,contexts);if(!text)return null;
  const u=usage(record.usage);if(u===null)return null;
  const allowed=new Set(['ability_id','id','name','authored_by','game_version','source_digest','version','unit_ids','ability_type','behavior','faction_id','detachment_id','supersedes','community_notes','stub','trigger','condition','optional','effect','scope','usage','keyword_restrictions','datasheet_restriction_groups','upgrade_tag','player_turn']);
  if(Object.entries(record).some(([k,v])=>!allowed.has(k)&&v!=null))return null;
  let when=trigger(record.trigger);
  // A trigger's explicit subject/filter must not disappear from a short summary.
  if(!special&&when===null)return null;
  if(namedGround&&record.trigger)return null;
  if(discount)when='';
  if(record.condition){const c=condition(record.condition);if(!c)return null;text='If '+c+', '+lower(text);}
  const duration=record.scope?.duration;
  if(record.scope&&!only(record.scope,['duration']))return null;
  const durations={permanent:'',resolution:'',phase:'Lasts for this phase.',turn:'Lasts for this turn.','battle-round':'Lasts for this battle round.',battle:'Lasts for the battle.'};
  if(duration&&!Object.hasOwn(durations,duration))return null;
  if(record.optional===true&&!/\b(can|may)\b/i.test(text))text='You may use this effect: '+lower(text);
  return [when,text,discount?'':u,durations[duration]||''].filter(Boolean).join('\n');
 }
 const api={summarize,reviewIssue:record=>notes?.reviewIssue(record)};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerRuleSummaries=api;
})(typeof window!=='undefined'?window:globalThis);
