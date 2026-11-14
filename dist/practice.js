/* Multiple-choice recall from the current catalog. No invented stats or rule text. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports,P=node?require('./unit-profiles.js'):root.WarPlannerUnitProfiles,M=node?require('./mechanics.js'):root.WarPlannerMechanics;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),text=s=>String(s||'').trim(),copy=x=>structuredClone(x);
 const modes={mixed:'Mixed practice',rules:'Match the rule',stats:'Unit stats',abilities:'Unit abilities'};
 const categories={ability:'Ability',army:'Army / Detachment',core:'Core Rule',stratagem:'Stratagem',enhancement:'Enhancement'};
 function shuffle(items,random=Math.random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
 function usable(rule){return !!text(rule.name)&&Object.hasOwn(categories,rule.category)&&!!text(rule.summary)&&(!M||M.summaryState(rule)==='available')&&!/needs a checked summary|no complete mechanics|no effect mechanics|check its full wording|source does not support a complete/i.test(rule.summary);}
 function format(value,key){return key==='M'?value+'″':['Sv','Ld','invuln_sv'].includes(key)?value+'+':String(value);}
 function known(value,key){return typeof value==='number'&&Number.isInteger(value)&&value>=(['Sv','Ld','invuln_sv'].includes(key)?1:0)&&value<=999||typeof value==='string'&&/^\d*D\d+(?:[+-]\d+)?$/.test(value);}
 function hideName(summary,name){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return summary.replace(new RegExp('(^|[^a-z0-9])'+escaped+'(?=$|[^a-z0-9])','gi'),(_match,prefix)=>prefix+'this rule');}
 function buildBank({rules=[],units=[],faction,random=Math.random}={}){
  const matches=r=>r.enabled!==false&&!!norm(faction)&&!!norm(r.faction)&&norm(r.faction)===norm(faction);
  // A repeated name within a detachment represents one possible answer.
  const unique=new Map();
  for(const r of rules.filter(matches).map(r=>({...(M?M.enrich(r):r),faction:r.faction})).filter(usable)){const key=[r.category,norm(r.name),norm(r.detachment)].join(':');if(!unique.has(key))unique.set(key,r);}
  const all=[...unique.values()],label=r=>r.name+(r.detachment?' · '+r.detachment:''),questions=[];
  const choices=(correct,others)=>shuffle([correct,...shuffle(others,random).slice(0,3)],random).map(option=>({...option,faction}));
  const ruleView=r=>Object.fromEntries(['id','name','faction','category','summary','conditions','sourceIds','sourceUrl','sourceLabel','status','referenceOnly','mechanicsDetails','targetText','triggerText','phase','turn','window','detachment'].filter(key=>r[key]!==undefined).map(key=>[key,copy(r[key])]));
  const unitView=u=>({id:u.id,name:u.name,faction:u.faction,...(u.fightsFirst?{fightsFirst:u.fightsFirst}:{})});
  const explain=r=>({summary:r.summary,conditions:Array.isArray(r.conditions)?r.conditions:[],sourceUrl:/^https?:\/\//i.test(r.sourceUrl||'')?r.sourceUrl:'',sourceLabel:r.sourceLabel||'Current catalog study summary',detachment:r.detachment||''});
  for(const r of all){
   const seen=new Set([norm(label(r))]),other=all.filter(a=>{if(a.category!==r.category||norm(a.summary)===norm(r.summary)||norm(a.name)===norm(r.name)||seen.has(norm(label(a))))return false;seen.add(norm(label(a)));return true;});
   if(other.length<3)continue;
   const id='rule:'+r.id;questions.push({id,mode:'rules',category:r.category,prompt:'Which '+(categories[r.category]||'rule').toLowerCase()+' matches this description?',clue:hideName(r.summary,r.name),correct:r.id,options:choices({id:r.id,label:label(r)},other.map(a=>({id:a.id,label:label(a)}))),review:{kind:'rule',rule:ruleView(r),units:[]},explanation:explain(r)});
  }
  const unitNames=new Map();for(const u of units.filter(matches)){const key=norm(u.name);if(!unitNames.has(key))unitNames.set(key,u);}
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
  const profiles=[];
  for(const u of selectedUnits){const read=P?P.read(u):[],names=new Map();for(const p of read){const key=norm(p.name||u.name);names.set(key,(names.get(key)||0)+1);}for(const p of read){if(names.get(norm(p.name||u.name))>1)continue;for(const f of P.fields)if(known(p[f.key],f.key))profiles.push({unit:u,profile:p,field:f,value:format(p[f.key],f.key)});}}
  const statSeen=new Set();
  for(const item of profiles){
   const {unit:u,profile:p,field:f,value}=item,id=['stat',u.id,norm(p.name||u.name),f.key].join(':');if(statSeen.has(id))continue;statSeen.add(id);
   const values=[...new Set(profiles.filter(a=>a.field.key===f.key).map(a=>a.value))].filter(v=>v!==value);if(values.length<3)continue;
   const profileLabel=p.name&&norm(p.name)!==norm(u.name)?' ('+p.name+' profile)':'';
   questions.push({id,mode:'stats',category:'stats',prompt:'What is '+u.name+'’s '+f.label+profileLabel+'?',clue:'Choose the value in the saved unit profile.',correct:value,options:choices({id:value,label:value},values.map(v=>({id:v,label:v}))),review:{kind:'stats',units:[unitView(u)],profile:copy(p),stat:f.key,sourceUrl:u.sourceUrl||'',sourceLabel:u.sourceLabel||'Current catalog unit profile'},explanation:{summary:u.name+profileLabel+': '+f.label+' '+value+'.',conditions:[],sourceUrl:/^https?:\/\//i.test(u.sourceUrl||'')?u.sourceUrl:'',sourceLabel:u.sourceLabel||'Current catalog unit profile'}});
  }
  for(const q of questions)if(q.review.kind==='rule'&&['ability','core'].includes(q.review.rule.category))q.review.units=selectedUnits.filter(u=>hasRule(u,q.review.rule)).map(unitView);
  return {faction,questions:questions.map(q=>({...q,faction})),counts:Object.fromEntries(['rules','stats','abilities'].map(mode=>[mode,questions.filter(q=>q.mode===mode).length]))};
 }
 function createSession(bank,{mode='mixed',count=10,random=Math.random}={}){
  if(!Object.hasOwn(modes,mode)||![5,10,20].includes(count))throw Error('Choose a practice type and 5, 10 or 20 questions.');
  const pools=Object.fromEntries(['rules','stats','abilities'].filter(m=>mode==='mixed'||mode===m).map(m=>[m,shuffle(bank.questions.filter(q=>q.mode===m&&!!norm(bank.faction)&&norm(q.faction)===norm(bank.faction)&&q.options.length===4&&q.options.every(o=>norm(o.faction)===norm(bank.faction))),random)])),questions=[];
  while(questions.length<count){const available=Object.keys(pools).filter(m=>pools[m].length);if(!available.length)break;const selected=available[Math.floor(random()*available.length)];questions.push(copy(pools[selected].pop()));}
  return {faction:bank.faction,mode,questions,index:0,answers:[]};
 }
 function answer(session,id){const q=session.questions[session.index];if(!q||session.answers.length!==session.index||!q.options.some(o=>o.id===id))return false;session.answers.push({id,correct:id===q.correct});return true;}
 const api={modes,categories,shuffle,buildBank,createSession,answer};if(node)module.exports=api;else root.WarPlannerPractice=api;
})(typeof window!=='undefined'?window:globalThis);
