/* Readable views of imported mechanics, never a claim of official or complete wording. */
(function(root){
 'use strict';
 const S=typeof module!=='undefined'&&module.exports?require('./rule-summaries.js'):root.WarPlannerRuleSummaries;
 const words={stub:'Source marked incomplete',A:'Attacks',D:'Damage',M:'Move',T:'Toughness',S:'Strength',W:'Wounds',OC:'Objective Control',Ld:'Leadership',Sv:'Save','this-unit':'This unit','this-model':'This model','selected-unit':'Selected unit','event-subject':'Event subject','event-object':'Event object','any-result':'Any result','all-failures':'Failed results',ones:'Results of 1','once-per-battle':'Once per battle','once-per-turn':'Once per turn','once-per-battle-round':'Once per battle round',gte:'At least',lte:'At most',gt:'Greater than',lt:'Less than',eq:'Equal to','phase-started':'Phase starts','phase-ended':'Phase ends','move-ended':'Move ends','move-started':'Move starts','attacks-resolved':'Attacks finish','targets-selected':'Targets are selected','round-started':'Battle round starts','round-ended':'Battle round ends','turn-ended':'Turn ends','turn-started':'Turn starts','damage-allocated':'Damage is allocated','model-destroyed':'A model is destroyed','set-up':'Set up',disembarked:'Disembarkation',used:'Use of a rule',selected:'Selection for an action'};
 const label=s=>words[s]||String(s).replace(/[_-]/g,' ').replace(/^./,c=>c.toUpperCase());
 const scalar=x=>typeof x==='string'?words[x]||(/^[\w-]+$/.test(x)?label(x):x):x===true?'Yes':x===false?'No':x==null?'Not specified':String(x);
 const known=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>keys.includes(k));
 const indent=s=>String(s).split('\n').map(line=>'  '+line).join('\n');
 function value(x,depth=0){
  if(depth>24)return 'Further nested details remain in the imported source record.';
  if(Array.isArray(x))return x.map(v=>value(v,depth+1)).join('; ');
  if(!x||typeof x!=='object')return scalar(x);
  if(x.operator&&Array.isArray(x.operands)&&known(x,['operator','operands']))return x.operator==='not'?'NOT ('+x.operands.map(v=>value(v,depth+1)).join('; ')+')':x.operands.map(v=>'('+value(v,depth+1)+')').join(' '+String(x.operator).toUpperCase()+' ');
  if(x.type==='phase-is'&&known(x,['type','parameters'])&&known(x.parameters,['phase']))return 'Phase is '+scalar(x.parameters.phase);
  if(x.type==='player-turn-is'&&known(x,['type','parameters'])&&known(x.parameters,['turn']))return 'Turn is '+scalar(x.parameters.turn);
  if(x.type==='attack-is'&&known(x,['type','parameters'])&&known(x.parameters,['attack_type']))return 'Attack type is '+scalar(x.parameters.attack_type);
  if(x.type==='matches'&&known(x,['type','parameters'])&&known(x.parameters,['subject','filter']))return value(x.parameters.subject||'subject (see trigger)',depth+1)+' matches '+filter(x.parameters.filter,depth+1);
  return Object.entries(x).map(([k,v])=>label(k)+': '+value(v,depth+1)).join('; ');
 }
 function filter(x,depth=0){
  if(!x||typeof x!=='object'||Array.isArray(x))return value(x,depth+1);
  return Object.entries(x).map(([k,v])=>{
   if(['all_of','any_of','none_of'].includes(k))return label(k)+': '+value(v,depth+1);
   if(k==='within'&&known(v,['range','of'])&&known(v.range,['inches'])&&v.range.inches!==undefined)return 'within '+value(v.range.inches)+' inches of '+value(v.of,depth+1);
   if(k==='visible'&&known(v,['to']))return 'visible to '+value(v.to,depth+1);
   return label(k)+': '+value(v,depth+1);
  }).join('; ');
 }
 function tree(node,depth=0){
  if(depth>24)return 'Further nested details remain in the imported source record.';
  if(Array.isArray(node))return node.map((n,i)=>(i+1)+'. '+tree(n,depth+1)).join('\n');
  if(!node||typeof node!=='object')return value(node,depth+1);
  return Object.entries(node).sort(([a],[b])=>(a==='type'?-1:b==='type'?1:0)).map(([key,v])=>{
   if(key==='type')return label(v);
   if(['effect','on_success','on_failure'].includes(key)&&v&&typeof v==='object')return label(key)+':\n'+indent(effect(v,depth+1));
   if(v&&typeof v==='object'&&!Array.isArray(v))return label(key)+':\n'+indent(tree(v,depth+1));
   if(Array.isArray(v)&&v.some(x=>x&&typeof x==='object'))return label(key)+':\n'+indent(tree(v,depth+1));
   return label(key)+': '+value(v,depth+1);
  }).join('\n');
 }
 function weapons(x){if(known(x,['type','name','keyword']))return (x.type?value(x.type)+' ':'')+'weapons'+(x.name?' named '+value(x.name):'')+(x.keyword?' with '+value(x.keyword):'');return 'weapons matching '+filter(x);}
 function effect(node,depth=0){
  if(depth>24)return tree(node,depth);
  if(!node||typeof node!=='object')return tree(node,depth);
  const type=node.type,m=node.modifier,target=node.target===undefined?'':value(node.target)+': ';
  if(type==='sequence'&&known(node,['type','steps'])&&Array.isArray(node.steps))return node.steps.map((step,i)=>(i+1)+'. '+effect(step,depth+1)).join('\n');
  if(type==='conditional'&&known(node,['type','condition','effect'])&&node.condition&&node.effect)return 'If '+value(node.condition,depth+1)+':\n'+indent(effect(node.effect,depth+1));
  if(type==='no-effect'&&known(node,['type']))return 'No effect.';
  if(known(node,['type','target','modifier'])&&m&&typeof m==='object'){
   if(type==='re-roll'&&known(m,['roll','subset','result_scope','count','weapons'])&&m.roll){
    return target+'Re-roll '+(m.count!==undefined?value(m.count)+' ':'')+value(m.roll)+' rolls'+(m.subset||m.result_scope?' ('+[m.subset,m.result_scope].filter(v=>v!==undefined).map(v=>value(v)).join('; ')+')':'')+(m.weapons?' using '+weapons(m.weapons):'')+'.';
   }
   if(['stat-modifier','roll-modifier'].includes(type)&&known(m,['stat','roll','operation','value','weapons'])&&m.operation&&m.value!==undefined&&(m.stat||m.roll)&&!(m.stat&&m.roll)){
    const characteristic=value(m.stat||m.roll)+(m.roll?' rolls':' characteristic'),suffix=m.weapons?' for '+weapons(m.weapons):'';if(['add','increase'].includes(m.operation))return target+label(m.operation)+' '+value(m.value)+' to '+characteristic+suffix+'.';if(['subtract','decrease'].includes(m.operation))return target+label(m.operation)+' '+value(m.value)+' from '+characteristic+suffix+'.';if(['set','set-to'].includes(m.operation))return target+'Set '+characteristic+' to '+value(m.value)+suffix+'.';if(m.operation==='improve')return target+'Improve '+characteristic+' by '+value(m.value)+suffix+'.';
   }
   if(type==='cost-modifier'&&known(m,['of','operation','amount','applies_to'])&&['decrease','increase','add','subtract'].includes(m.operation)&&m.of==='stratagem'&&m.amount!==undefined)return target+label(m.operation)+' '+value(m.of)+' cost by '+value(m.amount)+' CP'+(m.applies_to?' ('+value(m.applies_to)+')':'')+'.';
   if(type==='permission'&&known(m,['activity','allow','after','despite'])&&typeof m.allow==='boolean'&&m.activity)return target+(m.allow?'May ':'Cannot ')+String(scalar(m.activity)).toLowerCase()+(m.after?' after '+value(m.after):'')+(m.despite?' despite '+value(m.despite):'')+'.';
   if(type==='ability-grant'&&known(m,['ability'])&&m.ability)return target+'Gains '+value(m.ability)+'.';
   if(type==='weapon-ability-grant'&&known(m,['keywords','weapons'])&&Array.isArray(m.keywords))return target+(m.weapons?weapons(m.weapons):'Specified weapons')+' gain '+m.keywords.map(k=>known(k,['keyword_id','parameters'])?value(k.keyword_id)+(k.parameters?' ('+value(k.parameters)+')':''):value(k)).join('; ')+'.';
   if(type==='feel-no-pain'&&known(m,['threshold','value','against'])&&(m.threshold!==undefined||m.value!==undefined)&&!(m.threshold!==undefined&&m.value!==undefined))return target+'Feel No Pain '+value(m.threshold??m.value)+'+'+(m.against?' against '+(m.against==='mortal'?'mortal wounds':value(m.against)):'')+'.';
   if(type==='heal'&&known(m,['amount','per'])&&m.amount!==undefined)return target+'Restore '+value(m.amount)+' lost wounds'+(m.per?' per '+value(m.per):'')+'.';
   if(type==='mortal-wounds'&&known(m,['count'])&&m.count!==undefined)return target+'Inflict '+value(m.count)+' mortal wounds.';
  }
  // Unknown structures remain fully labeled, with no unsupported effect omitted.
  return tree(node,depth+1);
 }
 function sourceBreakdown(record){
  if(!record||typeof record!=='object'||!record.effect)return {text:'The imported source does not include readable rule text or effect mechanics for this entry.',missing:true};
  const missing=record.effect.type==='no-effect'&&known(record.effect,['type']);
  const sections=[];
  if(record.trigger)sections.push('Trigger:\n'+indent(tree(record.trigger)));
  if(record.condition)sections.push('Condition: '+value(record.condition));
  if(record.optional!==undefined)sections.push('Optional: '+value(record.optional));
  sections.push(missing?'The imported source contains no effect mechanics for this ability. Check another source for its actual rule.':effect(record.effect));
  if(record.usage)sections.push('Usage limit:\n'+indent(tree(record.usage)));
  if(record.scope)sections.push('Scope / duration:\n'+indent(tree(record.scope)));
  const metadata=new Set(['ability_id','id','name','authored_by','game_version','source_digest','version','unit_ids','ability_type','behavior','faction_id','detachment_id','trigger','condition','optional','effect','scope','usage']);
  for(const [key,v] of Object.entries(record))if(!metadata.has(key)&&v!==undefined)sections.push(label(key)+':\n'+indent(tree(v)));
  return {text:sections.join('\n\n'),missing};
 }
 function describe(record){
  const detailed=sourceBreakdown(record),short=S.summarize(record);
  const text=detailed.missing?'The source has no effect mechanics for this rule. Check its full wording.':short||S.reviewIssue?.(record)||'This rule needs a checked summary. Its imported details are under Conditions & sources.';
  return {text,details:detailed.text,missing:detailed.missing,concise:!!short};
 }
 function isPlaceholder(summary){return !String(summary||'').trim()||/^Imported structured mechanics for [\s\S]+\. Review the imported source details before writing a study summary\.$/.test(summary)||/^Reference reminder: check [\s\S]+ in your current rules\. The source does not support a complete study summary yet\.$/.test(summary)||summary==='No complete mechanics record is available. Open the current rules reference.'||summary==='This rule needs a checked summary. Its imported details are under Conditions & sources.'||summary==='The source has no effect mechanics for this rule. Check its full wording.';}
 function enrich(data){
  if(!data?.importSource)return data;
  if(!isPlaceholder(data.summary)&&data.summary!==sourceBreakdown(data.importSource.record).text)return data;
  const text=data.importSource.text;
  if(typeof text==='string'&&text.trim())return {...data,summary:text.trim(),mechanicsPresentation:'source-text'};
  const result=describe(data.importSource.record);
  return {...data,summary:result.text,mechanicsDetails:result.details,mechanicsPresentation:result.missing?'missing':result.concise?'structured':'needs-summary'};
 }
 function summaryState(data){
  const view=enrich(data);
  if(view?.mechanicsPresentation==='missing')return 'missing';
  if(view?.mechanicsPresentation==='needs-summary'||!String(view?.summary||'').trim())return 'needs-summary';
  return 'available';
 }
 const api={describe,enrich,isPlaceholder,summaryState};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerMechanics=api;
})(typeof window!=='undefined'?window:globalThis);
