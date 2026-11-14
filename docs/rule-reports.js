/* Report proposals are untrusted until an administrator approves a concrete catalog edit. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports,C=node?require('./content.js'):root.WarPlannerContent,M=node?require('./mechanics.js'):root.WarPlannerMechanics;
 const copy=x=>structuredClone(x),norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const types={summary:'Rules Summary',timing:'Timing',targets:'Targets',other:'Something else',missing:'Something is missing'};
 const windows={round:'Start of battle round','turn-start':'Start of turn',start:'Start of phase','core-cp':'Gain Command Points',shock:'Battle-shock',act:'During the phase',select:'When selected',before:'Before the unit acts',after:'After the unit acts',react:'Reaction to an event',arrivals:'Reinforcements / arrivals',end:'End of phase','turn-end':'End of turn','round-end':'End of battle round',prebattle:'Pre-battle / reference'};
 function pageContext(state,active,deck,records){
  const options=new Map(),names=new Set(),faction=records.find(r=>r.kind==='faction'&&(norm(r.name)===norm(state.army.faction)||(r.data.aliases||[]).some(a=>norm(a)===norm(state.army.faction))))?.name||state.army.faction;
  const add=(row,group,observed={})=>{if(row&&!options.has(row.key))options.set(row.key,{key:row.key,name:row.name,kind:row.kind,group,revision:row.revision,observed:{name:row.name,...observed},timing:{phase:row.data.phase||[state.phase],turn:row.data.turn||state.turn,window:C.windows.includes(row.data.window)?row.data.window:active.window||'act'}});};
  const rule=a=>{const row=records.find(r=>r.kind==='rule'&&r.data.id===a.id)||records.find(r=>r.kind==='rule'&&a.sourceRuleId&&r.data.sourceRuleId===a.sourceRuleId);add(row,'Abilities',{summary:a.summary,targets:a.targetText||'',phase:a.phase,turn:a.turn,window:a.window});};
  const unit=u=>{for(const m of u.members||[u.body])if(m?.name){names.add(m.name);add(records.find(r=>r.kind==='unit'&&norm(r.name)===norm(m.name)&&norm(r.faction)===norm(faction)),'Units');}};
  for(const card of deck.unitCards||[]){unit(card.unit);for(const a of card.items)rule(a);if(card.fightsFirst){const first=records.find(r=>r.key==='rule:fights-first');if(first)rule(first.data);}}
  for(const a of deck.shared||[]){rule(a);for(const u of a.appliesTo||[])unit(u);}
  add(records.find(r=>r.key==='step:'+active.id),'Core sequence',{summary:active.body,window:active.window});
  return {context:{faction,phase:state.phase,turn:state.turn,window:active.window||'act',stepId:active.id,stepTitle:active.title,unitNames:[...names].sort(),detachments:Array.isArray(state.army.detachments)?state.army.detachments:[state.army.detachment].filter(Boolean)},options:[...options.values()].sort((a,b)=>a.group.localeCompare(b.group)||a.name.localeCompare(b.name))};
 }
 function practiceContext(question,records,key=question.id){
  const options=[],snapshot=question.review||{},unit=snapshot.units?.[0],rule=snapshot.rule;
  function add(row,observed){if(!row||options.some(o=>o.key===row.key))return;options.push({key:row.key,name:row.name,kind:row.kind,group:row.kind==='unit'?'Units':'Abilities',revision:row.revision,observed:{name:row.name,...observed},timing:{phase:row.data.phase||[],turn:row.data.turn||'either',window:C.windows.includes(row.data.window)?row.data.window:'prebattle'}});}
  const matchingRules=records.filter(r=>r.kind==='rule'&&norm(r.faction)===norm(question.faction));
  const ruleRow=rule?matchingRules.find(r=>r.data.id===rule.id)||matchingRules.find(r=>rule.sourceRuleId&&(r.data.sourceRuleId===rule.sourceRuleId||r.data.id===rule.sourceRuleId)):null;
  const matchingUnits=records.filter(r=>r.kind==='unit'&&norm(r.faction)===norm(question.faction));
  const findUnit=u=>matchingUnits.find(r=>r.data.id===u.id)||matchingUnits.find(r=>norm(r.name)===norm(u.name));
  const unitRow=unit?findUnit(unit):null;
  if(ruleRow)add(ruleRow,{summary:rule.summary,targets:rule.targetText||'',phase:rule.phase,turn:rule.turn,window:rule.window});
  if(unitRow)add(unitRow,question.mode==='stats'?{summary:question.explanation.summary,profile:Object.fromEntries(['name','M','T','Sv','W','Ld','OC','invuln_sv'].filter(key=>snapshot.profile[key]!==undefined).map(key=>[key,copy(snapshot.profile[key])])),stat:snapshot.stat,answer:question.correct}:{summary:question.explanation.summary,ability:rule?.name||''});
  for(const related of snapshot.units||[])if(related!==unit)add(findUnit(related),{summary:question.explanation.summary,ability:rule?.name||''});
  const preferred=['stats','units'].includes(question.mode)?unitRow:ruleRow;
  const currentRule=ruleRow?M.enrich(ruleRow.data):null,snapshotChanged=!!currentRule&&['summary','targetText','phase','turn','window','units','conditions'].some(key=>rule[key]!==undefined&&JSON.stringify(rule[key])!==JSON.stringify(currentRule[key]));
  return {title:'Are we wrong?',defaultKey:preferred?.key||options[0]?.key||'',defaultIssue:(preferred||options[0])?.kind==='unit'?'other':'summary',context:{origin:'practice',snapshotChanged,faction:question.faction,stepId:'practice:'+key,stepTitle:'Practice — '+question.prompt,questionId:question.id,questionType:question.mode,correctAnswer:question.options.find(o=>o.id===question.correct)?.label||'',ability:rule?.name||''},options:options.sort((a,b)=>a.group.localeCompare(b.group)||a.name.localeCompare(b.name))};
 }
 function validateSubmission(payload){
  if(!payload||!Object.hasOwn(types,payload.issue_type)||typeof payload.change_text!=='string'||!payload.change_text.trim()||payload.change_text.length>5000)throw Error('Describe what should change (up to 5000 characters).');
  if(payload.issue_type==='missing'){if(typeof payload.missing_name!=='string'||!payload.missing_name.trim()||payload.missing_name.length>180)throw Error('Enter the missing rule name (up to 180 characters).');}
  else if(!payload.entity_key||!Number.isInteger(payload.base_revision)||payload.base_revision<1)throw Error('Select a displayed rule or unit.');
  if(payload.issue_type==='timing'){const t=payload.timing;if(!t||!C.windows.includes(t.window)||!['you','opponent','either'].includes(t.turn)||!Array.isArray(t.phase)||t.phase.length>5||t.phase.some(p=>!Number.isInteger(p)||p<0||p>4))throw Error('Choose valid timing options.');}
  return payload;
 }
 function proposal(report,records){
  validateSubmission(report);
  let row=report.entity_key?records.find(r=>r.key===report.entity_key):null;
  if(report.entity_key&&!row)throw Error('The reported entry is no longer in the catalog.');
  if(!row){const id='reported-'+report.id;row={key:'rule:'+id,kind:'rule',name:report.missing_name,faction:report.faction,enabled:true,revision:0,data:{id,name:report.missing_name,category:'ability',units:[],phase:[],turn:report.context?.turn||'either',window:'act',summary:report.change_text,conditions:[],sourceIds:['admin'],status:'admin-reviewed',referenceOnly:true,expanded:true,adminManaged:true}};}
  else{
   row=copy(row);
   // Keep generated study text when a timing/target proposal changes a legacy placeholder.
   if(row.kind==='rule')row.data=M.enrich(row.data);
   if(report.issue_type==='summary'&&['rule','step'].includes(row.kind))row.data[row.kind==='step'?'body':'summary']=report.change_text;
   if(report.issue_type==='targets'&&row.kind==='rule')row.data.targetText=report.change_text;
   if(report.issue_type==='timing'&&row.kind==='rule')Object.assign(row.data,{window:report.timing.window,phase:copy(report.timing.phase),turn:report.timing.turn});
  }
  if(['rule','step'].includes(row.kind)){row.data.status='admin-reviewed';row.data.sourceIds=[...new Set([...(row.data.sourceIds||[]),'admin'])];}
  if(row.kind==='rule')row.data.adminManaged=true;
  C.validate(row);return row;
 }
 function directReviewReason(report,records){
  if(report.status!=='pending')return 'Already reviewed.';
  if(report.context?.snapshotChanged)return 'The catalog changed since this quiz question. Use Edit to compare the current rule.';
  try{validateSubmission(report);}catch(error){return 'Invalid report: '+error.message;}
  if(report.issue_type==='missing')return 'Use Edit to choose the new rule’s units, detachment and timing.';
  const current=records.find(r=>r.key===report.entity_key);if(!current)return 'The entry is no longer available.';
  if(current.revision!==report.base_revision)return 'This entry changed since the report. Use Edit to review the latest revision.';
  if(report.issue_type==='other'||current.kind==='unit'||current.kind==='step'&&report.issue_type!=='summary')return 'Use Edit to choose the exact fields to change.';
  return '';
 }
 const api={types,windows,pageContext,practiceContext,validateSubmission,proposal,directReviewReason};if(node)module.exports=api;else root.WarPlannerRuleReports=api;
})(typeof window!=='undefined'?window:globalThis);
