'use strict';
const {phases,sample,parseArmy,next}=WarPlan;
let KEY=null;
let cloudLists=null,cloudStatus='loading',deletingListId=null,listDeleteError='';
const EMPTY_ARMY={name:'No army imported',faction:'',detachment:'',points:0,limit:2000,version:'',units:[]};
const Library=WarPlanLessons;
const Activations=WarPlanActivations;
const Builder=WarPlannerListBuilder;
let listEditor=null;
const initialState=army=>({view:'guide',guideStarted:false,guideFontSize:'medium',guideShowPreviews:true,army:structuredClone(army),round:1,turn:'you',phase:0,open:0,completed:{},revealed:{},history:[],renames:{},warnings:[],firstPlayer:'you',confirmed:{},flowRevision:'flashcards-v1'});
let state=initialState(window.WARPLANNER_CONFIG?EMPTY_ARMY:sample);
let storageOK=true;
function normalizeLists(){
 if(!Array.isArray(state.savedLists))state.savedLists=state.army.units.length?[{id:'list-1',army:structuredClone(state.army),warnings:state.warnings||[],renames:state.renames||{}}]:[];
 if(!state.activeListId&&state.savedLists.length)state.activeListId=state.savedLists[0].id;
 if(!state.savedLists.some(list=>list.id===state.setupListId))state.setupListId=state.activeListId;
 for(const list of state.savedLists)if(!list.army.disposition&&list.army.units[0]?.id.startsWith('sample'))list.army.disposition='Priority Assets';
 if(!state.army.disposition&&state.army.units[0]?.id.startsWith('sample'))state.army.disposition='Priority Assets';
}
function syncActiveList(){const list=state.savedLists?.find(l=>l.id===state.activeListId);if(list){list.army=structuredClone(state.army);list.renames={...state.renames};list.warnings=[...state.warnings];}}
function openSavedList(id){
 const list=state.savedLists.find(l=>l.id===id);if(!list)return;
 syncActiveList();
 if(state.activeListId!==id)Object.assign(state,{guideStarted:false,army:structuredClone(list.army),activeListId:id,renames:{...list.renames},warnings:[...(list.warnings||[])],completed:{},revealed:{},history:[],round:1,turn:state.firstPlayer,phase:0,open:0});
 state.setupListId=id;state.selectedListId=id;state.showImportedList=false;state.view='army';render();
}
function forgetSavedList(id){
 if(!state.savedLists?.some(list=>list.id===id))return;
 state.savedLists=state.savedLists.filter(list=>list.id!==id);
 if(listEditor?.sourceId===id)listEditor=null;
 if(state.selectedListId===id)state.selectedListId=null;
 if(state.activeListId===id){
  const replacement=state.savedLists[0];
  Object.assign(state,{activeListId:replacement?.id,army:structuredClone(replacement?.army||EMPTY_ARMY),renames:{...(replacement?.renames||{})},warnings:[...(replacement?.warnings||[])],guideStarted:false,showImportedList:false,round:1,turn:state.firstPlayer,phase:0,open:0,completed:{},revealed:{},history:[],view:'army'});
 }
 if(state.setupListId===id)state.setupListId=state.activeListId;
 persistStateCache();render();
}
window.applyWarPlannerCloudDeletion=id=>{if(deletingListId!==id&&state.savedLists?.some(list=>list.id===id))toast('This list was deleted on another device.');forgetSavedList(id);};
async function deleteSavedList(id){
 if(deletingListId||listEditor)return;
 const list=state.savedLists.find(l=>l.id===id);if(!list)return;
 if(!confirm('Delete “'+list.army.name+'”? This removes the saved list and its original upload from your account. This cannot be undone.'))return;
 const account=KEY,service=cloudLists;deletingListId=id;listDeleteError='';render();
 try{
  if(window.WARPLANNER_CONFIG&&!service)throw new Error('Wait for your account lists to finish loading, then try again.');
  const removedId=service?await service.remove(id):id;
  if(KEY!==account||cloudLists!==service)return;
  forgetSavedList(removedId);toast('List deleted.');
 }catch(error){if(KEY===account&&cloudLists===service)listDeleteError='Could not delete this list. '+(error.message||'Please try again.');}
 finally{if(KEY===account&&cloudLists===service){deletingListId=null;render();}}
}
function loadAccountState(key,army){KEY=key;state=initialState(army);storageOK=true;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.army?.units)&&Number.isInteger(saved.phase)&&saved.phase>=0&&saved.phase<5){state={...state,...saved};state.view=['guide','army','overview','practice'].includes(state.view)?state.view:'guide';state.round=Math.max(1,Number(state.round)||1);state.turn=state.turn==='opponent'?'opponent':'you';state.firstPlayer=state.firstPlayer==='opponent'?'opponent':'you';state.confirmed=state.confirmed||{};delete state.activationSelections;delete state.activationReviewed;if(!['unit-activations-v1','flashcards-v1'].includes(saved.flowRevision)){state.open=0;state.history=[];}state.flowRevision='flashcards-v1';}}catch{storageOK=false;}
normalizeLists();
}
if(!window.WARPLANNER_CONFIG)loadAccountState('warplan.prototype.v1',sample);

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function persistStateCache(){if(!KEY)return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;}}
function save(){syncActiveList();if(!KEY)return;persistStateCache();cloudLists?.schedule(state.savedLists||[]);}
function listSaveStatus(){return cloudLists?({loading:'Loading account lists…',saving:'Saving lists to account…',saved:'Lists saved to account',error:'Lists not saved — retry'}[cloudStatus]||'Saving lists…'):window.WARPLANNER_CONFIG?'Loading account lists…':storageOK?'Saved on this device':'Browser storage unavailable';}
function updateCloudUI(){
 for(const label of document.querySelectorAll?.('[data-list-sync-status]')||[])label.textContent=listSaveStatus();
 const banner=$('#list-sync-banner');if(banner)banner.hidden=cloudStatus!=='error';
}
window.setWarPlannerCloudStatus=status=>{cloudStatus=status;updateCloudUI();};
window.applyWarPlannerCloudSave=result=>{
 const local=state.savedLists?.find(l=>l.id===result.previousId);if(!local)return;
 if(result.list.id!==local.id){
  const old=local.id;local.id=result.list.id;local.army.name=result.list.army.name;
  for(const key of ['activeListId','setupListId','selectedListId'])if(state[key]===old)state[key]=local.id;
  if(state.activeListId===local.id)state.army.name=local.army.name;
  if(result.remote&&!state.savedLists.some(l=>l.id===result.remote.id))state.savedLists.push(result.remote);
  toast('This list changed elsewhere. Your changes were saved as a recovered copy.');
 }
 local.cloudRevision=result.list.cloudRevision;local.cloudBase=result.list.cloudBase;persistStateCache();
};
window.getWarPlannerLocalLists=user=>{
 try{const saved=JSON.parse(localStorage.getItem('warplanner.account.'+user.id+'.v1'));if(!saved)return [];
 const lists=Array.isArray(saved.savedLists)?saved.savedLists:saved.army?.units?.length?[{id:'list-1',army:saved.army,warnings:saved.warnings||[],renames:saved.renames||{}}]:[];
 const active=lists.find(l=>l.id===saved.activeListId);if(active&&saved.army){active.army=saved.army;active.renames=saved.renames||{};active.warnings=saved.warnings||[];}
 return lists;
 }catch{return [];}
};
window.flushWarPlannerLists=()=>cloudLists?cloudLists.flush():Promise.resolve();
window.addEventListener?.('online',()=>{if(cloudLists?.dirty)void cloudLists.flush().catch(()=>{});});
window.addEventListener?.('beforeunload',event=>{if(cloudLists?.dirty||listEditor?.dirty||deletingListId||window.WarPlannerAdminPage?.hasDraft){event.preventDefault();event.returnValue='';}});

let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3000);}
function unitName(u){if(state.renames[u.id])return state.renames[u.id];const same=state.army.units.filter(x=>x.name===u.name);return u.name+(same.length>1?' '+(same.findIndex(x=>x.id===u.id)+1):'');}
function scope(){return `${state.round}-${state.turn}-${state.phase}`;}
function stepKey(i){const step=lessons().steps[i];return Library.revision+'-'+(state.firstPlayer||'you')+'-'+scope()+'-'+(step?step.id:i);}
function lessons(){return {...Library.phases[state.phase],steps:Activations.steps(state)};}
function fitUnitPreview(element){
 const full=element.dataset.fullPreview;
 if(!full||element.clientWidth<=0)return;
 element.textContent=full;
 const lineHeight=Number.parseFloat(getComputedStyle(element).lineHeight);
 if(Number.isFinite(lineHeight)&&element.scrollHeight>lineHeight*2+1)element.textContent='Multiple Units';
}
const unitPreviewObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(entry=>fitUnitPreview(entry.target))):null;
function refreshUnitPreviews(){
 if(!document.querySelectorAll)return;
 unitPreviewObserver?.disconnect();
 for(const element of document.querySelectorAll('[data-unit-preview]')){fitUnitPreview(element);unitPreviewObserver?.observe(element);}
}
window.addEventListener?.('resize',refreshUnitPreviews);
document.fonts?.ready?.then(refreshUnitPreviews);
document.fonts?.addEventListener?.('loadingdone',refreshUnitPreviews);
function render(focusLesson=false){const detPicker=$('#builder-detachment-picker');if(listEditor&&detPicker)listEditor.detachmentPickerOpen=detPicker.open;cancelGuideMotion();save();if(state.view==='admin'&&!window.WarPlannerAdminPage?.canAccess)state.view='guide';const nav=[['overview','⌂','Study home'],['guide','▤','Guided play'],['army','◇','My army'],['practice','✧','Practice'],...(window.WarPlannerAdminPage?.canAccess?[['admin','⚙','Rules workshop']]:[])];$('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="mark"><span>⌁</span></div>WARPLANNER</div><div class="tagline">KNOW YOUR NEXT MOVE.</div><div class="nav-label">YOUR FIELD GUIDE</div><nav class="nav" aria-label="Main navigation">${nav.map(([id,icon,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}" ${state.view===id?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}${id==='practice'?'<span class="soon">LATER</span>':''}</button>`).join('')}<button type="button" data-auth-signout><span class="nav-icon" aria-hidden="true">↪</span>Sign out</button></nav><div class="sidebar-bottom"><div class="private">◈ &nbsp; A personal study companion<br>Made for the way you learn.</div><div class="profile"><div class="avatar">WP</div><div><strong>Your study space</strong><small>Personal study · v0.19</small></div></div></div></aside><main><div id="list-sync-banner" class="list-sync-banner" ${cloudStatus==='error'?'':'hidden'} role="status"><span>Your lists have not saved to your account yet. Keep this page open and retry.</span><button type="button" data-action="retry-list-save">Retry</button></div>${state.view==='guide'?'':`<div class="topbar"><span>YOUR STUDY SPACE &nbsp; / &nbsp; <strong>${state.view==='guide'?'Guided play':state.view==='army'?'My army':state.view==='practice'?'Practice':state.view==='admin'?'Rules workshop':'Study home'}</strong></span><span class="top-status"><span class="dot"></span><span data-list-sync-status>${listSaveStatus()}</span></span></div>`}${state.view==='admin'?window.WarPlannerAdminPage.render():state.view==='guide'?guide():state.view==='army'?armyView():state.view==='practice'?practiceView():overview()}</main></div>`;refreshUnitPreviews();updateCloudUI();if(focusLesson)document.querySelector('#lesson-title')?.focus({preventScroll:true});}
function armyStrip(){return `<div class="army-strip"><div class="army-sigil" aria-hidden="true">⋈</div><div><h3>${escapeHTML(state.army.faction)} <span class="muted">/</span> ${escapeHTML(Library.armyDetachments(state.army).join(' · '))}</h3><p>${state.army.units.length} units · ${escapeHTML(state.army.disposition||'Disposition not provided')}</p></div><div class="strip-right"><span class="pill">${!state.army.units.length?'No army imported':state.army.units[0]?.id.startsWith('sample')?'Saved roster':'Imported roster'}</span><button class="text-button" data-view="army">View army ↗</button></div></div>`;}
function referenceDetails(item){
 const confirmation=state.confirmed[Library.revision+'-'+item.id];
 return `<details class="reference-details"><summary>Rules reference & review</summary><div class="reference-content"><p>${item.status==='admin-reviewed'?'Maintained in the WarPlanner rules workshop.':item.status==='official-checked'?'Compared with the linked official text.':item.status==='source-reference'?'Structured community source. Confirm the complete rule in your current app or book; this is not official verification.':'Compared with community references; confirm against your current app or book.'} ${confirmation?'You also marked this checked on this device.':''}</p>${item.section?`<p>Section ${escapeHTML(item.section)}</p>`:''}${item.sourceUrl&&/^https?:\/\//i.test(item.sourceUrl)?`<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.sourceLabel||'Admin reference')} ↗</a>`:''}${item.sourceIds.map(id=>{const src=Library.sources[id];if(!src)return '';return `<a href="${escapeHTML(/^https?:\/\//i.test(src.url)?src.url:'#')}" target="_blank" rel="noopener noreferrer">${escapeHTML(src.name)} ↗</a><small>${escapeHTML(src.version)}</small>`;}).join('')}${item.status!=='official-checked'?`<button class="text-button" data-confirm-rule="${item.id}">${confirmation?'Undo my confirmation':'I checked this in my rules'}</button>`:''}</div></details>`;
}
function categoryBadge(item){return `<span class="rule-badge rule-${item.category}">${escapeHTML(Library.categories[item.category]||'Ability')}</span>${item.referenceOnly?'<span class="rule-badge reference-only">Reference only</span>':item.status==='source-reference'?'<span class="rule-badge reference-only">Source summary</span>':''}`;}
function abilityCard(a){
 const instances=a.targetUnits||state.army.units.filter(u=>a.units.some(n=>n.toLowerCase()===u.name.toLowerCase()));
 const targets=instances.length?instances.map(unitName).join(' · '):a.detachment||'Army / detachment reminder';
 return `<details class="ability-card${a.sequencePreview?' sequence-priority':''} rule-${a.category}"><summary><span>${categoryBadge(a)}${a.sequencePreview?'<span class="sequence-label">PLAN NOW · RESOLVE AFTER SHOOTING</span>':''}<strong>${escapeHTML(a.sequencePreview?a.sequence.title:a.name)}</strong><small>${escapeHTML(targets)}</small></span><span class="ability-plus" aria-hidden="true">+</span></summary><div class="ability-body">${a.sequencePreview?`<p class="sequence-advice">${escapeHTML(a.sequence.advice)}</p><p class="sequence-rule-name">Ability: ${escapeHTML(a.name)}</p>`:''}<p>${escapeHTML(a.summary)}</p><ul>${a.conditions.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ul><details class="think-details"><summary>Check your understanding</summary><p class="question">${escapeHTML(a.question)}</p><p>${escapeHTML(a.answer)}</p></details>${referenceDetails(a)}</div></details>`;
}
function activationLabel(unit){return unit.body?.name||unit.members[0]?.name||'';}
function flashDetails(items){return `<details class="flash-details"><summary>Conditions & sources</summary>${items.map(a=>`<section><h4>${escapeHTML(a.name)}</h4>${a.detachment&&Library.armyDetachments(state.army).length>1?`<p class="flash-timing">${escapeHTML(a.detachment)}</p>`:''}<ul>${a.conditions.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ul>${a.mechanicsDetails?`<details class="mechanics-source-details"><summary>Imported mechanics details</summary><p>${escapeHTML(a.mechanicsDetails)}</p></details>`:''}${referenceDetails(a)}</section>`).join('')}</details>`;}
function guideHintBadges(meta){return `${meta?.label?`<span class="flash-priority${meta.order==='late'?' flash-late':''}">${escapeHTML(meta.label)} ${meta.order==='late'?'↘':'↗'}</span>`:''}${(meta?.flags||[]).map(label=>`<span class="flash-guide-flag">${escapeHTML(label)}</span>`).join('')}`;}
function guideHintNotes(meta){return [...new Set(meta?.notes||[meta?.note].filter(Boolean))].map(note=>`<p class="flash-order">${escapeHTML(note)}</p>`).join('');}
function flashBoard(active){
 const deck=Activations.flashcards(state,active);
 if(!deck.count)return `<details class="army-lessons" open><summary>Your army at this step <span>0</span></summary><p class="ability-empty">No matching army abilities are listed for this step. Follow the core instructions above, then continue.</p></details>`;
 const sharedNames=new Map(deck.shared.map(a=>[a.key,a.name]));
 const userLabel=(_a,u)=>activationLabel(u);
 const sharedCards=deck.shared.map(a=>{
  const target=Activations.targeting(a,state);
  const users=a.appliesTo.map(u=>userLabel(a,u));
  const preview=target?target.label+': '+target.text:users.join(' · ');
  return `<details class="flash-card collapsible-flash rule-${a.category}" data-shared-rule="${escapeHTML(a.id)}"><summary class="flash-summary"><span class="flash-title-row"><h3>${escapeHTML(a.name)}</h3>${categoryBadge(a)}${guideHintBadges(a.guideMeta)}</span><p class="flash-preview" ${target?'':`data-unit-preview data-full-preview="${escapeHTML(preview)}"`}>${escapeHTML(preview)}</p><span class="flash-chevron" aria-hidden="true">+</span></summary><div class="flash-expanded">${guideHintNotes(a.guideMeta)}${target?`<div class="flash-expanded-target"><span>${target.label}</span><p>${escapeHTML(target.text)}</p></div>`:`<div class="flash-unit-list"><span>Units that can use this rule, subject to its conditions</span><ul>${users.map(name=>`<li>${escapeHTML(name)}</li>`).join('')}</ul></div>`}<p class="flash-timing">${escapeHTML(a.timing)}</p><p class="flash-fact">${escapeHTML(a.summary)}</p>${a.promoted?'<p class="flash-applies">Each listed unit keeps its own equipment, conditions, and usage limits.</p>':''}${flashDetails([a])}</div></details>`;
 }).join('');
 const unitCards=deck.unitCards.map(card=>{
  const title=card.unit.body.name;
  const first=card.fightsFirst;
  const ruleNames=[...new Set([...(first?['Fights First']:[]),...card.guideMeta.flags,...(card.guideMeta.label?[card.guideMeta.label]:[]),...card.items.map(a=>a.name),...card.sharedIds.map(id=>sharedNames.get(id)).filter(Boolean)])];
  return `<details class="flash-card unit-flash-card collapsible-flash rule-ability" data-unit-card="${escapeHTML(card.unit.id)}"><summary class="flash-summary"><span class="flash-title-row"><h3>${escapeHTML(title)}</h3>${first?'<span class="flash-fights-first">Fights First</span>':''}${guideHintBadges(card.guideMeta)}</span><p class="flash-preview">${escapeHTML(ruleNames.join(' · '))}</p><span class="flash-chevron" aria-hidden="true">+</span></summary><div class="flash-expanded">${guideHintNotes(card.guideMeta)}${card.items.map(a=>`<div class="flash-rule"><div>${categoryBadge(a)}${guideHintBadges(a.guideMeta)}<h4>${escapeHTML(a.name)}</h4></div><p class="flash-timing">${escapeHTML(a.timing)}</p><p class="flash-fact">${escapeHTML(a.summary)}</p></div>`).join('')}${card.sharedIds.length?`<p class="flash-shared-links">Shared options above: ${escapeHTML(card.sharedIds.map(id=>sharedNames.get(id)).filter(Boolean).join(' · '))}</p>`:''}${card.items.length?flashDetails(card.items):''}</div></details>`;
 }).join('');
 const coreHelp=active.coreHelp||[];
 return `<details class="army-lessons flash-board" open><summary>Your army at this ${active.activationMode?'phase':'step'} <span>${deck.count} cards</span></summary><p class="reminder-caption">Shared rules first, then unique unit types. Each reminder appears once; check its equipment and attachment conditions.</p>${sharedCards?`<div class="flash-grid shared-flash-grid">${sharedCards}</div>`:''}${unitCards?`<div class="flash-grid unit-flash-grid">${unitCards}</div>`:''}</details>${coreHelp.length?`<details class="think-details"><summary>Core help for this phase</summary>${coreHelp.map(s=>`<h3 class="activation-help-title">${escapeHTML(s.title)}</h3><p>${escapeHTML(s.body)}</p>`).join('')}</details>`:''}`;
}
function turnToggle(){
 const order=state.firstPlayer==='opponent'?['opponent','you']:['you','opponent'];
 const labels={you:'Your turn',opponent:'Opponent’s turn'};
 const nextFirst=state.firstPlayer==='you'?'Opponent':'You';
 return `<div class="guide-turn-toggle"><div class="turn-controls" role="group" aria-label="Guide turn">${order.map(turn=>`<button data-turn="${turn}" class="${state.turn===turn?'selected':''}" aria-pressed="${state.turn===turn}">${labels[turn]}</button>`).join('')}</div><button class="turn-order-button" data-action="swap-turn-order" aria-label="Put ${nextFirst.toLowerCase()} first in the turn order" title="Put ${nextFirst.toLowerCase()} first in the turn order">⇄</button></div>`;
}
function swapGuideOrder(){
 const previous=lessons().steps[state.open];
 state.firstPlayer=state.firstPlayer==='you'?'opponent':'you';
 const index=lessons().steps.findIndex(step=>step.id===previous?.id);
 state.open=index>=0?index:0;
 render(true);
}
function switchGuideTurn(turn){
 if(turn===state.turn)return;
 const previous=lessons().steps[state.open];
 state.turn=turn;
 const steps=lessons().steps;
 let index=steps.findIndex(step=>step.id===previous?.id);
 if(index<0&&previous?.activationMode)index=steps.findIndex(step=>step.activationMode);
 state.open=index>=0?index:0;
 render(true);
}
function phaseTabs(){return `<nav class="phase-nav" role="tablist" aria-label="Game phase">${phases.map((p,i)=>`<button id="phase-tab-${i}" data-phase="${i}" role="tab" aria-controls="guide-panel" aria-selected="${state.phase===i}" tabindex="${state.phase===i?0:-1}" class="${state.phase===i?'active':''}"><span class="phase-number">${i+1}</span>${p}</button>`).join('')}</nav>`;}
function guideCoverage(){return `<footer class="focus-footer"><span>11th edition · Personal study snapshot</span><details><summary>Content coverage</summary><p>Core sequence checked against the June 2026 official PDF. Expanded Aeldari coverage indexes 80 datasheets, 16 detachments, 54 enhancements and 81 Stratagems from a pinned community source. Provisional and incomplete entries are reference-only; confirm current rules before applying effects. The index is not a fully verified codex. No mission scoring or eligibility automation. Latest-update completeness is not guaranteed.</p><div class="rule-legend">${Object.keys(Library.categories).map(category=>categoryBadge({category})).join('')}</div><p>Reviewed 13 November 2026 · ${Library.revision}</p></details></footer>`;}
function armyAlliance(faction){
 const indexed=Builder.factions().find(f=>Library.factionMatches(f.name,faction)||(f.aliases||[]).some(a=>Library.factionMatches(a,faction)));if(indexed)return indexed.group;
 const name=String(faction||'').toLowerCase().replace(/[’']/g,'');
 if(/chaos|daemon|death guard|thousand sons|world eaters|emperors children/.test(name))return 'Chaos';
 if(/aeldari|eldar|drukhari|ynnari|harlequin|necron|ork|tyranid|genestealer|tau|t’au|votann/.test(name))return 'Xenos';
 if(/imperium|imperial|astra militarum|adepta|adeptus|space marine|blood angel|dark angel|space wolve|black templar|deathwatch|grey knight|salamander|raven guard|iron hand|white scar|ultramarine|crimson fist|flesh tearer|agent|inquisition|sister/.test(name))return 'Imperium';
 return 'Other';
}
function guideStartPage(){
 const lists=state.savedLists||[],chosen=state.setupListId||state.activeListId;
 const groups=['Imperium','Chaos','Xenos','Other'].map(group=>{
  const members=lists.filter(list=>armyAlliance(list.army.faction)===group).sort((a,b)=>(a.army.faction||'').localeCompare(b.army.faction||'',undefined,{sensitivity:'base'})||a.army.name.localeCompare(b.army.name,undefined,{sensitivity:'base'}));
  return members.length?`<optgroup label="${group}">${members.map(list=>`<option value="${escapeHTML(list.id)}" ${list.id===chosen?'selected':''}>${escapeHTML(list.army.faction||'Unclassified')} — ${escapeHTML(list.army.name)}</option>`).join('')}</optgroup>`:'';
 }).join('');
 const first=state.setupFirstPlayer||state.firstPlayer;
 return `<section class="guide-carousel guide-start-shell" aria-label="Guide setup"><div class="guide-frame"><div class="guide-start-page"><div class="eyebrow">YOUR NEXT GAME</div><h1>Start your guide</h1><form id="guide-start-form"><label for="guide-army-list">Army list</label><select id="guide-army-list" data-guide-list required ${lists.length?'':'disabled'}>${groups||'<option value="">Import a list to get started</option>'}</select><label for="guide-first-player">Who goes first?</label><select id="guide-first-player" data-guide-first><option value="you" ${first==='you'?'selected':''}>You</option><option value="opponent" ${first==='opponent'?'selected':''}>Your opponent</option></select><button class="primary guide-start-button" type="submit" ${lists.length?'':'disabled'}>Start <span aria-hidden="true">→</span></button></form>${lists.length?'':'<button class="text-button" data-action="import">Import an army list</button>'}${guideCoverage()}</div></div></section>`;
}
function showGuideStart(reset=false){
 state.guideStarted=false;state.setupListId=state.activeListId;state.setupFirstPlayer=state.firstPlayer;state.view='guide';
 if(reset)Object.assign(state,{round:1,turn:state.firstPlayer,phase:0,open:0,completed:{},revealed:{},history:[]});
 render();
}
function startGuide(){
 const selected=state.savedLists?.find(list=>list.id===(state.setupListId||state.activeListId));
 if(!selected){toast('Import and select an army list first.');return;}
 syncActiveList();
 const first=state.setupFirstPlayer==='opponent'?'opponent':state.setupFirstPlayer==='you'?'you':state.firstPlayer;
 Object.assign(state,{army:structuredClone(selected.army),activeListId:selected.id,renames:{...selected.renames},warnings:[...(selected.warnings||[])],firstPlayer:first,turn:first,round:1,phase:0,open:0,completed:{},revealed:{},history:[],guideStarted:true,view:'guide'});
 render(true);
}
function guideSettings(){return `<details class="guide-settings"><summary aria-label="Guide settings" title="Guide settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.6 2.4-2 .9L4 5.6 2.5 8l1.8 1.8v2.4L2.5 14 4 16.4l2.4-.7 2 .9L9 19h3l.6-2.4 2-.9 2.4.7 1.5-2.4-1.8-1.8V9.8L18.5 8 17 5.6l-2.4.7-2-.9L12 3Z"/><circle cx="10.5" cy="11" r="3"/></svg></summary><div class="guide-settings-menu"><label class="guide-font-label" for="guide-font-size">Font size</label><select id="guide-font-size">${['small','medium','large'].map(size=>`<option value="${size}" ${size===(state.guideFontSize||'medium')?'selected':''}>${size[0].toUpperCase()+size.slice(1)}</option>`).join('')}</select><label class="guide-preview-setting"><input id="guide-show-previews" type="checkbox" ${state.guideShowPreviews!==false?'checked':''}>Show preview info</label><button type="button" data-action="reset-guide">Reset guide</button><button type="button" data-action="choose-guide-army">Choose another army</button></div></details>`;}
function guide(){if(!state.guideStarted)return guideStartPage();return `<section class="guide-page-shell guide-carousel" aria-label="Interactive guide" data-show-previews="${state.guideShowPreviews!==false}" data-font-size="${['small','large'].includes(state.guideFontSize)?state.guideFontSize:'medium'}"><div class="guide-frame"><button class="guide-page-arrow previous-page" data-action="page-previous" aria-label="Previous page" title="Previous page" ${canPreviousPage()?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><header class="guide-fixed-header">${guideSettings()}${turnToggle()}${phaseTabs()}</header><div class="guide-viewport"><div class="guide-slide" id="guide-panel" role="tabpanel" aria-labelledby="phase-tab-${state.phase}">${guidePageHTML()}</div></div><button class="guide-page-arrow next-page" data-action="page-next" aria-label="Next page" title="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div></section>`;}
function guidePageHTML(){
 const data=lessons();state.open=Math.max(0,Math.min(data.steps.length-1,state.open));
 const active=data.steps[state.open];
 const unsupported=state.army.units.filter(u=>!Library.unitInfo(u.name,state.army.faction));
 const phaseHasAbilities=Library.phases[state.phase].steps.some(step=>Library.forStep(state,step).length>0);
 return `<div class="focus-layout"><article class="lesson-focus rule-${active.category}" aria-labelledby="lesson-title"><span class="lesson-kind">${categoryBadge(active)} <span class="rule-context">${escapeHTML(active.kind)}</span></span><h2 id="lesson-title" tabindex="-1">${escapeHTML(active.title)}</h2><p class="lesson-instruction">${escapeHTML(active.body)}</p>${flashBoard(active)}${!phaseHasAbilities?`<p class="coverage-note">${unsupported.length?'Army-ability coverage is incomplete for this phase.':'No army abilities are listed for this phase in this turn.'}</p>`:''}<details class="think-details"><summary>Why this matters</summary><p>${escapeHTML(active.why)}</p></details><details class="think-details"><summary>Test your understanding</summary><p class="question">${escapeHTML(active.question)}</p><p>${escapeHTML(active.answer)}</p></details>${referenceDetails(active)}</article><details class="sequence-outline"><summary>See the whole phase</summary><div>${data.steps.map((step,i)=>`<button data-step="${i}" aria-current="${i===state.open?'step':'false'}"><span>${state.completed[stepKey(i)]?'✓':i+1}</span>${escapeHTML(step.title)}</button>`).join('')}</div></details>${unsupported.length?`<p class="coverage-note">${unsupported.length} roster ${unsupported.length===1?'entry has':'entries have'} no unit-specific lesson coverage yet. Core guidance remains available.</p>`:''}</div>`;
}
function catalogCard(entry){
 const reviewed=Library.abilities.find(a=>a.id===Library.aliases[entry.id]);
 return reviewed||Library.abilities.find(a=>a.sourceRuleId===entry.id)||{...entry,question:'What should you check?',answer:'Check the current full rule and its exact restrictions.'};
}
function unitStudy(u){
 const info=Library.unitInfo(u.name,state.army.faction);
 if(!info)return `<p class="coverage-note">No source record for this unit. Core guidance is still available.</p>`;
 return `<details class="unit-lessons"><summary>Unit rules reference · ${info.abilities.length} entries${info.legend?' · Legends':''}</summary>${info.abilities.map(ref=>{
  const source=Library.catalog.rules.find(a=>a.id===ref.id);
  if(source)return abilityCard(catalogCard(source));
  return `<details class="reference-details"><summary>${escapeHTML(ref.id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()))}${ref.value!==undefined?' · '+escapeHTML(ref.value):''}</summary><p>Core or army keyword: check the full rule and setup conditions. ${ref.wargear?'Requires '+escapeHTML(ref.wargear.replace(/-/g,' '))+'.':''}</p><a href="${Library.sources.core.url}" target="_blank" rel="noopener noreferrer">Core rules reference ↗</a></details>`;
 }).join('')}</details>`;
}
function armyRulesReference(){
 const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const selected=Library.armyDetachments(state.army),dets=Library.catalog.detachments.filter(d=>Library.factionMatches(d.faction,state.army.faction)&&selected.some(name=>normalize(d.name)===normalize(name)));
 if(!dets.length)return '<p class="coverage-note">These detachments are not in the source index. Unit and core references remain available.</p>';
 const equipped=state.army.units.flatMap(u=>u.details).join(' ');
 const armyRules=Library.abilities.filter(a=>a.category==='army'&&!a.detachment&&Library.matches(a,state.army));
 const entries=Library.catalog.rules.filter(a=>Library.factionMatches(a.faction,state.army.faction)&&dets.some(d=>a.detachment===d.name)&&(a.category!=='enhancement'||normalize(equipped).includes(normalize(a.enhancement))));
 return `<details class="army-rules-reference"><summary>Army & detachment rules · ${escapeHTML(selected.join(', '))}</summary><p>Includes phase reminders and reference-only entries. ${dets.some(d=>d.gameModes?.includes('combat-patrol'))?'Combat Patrol rules: check your game format.':''}</p>${armyRules.map(abilityCard).join('')}${entries.map(a=>abilityCard(catalogCard(a))).join('')}</details>`;
}

function listMetadata(army){return `<dl class="list-metadata"><div><dt>Roster</dt><dd>${escapeHTML(army.faction||'Not provided')} · ${army.units.length} ${army.units.length===1?'unit':'units'}</dd></div><div><dt>${Library.armyDetachments(army).length>1?'Detachments':'Detachment'}</dt><dd>${escapeHTML(Library.armyDetachments(army).join(', ')||'Not provided')}</dd></div><div><dt>Disposition</dt><dd>${escapeHTML(army.disposition||'Not provided')}</dd></div></dl>`;}
function markEditorDirty(){listEditor.dirty=true;const note=$('.editor-draft-note');if(note)note.textContent='Unsaved changes';}
function editorOptions(values,current,placeholder){return `${placeholder?`<option value="">${placeholder}</option>`:''}${current&&!values.includes(current)?`<option value="${escapeHTML(current)}" selected>${escapeHTML(current)} · imported</option>`:''}${values.map(value=>`<option value="${escapeHTML(value)}" ${value===current?'selected':''}>${escapeHTML(value)}</option>`).join('')}`;}
function beginListEditor(create=false){
 syncActiveList();const source=create?null:state.savedLists.find(l=>l.id===state.selectedListId);
 if(!create&&!source)return;
 listEditor={sourceId:source?.id||null,original:source?structuredClone(source.army):null,army:source?structuredClone(source.army):Builder.newArmy(),renames:{...(source?.renames||{})},base:source?JSON.stringify({army:source.army,renames:source.renames||{}}):'',query:'',dirty:false,error:'',expandedUnitId:null};state.view='army';render();
}
function builderSearchResults(){
 const aeldari=Builder.hasFaction(listEditor.army.faction);if(!aeldari)return '<p class="muted">No unit catalog is available for this faction yet. You can still edit imported entries and metadata.</p>';
 if(!listEditor.query.trim())return '<p class="builder-search-count">Type a unit name to search this faction’s catalog.</p>';
 const matches=Builder.search(listEditor.query,listEditor.army.faction),shown=matches.slice(0,12);
 return `<p class="builder-search-count">${matches.length} matches${matches.length>12?' · Keep typing to narrow the results':''}</p>${shown.map(u=>`<button type="button" class="builder-search-result" data-add-unit="${escapeHTML(u.id)}"><span>${escapeHTML(u.name)}${u.legend?' <small>Legends</small>':''}</span><span aria-hidden="true">＋</span></button>`).join('')||'<p>No units found. Try another name.</p>'}`;
}
function editorDetachmentPicker(){
 const selected=Builder.selectedDetachments(listEditor.army),normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!Builder.hasFaction(listEditor.army.faction))return `<label>Detachments <small>One per line</small><textarea id="editor-detachment" data-list-field="detachmentList" rows="3">${escapeHTML(selected.join('\n'))}</textarea></label>`;
 const options=[...Builder.detachments(listEditor.army.faction).map(d=>d.name),...selected.filter(name=>!Builder.detachments(listEditor.army.faction).some(d=>normalize(d.name)===normalize(name)))];
 return `<fieldset class="builder-detachments"><legend>Detachments</legend><details id="builder-detachment-picker" ${listEditor.detachmentPickerOpen?'open':''}><summary>${selected.length?escapeHTML(selected.join(', ')):'Choose detachments'}</summary><div class="builder-detachment-choices">${options.map(name=>`<label><input type="checkbox" data-editor-detachment="${escapeHTML(name)}" ${selected.some(s=>normalize(s)===normalize(name))?'checked':''}><span>${escapeHTML(name)}</span></label>`).join('')}</div></details><p>Choose one or more.</p></fieldset>`;
}
function editorEnhancementOptions(unit){
 const available=Builder.enhancements(listEditor.army,unit),name=Builder.enhancement(unit),matching=available.filter(e=>e.name===name);
 const selected=unit.enhancementId||(matching.length===1?matching[0].id:name);
 return `<option value="">None</option>${name&&!available.some(e=>e.id===selected)?`<option value="${escapeHTML(selected)}" selected>${escapeHTML(name)} · imported, review source</option>`:''}${available.map(e=>{const det=Library.catalog.detachments.find(d=>d.id===e.detachmentId);return `<option value="${escapeHTML(e.id)}" ${e.id===selected?'selected':''}>${escapeHTML(e.name)}${Builder.selectedDetachments(listEditor.army).length>1?' · '+escapeHTML(det?.name||''):''}</option>`;}).join('')}`;
}
function listEditorUnit(unit){
 const army=listEditor.army,source=Builder.info(unit.name,listEditor.army.faction),label=listEditor.renames[unit.id]||'';
 const currentEnhancement=Builder.enhancement(unit),enhancements=Builder.enhancements(army,unit);
 const body=Builder.attachedTo(army,unit),bodies=Builder.eligibleBodies(army,unit);
 if(body&&!bodies.some(u=>u.id===body))bodies.push(army.units.find(u=>u.id===body));
 const token=source?.abilities.some(a=>a.id==='aspect-shrine-token-aeldari');
 const notes=unit.details.filter(d=>!/^Enhancement\s*:/i.test(d)&&!/^Attached as:/i.test(d)&&!(token&&/aspect shrine token/i.test(d))).join('\n');
 const counts=(source?.modelCounts||[]).filter(n=>n>0);
 return `<article class="builder-unit"><div class="builder-unit-heading"><h3>${escapeHTML(unit.name)}</h3><button class="text-button" type="button" data-remove-unit="${escapeHTML(unit.id)}" aria-label="Remove ${escapeHTML(unit.name)}">Remove</button></div><details ${listEditor.expandedUnitId===unit.id?'open':''}><summary>Unit options${body?' · Attached':''}</summary><div class="builder-unit-fields"><label>Your label<input data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="label" value="${escapeHTML(label)}" maxlength="80" placeholder="Optional squad name"></label>${counts.length?`<label>Models<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="modelCount">${unit.modelCount===undefined?'<option value="" selected>As imported</option>':''}${editorOptions([...new Set([...counts,...(unit.modelCount?[unit.modelCount]:[])])].map(String),unit.modelCount===undefined?'':String(unit.modelCount))}</select></label>`:''}${bodies.length||source?.bodyguardIds.length||['leader','support'].includes(unit.role)?`<label>Attached to<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="attachment"><option value="">Independent</option>${bodies.map(b=>`<option value="${escapeHTML(b.id)}" ${body===b.id?'selected':''}>${escapeHTML(listEditor.renames[b.id]||b.name)}</option>`).join('')}</select></label>`:''}${enhancements.length||currentEnhancement?`<label>Enhancement<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="enhancement">${editorEnhancementOptions(unit)}</select></label>`:''}${token?`<label>Aspect Shrine Tokens<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="tokens">${[0,1,2].map(n=>`<option value="${n}" ${Builder.tokens(unit)===n?'selected':''}>${n}</option>`).join('')}</select></label>`:''}<label class="builder-notes">Equipment & notes <small>One item per line</small><textarea data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="details" rows="4">${escapeHTML(notes)}</textarea></label></div></details></article>`;
}
function listEditorView(){
 const army=listEditor.army,aeldari=Builder.hasFaction(army.faction),selected=Builder.selectedDetachments(army),dets=Library.catalog.detachments.filter(d=>Library.factionMatches(d.faction,state.army.faction)&&selected.some(name=>name.toLowerCase().replace(/[^a-z0-9]/g,'')===d.name.toLowerCase().replace(/[^a-z0-9]/g,''))),pairings=[...new Set(dets.flatMap(d=>d.dispositions||[]))];
 return `<form id="list-editor-form" class="list-editor"><header class="heading"><div><div class="eyebrow">${listEditor.sourceId?'EDIT WORKING LIST':'BUILD A LIST'}</div><h1>${listEditor.sourceId?'Edit your list':'Create a list'}</h1><p>${listEditor.original?.originalExport?'Your original upload stays unchanged.':'Choose a faction and search its available units.'}</p></div><div class="button-row"><button type="button" class="text-button" data-action="cancel-list-editor">Cancel</button><button type="submit" class="primary">${listEditor.sourceId?'Save changes':'Create list'}</button></div></header><p class="editor-draft-note">${listEditor.dirty?'Unsaved changes':'Changes are saved when you submit this form.'}</p><p id="builder-error" class="builder-error" role="alert">${escapeHTML(listEditor.error)}</p><div class="builder-metadata"><label>List name<input id="editor-list-name" data-list-field="name" value="${escapeHTML(army.name)}" maxlength="100" required></label><label>Roster<select data-list-field="faction" aria-label="Roster" ${army.units.length?'disabled':''}>${editorOptions(Builder.factions().map(f=>f.name),army.faction)}</select></label>${editorDetachmentPicker()}<label>Disposition<select id="editor-disposition" data-list-field="disposition" required>${editorOptions(Builder.dispositions(army.faction),army.disposition,'Choose a disposition')}</select></label></div>${pairings.length?`<p class="builder-pairing">Listed dispositions for these detachments: ${escapeHTML(pairings.map(s=>s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')).join(', '))}. Check that your combination fits your game.</p>`:''}<section class="builder-unit-search"><h2>Add units</h2><label for="builder-unit-search">Search units by name</label><input id="builder-unit-search" type="search" value="${escapeHTML(listEditor.query)}" placeholder="Search units…" autocomplete="off" ${aeldari?'':'disabled'}><div id="builder-search-results">${builderSearchResults()}</div></section><section class="builder-roster"><h2>Your roster <span>${army.units.length} units</span></h2>${army.units.map(listEditorUnit).join('')||'<p class="builder-empty">Search for a unit above to start your list.</p>'}</section><p class="builder-footnote">Check equipment, enhancements, attachments and roster eligibility against your current rules.</p><button class="primary builder-save-bottom" type="submit">Save list</button></form>`;
}
function saveListEditor(){
 if(!listEditor)return;
 try{
  const army=Builder.commit(listEditor.army,listEditor.original),old=state.savedLists.find(l=>l.id===listEditor.sourceId);
  const unchanged=old&&JSON.stringify({army:old.army,renames:old.renames||{}})===listEditor.base;
  syncActiveList();
  const id=unchanged?old.id:'list-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  if(old&&!unchanged)army.name+=' (Edited copy)';
  const saved={id,army,renames:structuredClone(listEditor.renames),warnings:[...(old?.warnings||[])],...(unchanged?{cloudRevision:old.cloudRevision,cloudBase:old.cloudBase}:{})};
  if(unchanged)state.savedLists[state.savedLists.findIndex(l=>l.id===id)]=saved;else state.savedLists.push(saved);
  Object.assign(state,{army:structuredClone(army),activeListId:id,selectedListId:id,setupListId:id,renames:{...saved.renames},warnings:[...saved.warnings],guideStarted:false,phase:0,round:1,turn:state.firstPlayer,open:0,completed:{},revealed:{},history:[],showImportedList:false,view:'army'});
  listEditor=null;render();toast(cloudLists?'Saving your list to your account…':'List saved.');
 }catch(error){listEditor.error=error.message;const message=$('#builder-error');if(message)message.textContent=error.message;}
}
window.hasUnsavedListDraft=()=>!!listEditor?.dirty||!!deletingListId||!!window.WarPlannerAdminPage?.hasDraft;
function armyView(){
 if(listEditor)return listEditorView();
 const lists=state.savedLists||[],selected=lists.find(l=>l.id===state.selectedListId);
 if(!selected)return `<header class="heading"><div><div class="eyebrow">YOUR ARMY, YOUR LESSONS</div><h1>My saved lists</h1><p>${lists.length?'Choose a list to see its roster and study it.':'Bring your army. Import a list to get started.'}</p></div><div class="button-row"><button class="outline" data-action="import">Import list</button><button class="primary" data-action="create-list">Create list</button></div></header>${listDeleteError?`<p class="list-delete-error" role="alert">${escapeHTML(listDeleteError)}</p>`:''}<div class="saved-lists">${lists.map(list=>`<article class="saved-list-entry"><button class="saved-list-card" data-open-list="${escapeHTML(list.id)}"><span class="saved-list-heading"><strong>${escapeHTML(list.army.name)}</strong><span aria-hidden="true">→</span></span>${listMetadata(list.army)}${list.id===state.activeListId?'<span class="pill">Active in guide</span>':''}</button><div class="saved-list-actions"><button type="button" class="text-button delete-list-button" data-delete-list="${escapeHTML(list.id)}" aria-label="Delete ${escapeHTML(list.army.name)}" ${deletingListId?'disabled':''}>${deletingListId===list.id?'Deleting…':'Delete'}</button></div></article>`).join('')}</div>`;
 const army=state.army;
 const sourceRoster=army.originalRoster||army;
 const exportText=army.originalExport||sourceRoster.units.map(u=>[u.name,u.modelCount?'Models: '+u.modelCount:'',u.group?'Attached group '+u.group+' · '+u.role:'',...u.details].filter(Boolean).join('\n')).join('\n\n');
 return `${listDeleteError?`<p class="list-delete-error" role="alert">${escapeHTML(listDeleteError)}</p>`:''}<button class="text-button" data-action="list-library">← Saved lists</button><header class="heading"><div><div class="eyebrow">YOUR SAVED ARMY LIST</div><h1>${escapeHTML(army.name)}</h1></div><div class="button-row"><button class="outline" data-action="edit-list">Edit list</button><button type="button" class="outline delete-list-button" data-delete-list="${escapeHTML(selected.id)}" ${deletingListId?'disabled':''}>${deletingListId===selected.id?'Deleting…':'Delete list'}</button><button class="outline" data-action="view-imported-list" aria-expanded="${!!state.showImportedList}">${state.showImportedList?'Hide':army.origin==='builder'?'View':'View'} ${army.origin==='builder'?'roster text':'imported list'}</button><button class="primary" data-view="guide">Open guide</button></div></header>${listMetadata(army)}${armyRulesReference()}${state.showImportedList?`<section class="imported-list"><h2>${army.origin==='builder'?'Roster text':'Original imported list'}</h2>${army.originalExport||army.origin==='builder'?'':'<p>The original export was not retained for this starter list. This is the original saved roster; import the full export to retain its original text.</p>'}<pre>${escapeHTML(exportText)}</pre></section>`:''}<input class="search" id="unit-search" type="search" aria-label="Search army units" placeholder="Search your units…"><div class="army-grid">${army.units.map(u=>`<article class="unit-card" data-unit-name="${escapeHTML(u.name.toLowerCase())}"><span class="unit-symbol">◇</span><h3>${escapeHTML(unitName(u))}</h3><p>${u.group?'Attached group '+escapeHTML(u.group)+' · '+escapeHTML(u.role||'Role to review'):'Individual entry'}${u.modelCount?' · '+u.modelCount+' models':''}</p><details><summary>Unit details & study notes</summary><label for="rename-${u.id}">Your label</label><input class="rename-input" id="rename-${u.id}" data-rename="${u.id}" value="${escapeHTML(unitName(u))}" maxlength="80"><ul>${u.details.length?u.details.map(d=>`<li>${escapeHTML(d)}</li>`).join(''):'<li>No equipment details retained.</li>'}</ul></details>${unitStudy(u)}</article>`).join('')}</div>`;
}
function prebattleView(){const cards=Library.prebattle.filter(a=>!a.units.length||state.army.units.some(u=>a.units.includes(u.name)));return `<details class="sequence-outline"><summary>Before a practice game</summary>${cards.map(a=>`<section class="aside-card" style="margin-top:12px"><h3>${escapeHTML(a.name)}</h3><p>${escapeHTML(a.summary)}</p>${referenceDetails(a)}</section>`).join('')}</details>`;}
function overview(){return `<header class="heading"><div><div class="eyebrow">KNOW YOUR NEXT MOVE</div><h1>Confidence comes with practice.</h1><p>Your army. Your pace. One decision at a time.</p></div></header>${armyStrip()}<div class="phase-hero"><div class="hero-kicker">YOUR PERSONAL FIELD GUIDE</div><h2>Learn it at the table.</h2><p>Walk through each phase, pause at the choices, and understand what to consider before you act.</p><div style="margin-top:24px"><button class="primary" data-view="guide">Resume guided play <span>→</span></button></div></div><div class="overview-cards"><div class="aside-card"><span class="eyebrow">PICK UP HERE</span><h3>${phases[state.phase]} Phase</h3><p>Round ${state.round} · ${state.turn==='you'?'Your turn':'Opponent’s turn'}</p></div><div class="aside-card"><span class="eyebrow">YOUR ROSTER</span><h3>${escapeHTML(Library.armyDetachments(state.army).join(' · '))}</h3><p>${state.army.units.length} units</p></div><div class="aside-card"><span class="eyebrow">THE APPROACH</span><h3>Understand, then act.</h3><p>Expandable prompts. No pressure to rush.</p></div></div><div class="banner">Personal study edition: core sequences and roster-specific timing reminders are available. Expand a lesson’s reference for its source and review status.</div>${prebattleView()}<div class="button-row"><button class="outline" data-action="import">Import an army</button><button class="text-button" data-action="restart">Start a fresh walkthrough</button></div><p class="footnote">WarPlanner is an independent, unofficial personal study companion.<br>Not affiliated with or endorsed by Games Workshop. Referenced trademarks belong to their owners.</p><details class="sequence-outline"><summary>References & credits</summary><p style="margin-top:14px;font-size:11px">Powered by <a href="https://40kdc.alpacasoft.dev" target="_blank" rel="noopener noreferrer">40kdc-data</a>. Community mechanics by Alpaca Software and the 40kdc community contributors, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Adaptations: selected roster coverage, rewritten study summaries, explicit timing prompts, and token-scope corrections. <a href="https://wahapedia.ru/wh40k11ed/the-rules/data-export/" target="_blank" rel="noopener noreferrer">Wahapedia</a> was also consulted. Official references and review dates are linked within each lesson.</p></details>`;}
function practiceView(){return `<header class="heading"><div><div class="eyebrow">ON THE HORIZON</div><h1>Make it second nature.</h1><p>Recall practice will arrive in a future version.</p></div></header><section class="empty-card"><span class="pill">Future update</span><h2>Know it when it matters.</h2><p>Short army-specific quizzes, timing questions, and battlefield scenarios. Planned sessions will use reviewed, versioned content from the same lesson library as guided play.</p><p>For now, practice explaining your decisions in the phase walkthrough.</p><button class="primary" data-view="guide">Return to guided play <span>→</span></button></section>`;}
function canPreviousPage(){return state.open>0||state.phase>0||state.turn!==state.firstPlayer||state.round>1;}
function guideDestination(direction){
 const target={round:state.round,turn:state.turn,phase:state.phase,open:state.open};
 if(direction>0){
  if(target.open<lessons().steps.length-1)target.open++;
  else{const following=next(state);Object.assign(target,{round:following.round,turn:following.turn,phase:following.phase,open:0});}
 }else{
  if(!canPreviousPage())return null;
  if(target.open>0)target.open--;
  else{
   if(target.phase>0)target.phase--;
   else{target.phase=4;if(target.turn===state.firstPlayer){target.round--;target.turn=state.firstPlayer==='you'?'opponent':'you';}else target.turn=state.firstPlayer;}
   target.open=Activations.steps({...state,...target}).length-1;
  }
 }
 return target;
}
let guideMotion=null;
function reducedGuideMotion(){return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
function discardGuideDrag(drag){
 if(!drag)return;
 if(drag.current){drag.current.style.transform='';drag.current.inert=false;}
 drag.preview?.remove();
}
function cancelGuideMotion(){
 const motion=guideMotion;guideMotion=null;
 if(motion){for(const animation of motion.animations)animation.cancel();discardGuideDrag(motion.drag);}
 if(guideGesture?.drag)discardGuideDrag(guideGesture.drag);
 guideGesture=null;
}
function makeGuideDrag(direction){
 if(reducedGuideMotion())return null;
 const viewport=document.querySelector('.guide-viewport'),current=document.querySelector('.guide-slide');
 if(!viewport||!current||typeof current.animate!=='function'||!document.createElement)return null;
 const width=viewport.clientWidth;if(!width)return null;
 const destination=guideDestination(direction);
 let preview=null;
 if(destination){
  const original=state;
  let html;try{state={...original,...destination};html=guidePageHTML();}finally{state=original;}
  preview=document.createElement('div');preview.className='guide-slide guide-preview';preview.inert=true;preview.setAttribute('aria-hidden','true');preview.innerHTML=html;
  preview.style.transform=`translate3d(${direction*width}px,0,0)`;viewport.append(preview);
  for(const element of preview.querySelectorAll('[data-unit-preview]'))fitUnitPreview(element);
 }
 return {current,preview,direction,destination,width,offset:0};
}
function paintGuideDrag(gesture,dx){
 const direction=dx<0?1:-1;
 if(gesture.drag&&gesture.drag.direction!==direction){discardGuideDrag(gesture.drag);gesture.drag=null;}
 gesture.drag=gesture.drag||makeGuideDrag(direction);
 const drag=gesture.drag;if(!drag)return;
 drag.offset=drag.destination?Math.max(-drag.width,Math.min(drag.width,dx)):dx*.18;
 drag.current.style.transform=`translate3d(${drag.offset}px,0,0)`;
 if(drag.preview)drag.preview.style.transform=`translate3d(${drag.offset+direction*drag.width}px,0,0)`;
}
function commitGuidePage(destination,direction){
 if(direction>0)state.completed[stepKey(state.open)]=true;
 if(destination.phase!==state.phase||destination.turn!==state.turn||destination.round!==state.round){state.history.push({round:state.round,turn:state.turn,phase:state.phase,open:state.open});state.history=state.history.slice(-100);}
 Object.assign(state,destination);render(true);
}
function animateGuideDrag(drag,commit){
 if(!drag){return false;}
 drag.current.inert=true;
 const end=commit?-drag.direction*drag.width:0;
 const duration=commit?240:170;
 const options={duration,easing:'cubic-bezier(.22,.75,.2,1)',fill:'forwards'};
 const animations=[];
 try{
  animations.push(drag.current.animate([{transform:`translate3d(${drag.offset}px,0,0)`},{transform:`translate3d(${end}px,0,0)`}],options));
  if(drag.preview)animations.push(drag.preview.animate([{transform:`translate3d(${drag.offset+drag.direction*drag.width}px,0,0)`},{transform:`translate3d(${end+drag.direction*drag.width}px,0,0)`}],options));
 }catch{for(const animation of animations)animation.cancel();discardGuideDrag(drag);return false;}
 const motion={drag,animations};guideMotion=motion;
 Promise.all(animations.map(animation=>animation.finished)).then(()=>{
  if(guideMotion!==motion)return;
  guideMotion=null;
  if(commit)commitGuidePage(drag.destination,drag.direction);else discardGuideDrag(drag);
 },()=>{if(guideMotion===motion){guideMotion=null;discardGuideDrag(drag);}});
 return true;
}
function navigateGuide(direction,drag=null){
 if(guideMotion)return false;
 const destination=guideDestination(direction);
 if(!destination){if(drag&&!animateGuideDrag(drag,false))discardGuideDrag(drag);return false;}
 if(reducedGuideMotion()){discardGuideDrag(drag);commitGuidePage(destination,direction);return true;}
 drag=drag||makeGuideDrag(direction);
 if(!animateGuideDrag(drag,true))commitGuidePage(destination,direction);
 return true;
}
let guideGesture=null;
function startGuideSwipe(event){
 if(guideGesture?.drag)discardGuideDrag(guideGesture.drag);
 guideGesture=null;
 if(guideMotion||state.view!=='guide'||$('#import-dialog').open||event.touches.length!==1)return;
 if(!event.target.closest('.guide-page-shell')||event.target.closest('button,a,input,textarea,select,[contenteditable="true"]'))return;
 const touch=event.touches[0];
 if(touch.clientX<24||(window.innerWidth&&touch.clientX>window.innerWidth-24))return;
 guideGesture={id:touch.identifier,x:touch.clientX,y:touch.clientY,time:Date.now(),cancelled:false,drag:null};
}
function moveGuideSwipe(event){
 if(!guideGesture)return;
 if(event.touches.length!==1){discardGuideDrag(guideGesture.drag);guideGesture=null;return;}
 const touch=event.touches[0],dx=touch.clientX-guideGesture.x,dy=touch.clientY-guideGesture.y;
 if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){guideGesture.cancelled=true;discardGuideDrag(guideGesture.drag);guideGesture.drag=null;}
 if(!guideGesture.cancelled&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.4)paintGuideDrag(guideGesture,dx);
}
function endGuideSwipe(event){
 const gesture=guideGesture;guideGesture=null;
 if(!gesture)return;
 const abort=()=>{if(gesture.drag&&!animateGuideDrag(gesture.drag,false))discardGuideDrag(gesture.drag);};
 if(gesture.cancelled||state.view!=='guide'||$('#import-dialog').open||event.touches.length){abort();return;}
 const touch=Array.from(event.changedTouches).find(t=>t.identifier===gesture.id);if(!touch){abort();return;}
 const dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
 if(Date.now()-gesture.time>1000||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.6||window.getSelection?.()?.toString()){if(gesture.drag&&event.cancelable)event.preventDefault();abort();return;}
 if(gesture.drag&&gesture.drag.direction!==(dx<0?1:-1)){discardGuideDrag(gesture.drag);gesture.drag=null;}
 paintGuideDrag(gesture,dx);
 const moved=navigateGuide(dx<0?1:-1,gesture.drag);
 if((moved||gesture.drag)&&event.cancelable)event.preventDefault();
}
document.addEventListener('touchstart',startGuideSwipe,{passive:true});
document.addEventListener('touchmove',moveGuideSwipe,{passive:true});
document.addEventListener('touchend',endGuideSwipe,{passive:false});
document.addEventListener('touchcancel',()=>{discardGuideDrag(guideGesture?.drag);guideGesture=null;},{passive:true});
function advancePhase(){const target=next(state);transition({round:target.round,turn:target.turn,phase:target.phase});}
function transition(change){state.history.push({round:state.round,turn:state.turn,phase:state.phase,open:state.open});state.history=state.history.slice(-100);Object.assign(state,change);state.open=0;render(true);window.scrollTo({top:0,behavior:'smooth'});}
let pendingImport=null;
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.deleteList){void deleteSavedList(b.dataset.deleteList);return;}
 if(deletingListId)return;
 if(b.dataset.addUnit&&listEditor){e.preventDefault();Builder.add(listEditor.army,b.dataset.addUnit,'unit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));listEditor.expandedUnitId=listEditor.army.units.at(-1).id;markEditorDirty();render();return;}
 if(b.dataset.removeUnit&&listEditor){e.preventDefault();Builder.remove(listEditor.army,b.dataset.removeUnit);delete listEditor.renames[b.dataset.removeUnit];markEditorDirty();render();return;}
 if(b.dataset.openList){openSavedList(b.dataset.openList);return;}
 if(b.dataset.view){if(state.view==='admin'&&b.dataset.view!=='admin'&&!window.WarPlannerAdminPage?.leave())return;if(b.dataset.view==='admin'&&!window.WarPlannerAdminPage?.canAccess)return;if(b.dataset.view==='army')state.selectedListId=null;state.view=b.dataset.view;render();window.scrollTo(0,0);}
 if(b.dataset.phase!==undefined)transition({phase:Number(b.dataset.phase)});
 if(b.dataset.turn)switchGuideTurn(b.dataset.turn);
 if(b.dataset.first){if(b.dataset.first!==state.firstPlayer&&confirm('Restart the turn sequence with this first player? Your army remains saved.')){state.firstPlayer=b.dataset.first;state.round=1;state.turn=state.firstPlayer;state.phase=0;state.open=0;state.history=[];render();}}
 if(b.dataset.confirmRule){const k=Library.revision+'-'+b.dataset.confirmRule;state.confirmed[k]=!state.confirmed[k];save();b.textContent=state.confirmed[k]?'Undo my confirmation':'I checked this in my rules';}
 if(b.dataset.step!==undefined){const i=Number(b.dataset.step);state.open=i;render(true);}
 if(b.dataset.reveal!==undefined){const k=stepKey(Number(b.dataset.reveal));state.revealed[k]=!state.revealed[k];render();}
 if(b.dataset.complete!==undefined){const i=Number(b.dataset.complete),k=stepKey(i);state.completed[k]=!state.completed[k];if(state.completed[k]&&i<lessons().steps.length-1)state.open=i+1;render();}
 switch(b.dataset.action){
 case 'create-list':beginListEditor(true);break;
 case 'edit-list':beginListEditor();break;
 case 'cancel-list-editor':listEditor=null;render();break;
 case 'retry-list-save':void window.flushWarPlannerLists().catch(()=>{});break;
 case 'reset-guide':showGuideStart(true);break;
 case 'choose-guide-army':showGuideStart();break;
 case 'list-library':state.selectedListId=null;state.showImportedList=false;render();break;
 case 'view-imported-list':state.showImportedList=!state.showImportedList;render();break;
 case 'next':advancePhase();break;
 case 'page-next':navigateGuide(1);break;
 case 'page-previous':navigateGuide(-1);break;
 case 'swap-turn-order':swapGuideOrder();break;
 case 'study-next':state.completed[stepKey(state.open)]=true;if(state.open<lessons().steps.length-1){state.open++;render(true);}else advancePhase();break;
 case 'skip-step':if(state.open<lessons().steps.length-1){state.open++;render(true);}else advancePhase();break;
 case 'step-back':if(state.open>0){state.open--;render(true);}break;
 case 'back':{const previous=state.history.pop();if(previous){Object.assign(state,previous);state.open=previous.open||0;render();window.scrollTo(0,0);}break;}
 case 'round-down':if(state.round>1)transition({round:state.round-1});break;
 case 'round-up':transition({round:state.round+1});break;
 case 'restart':showGuideStart(true);break;
 case 'import':pendingImport=null;$('#import-feedback').innerHTML='';$('#import-form button[type=submit]').innerHTML='Review army <span>→</span>';$('#import-dialog').showModal();break;
 case 'close-import':$('#import-dialog').close();break;
 }
});
document.addEventListener('keydown',event=>{
 const tab=event.target.closest?.('[data-phase]');
 if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();
 const current=Number(tab.dataset.phase);
 const index=event.key==='Home'?0:event.key==='End'?phases.length-1:(current+(event.key==='ArrowRight'?1:-1)+phases.length)%phases.length;
 transition({phase:index});document.querySelector('#phase-tab-'+index)?.focus({preventScroll:true});
});
document.addEventListener('input',e=>{if(listEditor){if(e.target.id==='builder-unit-search'){listEditor.query=e.target.value;$('#builder-search-results').innerHTML=builderSearchResults();}if(e.target.dataset.listField){if(e.target.dataset.listField==='detachmentList')Builder.setDetachments(listEditor.army,e.target.value.split(/\r?\n/));else if(e.target.dataset.listField==='detachment')Builder.setDetachments(listEditor.army,[e.target.value]);else listEditor.army[e.target.dataset.listField]=e.target.value;markEditorDirty();}if(e.target.dataset.unitField==='label'){listEditor.renames[e.target.dataset.editorUnit]=e.target.value;markEditorDirty();}if(e.target.dataset.unitField==='details'){const unit=listEditor.army.units.find(u=>u.id===e.target.dataset.editorUnit);if(unit){const hasToken=Builder.info(unit.name,listEditor.army.faction)?.abilities.some(a=>a.id==='aspect-shrine-token-aeldari');const controlled=unit.details.filter(d=>/^Enhancement\s*:/i.test(d)||(hasToken&&/aspect shrine token/i.test(d)));unit.details=[...e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),...controlled];markEditorDirty();}}}if(e.target.id==='unit-search'){const q=e.target.value.toLowerCase();document.querySelectorAll('.unit-card').forEach(c=>c.hidden=!c.dataset.unitName.includes(q)&&!c.querySelector('h3').textContent.toLowerCase().includes(q));}if(e.target.id==='army-text'){pendingImport=null;$('#import-feedback').innerHTML='';$('#import-form button[type=submit]').innerHTML='Review army <span>→</span>';}});
document.addEventListener('change',e=>{if(listEditor){try{if(e.target.dataset.editorDetachment){const names=Builder.selectedDetachments(listEditor.army).filter(name=>name.toLowerCase().replace(/[^a-z0-9]/g,'')!==e.target.dataset.editorDetachment.toLowerCase().replace(/[^a-z0-9]/g,''));if(e.target.checked)names.push(e.target.dataset.editorDetachment);Builder.setDetachments(listEditor.army,names);markEditorDirty();render();}if(e.target.dataset.listField){if(e.target.dataset.listField==='detachmentList')Builder.setDetachments(listEditor.army,e.target.value.split(/\r?\n/));else if(e.target.dataset.listField==='detachment')Builder.setDetachments(listEditor.army,[e.target.value]);else listEditor.army[e.target.dataset.listField]=e.target.value;markEditorDirty();if(e.target.dataset.listField==='faction'){Builder.setDetachments(listEditor.army,[]);listEditor.army.disposition='';listEditor.query='';render();}if(e.target.dataset.listField==='detachment')render();}if(e.target.dataset.editorUnit){const id=e.target.dataset.editorUnit,unit=listEditor.army.units.find(u=>u.id===id);if(unit){const field=e.target.dataset.unitField;if(field==='attachment')Builder.attach(listEditor.army,id,e.target.value);if(field==='enhancement')Builder.setEnhancement(listEditor.army,id,e.target.value);if(field==='tokens')Builder.setTokens(unit,Number(e.target.value));if(field==='modelCount'){if(e.target.value)unit.modelCount=Number(e.target.value);else delete unit.modelCount;}markEditorDirty();if(['attachment','enhancement','tokens'].includes(field)){listEditor.expandedUnitId=id;render();}}}}catch(error){listEditor.error=error.message;$('#builder-error').textContent=error.message;}}if(e.target.id==='guide-show-previews'){state.guideShowPreviews=e.target.checked;save();const guide=$('.guide-carousel');if(guide)guide.dataset.showPreviews=String(state.guideShowPreviews);refreshUnitPreviews();}if(e.target.id==='guide-font-size'&&['small','medium','large'].includes(e.target.value)){state.guideFontSize=e.target.value;save();const guide=$('.guide-carousel');if(guide)guide.dataset.fontSize=state.guideFontSize;refreshUnitPreviews();}if(e.target.id==='guide-army-list'){state.setupListId=e.target.value;save();}if(e.target.id==='guide-first-player'){state.setupFirstPlayer=e.target.value;save();}if(e.target.dataset.rename){const value=e.target.value.trim();if(value){state.renames[e.target.dataset.rename]=value;save();e.target.closest('.unit-card').querySelector('h3').textContent=value;}else e.target.value=unitName(state.army.units.find(u=>u.id===e.target.dataset.rename));}});
document.addEventListener('submit',e=>{if(e.target.id==='list-editor-form'){e.preventDefault();saveListEditor();return;}if(e.target.id==='guide-start-form'){e.preventDefault();startGuide();}});
$('#import-form').addEventListener('submit',e=>{e.preventDefault();if(pendingImport){syncActiveList();const id='list-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);state.savedLists.push({id,army:pendingImport.army,warnings:pendingImport.warnings,renames:{}});state.guideStarted=false;state.setupListId=id;state.activeListId=id;state.selectedListId=id;state.showImportedList=false;state.army=pendingImport.army;state.warnings=pendingImport.warnings;state.renames={};state.completed={};state.revealed={};state.history=[];state.phase=0;state.round=1;state.turn=state.firstPlayer;state.open=0;state.view='army';$('#import-dialog').close();pendingImport=null;render();toast(cloudLists?'Saving your list to your account…':'Army saved. Review your units before studying.');return;}try{pendingImport=parseArmy($('#army-text').value);$('#import-feedback').innerHTML=`<div class="banner" style="margin:15px 0 0">${pendingImport.army.units.length} entries found<br>${pendingImport.warnings.map(escapeHTML).join('<br>')}</div><div class="review-list">${pendingImport.army.units.map(u=>`<div class="review-row"><span>${escapeHTML(u.name)}${u.group?' · group '+escapeHTML(u.group):''}</span><span>${escapeHTML(u.role||'Unit')}</span></div>`).join('')}</div>`;$('#import-form button[type=submit]').innerHTML='Use this army <span>→</span>';}catch(error){$('#import-feedback').textContent=error.message;}});
render();

window.setWarPlannerAccount=(user,library,service=null,idMap={},contentService=null)=>{
 deletingListId=null;listDeleteError='';
 window.WarPlannerAdminPage?.setService(contentService);
 listEditor=null;
 cloudLists?.dispose();cloudLists=null;
 loadAccountState('warplanner.account.'+user.id+'.v1',Array.isArray(library)?EMPTY_ARMY:library||EMPTY_ARMY);
 if(Array.isArray(library)){
  const priorId=idMap[state.activeListId]||state.activeListId,priorArmy=JSON.stringify(state.army);
  state.savedLists=library;
  state.selectedListId=idMap[state.selectedListId]||state.selectedListId;state.setupListId=idMap[state.setupListId]||state.setupListId;
  const active=library.find(l=>l.id===priorId)||library[0];state.activeListId=active?.id;
  state.army=structuredClone(active?.army||EMPTY_ARMY);state.renames={...(active?.renames||{})};state.warnings=[...(active?.warnings||[])];
  if(!library.some(l=>l.id===state.selectedListId))state.selectedListId=null;
  if(priorId!==state.activeListId||priorArmy!==JSON.stringify(state.army)){state.guideStarted=false;state.phase=0;state.open=0;state.round=1;state.history=[];state.completed={};}
  normalizeLists();
 }
 cloudLists=service;cloudStatus=service?'saved':'loading';
 pendingImport=null;$('#import-dialog').close();$('#army-text').value='';$('#import-feedback').innerHTML='';
 if(!state.army.units.length)state.view='army';
 render();
};
window.clearWarPlannerAccount=()=>{
 deletingListId=null;listDeleteError='';
 window.WarPlannerAdminPage?.setService(null);
 listEditor=null;
 cloudLists?.dispose();cloudLists=null;cloudStatus='loading';
 KEY=null;state=initialState(EMPTY_ARMY);pendingImport=null;
 $('#import-dialog').close();$('#army-text').value='';$('#import-feedback').innerHTML='';render();
};

window.refreshWarPlannerContent=()=>render();
