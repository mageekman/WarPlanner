'use strict';
const {phases,sample,parseArmy,next}=WarPlan;
let KEY=null;
let cloudLists=null,cloudStatus='loading',deletingListId=null,listDeleteError='';
const EMPTY_ARMY={name:'No army imported',faction:'',detachment:'',points:0,limit:2000,version:'',units:[]};
const Library=WarPlanLessons;
const Activations=WarPlanActivations;
const Builder=WarPlannerListBuilder;
let listEditor=null,pageNavigation=null,ruleReportRequested=false,guideSettingsDraft=null,setupGuideSettingsPrevious=null;
const Dispositions=window.WarPlannerDispositions;
const PageNavigation=window.WarPlannerNavigation;
const initialState=army=>({view:'guide',sidebarCollapsed:false,guideStarted:false,guideMode:'quick',guideFontSize:'medium',guideShowPreviews:true,guideShowCoreStratagems:false,guideShowDeepStrike:true,guideRuleEditing:false,guideSkipEmptySteps:false,guideOverviewOpen:false,guideAnyTimeOpen:false,guideRuleTypes:{},guideDisposition:{enabled:false,opponent:''},army:structuredClone(army),round:1,turn:'you',phase:0,open:0,completed:{},revealed:{},history:[],renames:{},warnings:[],firstPlayer:'you',confirmed:{},reviewedReminders:{},flowRevision:'flashcards-v1'});
let state=initialState(window.WARPLANNER_CONFIG?EMPTY_ARMY:sample);
let storageOK=true,libraryDirty=true,rosterRefs=null,storageRevision=0,savedProgress=null,savedLibrary=null;
function normalizeLists(){
 if(!Array.isArray(state.savedLists))state.savedLists=state.army.units.length?[{id:'list-1',army:structuredClone(state.army),warnings:state.warnings||[],renames:state.renames||{}}]:[];
 if(!state.activeListId&&state.savedLists.length)state.activeListId=state.savedLists[0].id;
 if(!state.savedLists.some(list=>list.id===state.setupListId))state.setupListId=state.activeListId;
 for(const list of state.savedLists)if(!list.army.disposition&&list.army.units[0]?.id.startsWith('sample'))list.army.disposition='Priority Assets';
 if(!state.army.disposition&&state.army.units[0]?.id.startsWith('sample'))state.army.disposition='Priority Assets';
}
function syncActiveList(){libraryDirty=true;const list=state.savedLists?.find(l=>l.id===state.activeListId);if(list){list.army=structuredClone(state.army);list.renames={...state.renames};list.warnings=[...state.warnings];}}
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
function loadAccountState(key,army){guideSettingsDraft=null;setupGuideSettingsPrevious=null;ruleReportRequested=false;KEY=key;state=initialState(army);storageOK=true;libraryDirty=true;rosterRefs=null;storageRevision=0;savedProgress=null;savedLibrary=null;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.army?.units)&&Number.isInteger(saved.phase)&&saved.phase>=0&&saved.phase<5){storageRevision=typeof saved._storageRevision==='string'||Number.isInteger(saved._storageRevision)?saved._storageRevision:0;
 let progress;try{progress=JSON.parse(localStorage.getItem(KEY+'.progress.v1'));}catch{storageOK=false;}
 const overlay=progress?.format===1&&progress.revision===storageRevision&&progress.state&&typeof progress.state==='object'&&!Array.isArray(progress.state)&&Number.isInteger(progress.state.phase)&&progress.state.phase>=0&&progress.state.phase<5?progressState(progress.state):{};
 state={...state,...saved,...overlay};delete state._storageRevision;state.view=['guide','army','overview','practice','account'].includes(state.view)?state.view:'guide';state.guideMode=state.guideMode==='learn'?'learn':'quick';state.sidebarCollapsed=state.sidebarCollapsed===true;state.round=Math.max(1,Number(state.round)||1);state.turn=state.turn==='opponent'?'opponent':'you';state.firstPlayer=state.firstPlayer==='opponent'?'opponent':'you';state.confirmed=state.confirmed||{};delete state.activationSelections;delete state.activationReviewed;if(!['unit-activations-v1','flashcards-v1'].includes(saved.flowRevision)){state.open=0;state.history=[];}state.flowRevision='flashcards-v1';}}catch{storageOK=false;}
normalizeLists();
}
if(!window.WARPLANNER_CONFIG)loadAccountState('warplan.prototype.v1',sample);

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Roster snapshots retain the legacy key so existing local armies need no destructive migration.
// Progress is small, immediate, and tied to a snapshot revision to survive interrupted writes.
function progressState(value){const {army,savedLists,renames,warnings,_storageRevision,...progress}=value;return progress;}
function currentRosterRefs(){return [KEY,state.activeListId,state.army,state.renames,state.warnings,state.savedLists];}
function persistStateCache(){
 if(!KEY)return false;
 libraryDirty=true;
 try{const revision=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);localStorage.setItem(KEY,JSON.stringify({...state,_storageRevision:revision}));storageRevision=revision;savedProgress=null;return true;}catch{storageOK=false;return false;}
}
function save(){
 if(!KEY)return;
 const refs=currentRosterRefs();
 if(!rosterRefs||refs.some((value,i)=>value!==rosterRefs[i])){syncActiveList();rosterRefs=refs;}
 let canSaveProgress=true;
 if(libraryDirty){
  canSaveProgress=persistStateCache();
  const library=JSON.stringify(state.savedLists||[]);
  if(library!==savedLibrary){savedLibrary=library;cloudLists?.schedule(state.savedLists||[]);}
  if(canSaveProgress)libraryDirty=false;
 }
 if(canSaveProgress)try{
  const progress=JSON.stringify({format:1,revision:storageRevision,state:progressState(state)});
  if(progress!==savedProgress){localStorage.setItem(KEY+'.progress.v1',progress);savedProgress=progress;}
 }catch{storageOK=false;}
}
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
let unitPreviewSizes=new WeakMap();
function fitUnitPreviews(elements){
 const pending=[];
 for(const element of elements){const full=element.dataset.fullPreview,width=element.clientWidth;if(!full||width<=0)continue;const style=getComputedStyle(element),signature=JSON.stringify([full,width,style.font,style.lineHeight]),previous=unitPreviewSizes.get(element);if(previous?.signature===signature&&previous.text===element.textContent&&previous.height===element.scrollHeight)continue;pending.push({element,full,signature,lineHeight:Number.parseFloat(style.lineHeight)});}
 // Batch writes and measurements so each preview does not force its own layout.
 for(const row of pending)row.element.textContent=row.full;
 const fitted=pending.map(row=>({...row,text:Number.isFinite(row.lineHeight)&&row.element.scrollHeight>row.lineHeight*2+1?'Multiple Units':row.full}));
 for(const row of fitted)if(row.text!==row.full)row.element.textContent=row.text;
 for(const row of fitted)unitPreviewSizes.set(row.element,{signature:row.signature,text:row.text,height:row.element.scrollHeight});
}
function fitUnitPreview(element){fitUnitPreviews([element]);}
const unitPreviewObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>fitUnitPreviews(entries.map(entry=>entry.target))):null;
function refreshUnitPreviews(){
 if(!document.querySelectorAll)return;
 unitPreviewObserver?.disconnect();
 const elements=[...document.querySelectorAll('[data-unit-preview]')];fitUnitPreviews(elements);
 for(const element of elements)unitPreviewObserver?.observe(element);
}
window.addEventListener?.('resize',refreshUnitPreviews);
function fontsReady(){unitPreviewSizes=new WeakMap();refreshUnitPreviews();}
document.fonts?.ready?.then(fontsReady);
document.fonts?.addEventListener?.('loadingdone',fontsReady);
function navIcon(name){
 const shapes={
  overview:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
  guide:'<path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3ZM9 3v15m6-12v15"/>',
  army:'<path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>',
  practice:'<circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><circle cx="11" cy="13" r="1"/><path d="m11 13 10-10m-5 0h5v5"/>',
  admin:'<path d="M14 6a5 5 0 0 0-6 6l-5 5a2 2 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z"/>',
  account:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5 18c1-5 13-5 14 0"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8C12.5 11.5 12 12 12 13.5m0 3h.01"/>',
  feedback:'<path d="M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-5 4V4a1 1 0 0 1 1-1Z"/><path d="M7 8h10M7 12h7"/>',
  signout:'<path d="M9 4H4v16h5m0-8h12m-4-4 4 4-4 4"/>'
 };
 return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shapes[name]||shapes.help}</svg>`;
}
function render(focusLesson=false){const detPicker=$('#builder-detachment-picker');if(listEditor&&detPicker)listEditor.detachmentPickerOpen=detPicker.open;cancelGuideMotion();if(state.view==='admin'&&!window.WarPlannerAdminPage?.canAccess)state.view='guide';pageNavigation?.sync();save();const nav=[['overview','Study home'],['guide','Guided play'],['army','My army'],['practice','Practice'],...(window.WarPlannerAdminPage?.canAccess?[['admin','Rules workshop']]:[])];$('#app').innerHTML=`<div class="shell${state.sidebarCollapsed?' nav-collapsed':''}"><aside class="sidebar"><button type="button" class="sidebar-toggle" data-action="toggle-nav" aria-controls="site-navigation" aria-expanded="${!state.sidebarCollapsed}" aria-label="${state.sidebarCollapsed?'Expand navigation':'Collapse navigation'}" title="${state.sidebarCollapsed?'Expand navigation':'Collapse navigation'}">${state.sidebarCollapsed?'›':'‹'}</button><div class="brand"><img class="brand-logo" src="WPlogowhtol.png" width="1268" height="1241" alt=""><span class="brand-text">WARPLANNER</span></div><div class="tagline">KNOW YOUR NEXT MOVE.</div><div class="nav-label">YOUR FIELD GUIDE</div><nav id="site-navigation" class="nav" aria-label="Main navigation">${nav.map(([id,label])=>`<a href="${PageNavigation?.href(id)||'#'}" data-view="${id}" aria-label="${label}" title="${label}" class="${state.view===id?'active':''}" ${state.view===id?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${navIcon(id)}</span><span class="nav-text">${label}</span>${id==='admin'?window.WarPlannerReports?.badgeHTML()||'':''}</a>`).join('')}<span class="nav-settings-label">SETTINGS</span><a href="${PageNavigation?.href('account')||'#/account'}" data-view="account" aria-label="My Account" title="My Account" class="${state.view==='account'?'active':''}" ${state.view==='account'?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${navIcon('account')}</span><span class="nav-text">My Account</span></a><button type="button" data-action="open-onboarding" aria-label="Getting started" title="Getting started"><span class="nav-icon" aria-hidden="true">${navIcon('help')}</span><span class="nav-text">Getting started</span></button><button type="button" data-open-feedback aria-haspopup="dialog" aria-label="Send feedback" title="Send feedback"><span class="nav-icon" aria-hidden="true">${navIcon('feedback')}</span><span class="nav-text">Send feedback</span></button><button type="button" data-auth-signout aria-label="Sign out" title="Sign out"><span class="nav-icon" aria-hidden="true">${navIcon('signout')}</span><span class="nav-text">Sign out</span></button></nav><div class="sidebar-bottom"><div class="private">◈ &nbsp; A personal study companion<br>Made for the way you learn.</div><div class="profile"><div class="avatar">WP</div><div><strong>Your study space</strong><small>Personal study · v0.28.5</small></div></div></div></aside><main><div id="list-sync-banner" class="list-sync-banner" ${cloudStatus==='error'?'':'hidden'} role="status"><span>Your lists have not saved to your account yet. Keep this page open and retry.</span><button type="button" data-action="retry-list-save">Retry</button></div>${state.view==='guide'?'':`<div class="topbar"><span>YOUR STUDY SPACE &nbsp; / &nbsp; <strong>${state.view==='guide'?'Guided play':state.view==='army'?'My army':state.view==='practice'?'Practice':state.view==='admin'?'Rules workshop':state.view==='account'?'My Account':'Study home'}</strong></span><span class="top-status"><span class="dot"></span><span data-list-sync-status>${listSaveStatus()}</span></span></div>`}${state.view==='account'?(window.WarPlannerAccount?.render()||'<h1>My Account</h1>'):state.view==='admin'?window.WarPlannerAdminPage.render():state.view==='guide'?guide():state.view==='army'?armyView():state.view==='practice'?practiceView():overview()}<div id="guide-rule-editor-container">${window.WarPlannerAdminPage?.renderGuideEditor?.()||''}</div></main></div>`;syncGuideReviews(document);refreshUnitPreviews();updateCloudUI();if(focusLesson)document.querySelector('#lesson-title')?.focus({preventScroll:true});queueGuideWarm();openRequestedRuleReport();}
function openRequestedRuleReport(){
 if(!ruleReportRequested||state.view!=='guide'||!state.guideStarted)return;
 const panel=document.querySelector('[data-report-details]');if(!panel)return;
 ruleReportRequested=false;
 for(let parent=panel;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 requestAnimationFrame(()=>{if(!panel.isConnected)return;panel.scrollIntoView?.({block:'center'});panel.querySelector('select')?.focus({preventScroll:true});});
}
function armyStrip(){return `<div class="army-strip"><div class="army-sigil" aria-hidden="true">⋈</div><div><h3>${escapeHTML(state.army.faction)} <span class="muted">/</span> ${escapeHTML(Library.armyDetachments(state.army).join(' · '))}</h3><p>${state.army.units.length} units · ${escapeHTML(state.army.disposition||'Disposition not provided')}</p></div><div class="strip-right"><span class="pill">${!state.army.units.length?'No army imported':state.army.units[0]?.id.startsWith('sample')?'Saved roster':'Imported roster'}</span><button class="text-button" data-view="army">View army ↗</button></div></div>`;}
function referenceDetails(item){
 const confirmation=state.confirmed[Library.revision+'-'+item.id];
 return `<details class="reference-details"><summary>Rules reference & review</summary><div class="reference-content"><p>${item.status==='admin-reviewed'?'Maintained in the WarPlanner rules workshop.':item.status==='official-checked'?'Compared with the linked official text.':item.status==='source-reference'?'Structured community source. Confirm the complete rule in your current app or book; this is not official verification.':'Compared with community references; confirm against your current app or book.'} ${confirmation?'You also marked this checked on this device.':''}</p>${item.section?`<p>Section ${escapeHTML(item.section)}</p>`:''}${item.sourceUrl&&/^https?:\/\//i.test(item.sourceUrl)?`<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.sourceLabel||'Admin reference')} ↗</a>`:''}${item.sourceIds.map(id=>{const src=Library.sources[id];if(!src)return '';return `<a href="${escapeHTML(/^https?:\/\//i.test(src.url)?src.url:'#')}" target="_blank" rel="noopener noreferrer">${escapeHTML(src.name)} ↗</a><small>${escapeHTML(src.version)}</small>`;}).join('')}${item.status!=='official-checked'?`<button class="text-button" data-confirm-rule="${item.id}">${confirmation?'Undo my confirmation':'I checked this in my rules'}</button>`:''}</div></details>`;
}
function categoryBadge(item){return `<span class="rule-badge rule-${item.category}">${escapeHTML(Library.categories[item.category]||'Ability')}</span>${item.referenceOnly?'<span class="rule-badge reference-only">Reference only</span>':item.status==='source-reference'?'<span class="rule-badge reference-only">Source summary</span>':''}`;}
function abilityCard(a){
 const instances=a.targetUnits||state.army.units.filter(u=>a.units.some(n=>n.toLowerCase()===u.name.toLowerCase()));
 const targets=instances.length?instances.map(unitName).join(' · '):a.detachment||'Army / detachment reminder';
 return `<details class="ability-card${a.sequencePreview?' sequence-priority':''} rule-${a.category}"><summary><span>${categoryBadge(a)}${a.sequencePreview?'<span class="sequence-label">PLAN NOW · RESOLVE AFTER SHOOTING</span>':''}<strong>${escapeHTML(a.sequencePreview?a.sequence.title:a.name)}</strong><small>${escapeHTML(targets)}</small></span><span class="ability-plus" aria-hidden="true">+</span></summary><div class="ability-body">${a.sequencePreview?`<p class="sequence-advice">${escapeHTML(a.sequence.advice)}</p><p class="sequence-rule-name">Ability: ${escapeHTML(a.name)}</p>`:''}<p>${escapeHTML(a.summary)}</p><ul>${a.conditions.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ul><details class="think-details"><summary>Quick question</summary><p class="question">${escapeHTML(a.question)}</p><p>${escapeHTML(a.answer)}</p></details>${referenceDetails(a)}</div></details>`;
}
function activationLabel(unit){return unit.body?.name||unit.members[0]?.name||'';}
function flashDetails(items){return `<details class="flash-details"><summary>Conditions & sources</summary>${items.map(a=>`<section><h4>${escapeHTML(a.name)}</h4>${a.detachment&&Library.armyDetachments(state.army).length>1?`<p class="flash-timing">${escapeHTML(a.detachment)}</p>`:''}<ul>${a.conditions.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ul>${a.mechanicsDetails?`<details class="mechanics-source-details"><summary>Imported mechanics details</summary><p>${escapeHTML(a.mechanicsDetails)}</p></details>`:''}${referenceDetails(a)}</section>`).join('')}</details>`;}
function guideHintBadges(meta){return `${meta?.label?`<span class="flash-priority${meta.order==='late'?' flash-late':''}">${escapeHTML(meta.label)} ${meta.order==='late'?'↘':'↗'}</span>`:''}${(meta?.flags||[]).map(label=>`<span class="flash-guide-flag">${escapeHTML(label)}</span>`).join('')}`;}
function guideHintNotes(meta){return [...new Set(meta?.notes||[meta?.note].filter(Boolean))].map(note=>`<p class="flash-order">${escapeHTML(note)}</p>`).join('');}
const guideSession=Activations.createSession();
function guideDeck(active){return guideSession.stepDeck(state,active);}
// Review marks are personal reading aids, never ability-use or eligibility state.
function reminderPrefix(current=state){return JSON.stringify([current.activeListId||'',current.army.faction,current.round,current.turn,current.phase])+':';}
function reminderKey(id){return reminderPrefix()+id;}
function guideRuleEditingEnabled(){return !!window.WarPlannerAdminPage?.canAccess&&state.guideRuleEditing===true;}
function reviewReminder(id,title,html,rules=[]){
 const key=reminderKey(id),checked=state.reviewedReminders?.[key]===true,category=html.match(/\brule-([a-z-]+)/)?.[0]||'rule-ability';
 const editRules=rules.map(a=>Object.fromEntries(['id','sourceRuleId','sourceCatalogKey'].filter(k=>a[k]).map(k=>[k,a[k]])));
 const control=guideRuleEditingEnabled()&&rules.length?`<button type="button" class="guide-rule-edit" data-guide-edit="${escapeHTML(JSON.stringify(editRules))}" aria-label="Edit rules for ${escapeHTML(title)}" title="Edit rules"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/></svg></button>`:`<label class="reminder-review"><input type="checkbox" data-review-id="${escapeHTML(id)}" data-review-reminder="${escapeHTML(key)}" ${checked?'checked':''} aria-label="Reviewed: ${escapeHTML(title)}"></label>`;
 return `<section class="flash-card reminder-item ${category}${checked?' reminder-reviewed':''}">${html}${control}</section>`;
}
function syncGuideReviews(container,current=state){
 for(const input of container?.querySelectorAll?.('[data-review-id]')||[]){
  const key=reminderPrefix(current)+input.dataset.reviewId;
  input.dataset.reviewReminder=key;input.checked=current.reviewedReminders?.[key]===true;
  input.closest('.reminder-item')?.classList.toggle('reminder-reviewed',input.checked);
 }
}
function anyTimeGuideHTML(deck=guideSession.anyTime(state)){
 const count=overviewRuleCount(deck);
 return `<details id="guide-anytime" class="guide-anytime"><summary><span>Any time</span><span class="anytime-count">${count} ${count===1?'rule':'rules'} <span class="anytime-caret" aria-hidden="true">⌄</span></span></summary><div class="guide-anytime-content"><p class="guide-anytime-note">Available throughout this phase. Check each rule’s trigger, eligible units and conditions before using it.</p>${deck.count?flashBoard({id:'guide-any-time',window:'act'},deck):'<p class="ability-empty">No phase-wide rules are listed for this phase and turn.</p>'}</div></details>`;
}
function flashBoard(active,deck=guideDeck(active)){
 const reviewScope=active.id==='guide-any-time'?'anytime:':'';
 if(!deck.count)return `<section class="army-lessons" aria-label="Your army at this step"><p class="ability-empty">${state.guideMode==='learn'?'No army-specific rules to add here. Carry on with the steps above.':active.id!=='guide-any-time'&&guideSession.anyTime(state).count?'No step-specific rules here. Phase-wide reminders are under Any time.':'No matching army abilities are listed for this step. Open ⓘ for the core sequence.'}</p></section>`;
 const sharedNames=new Map(deck.shared.map(a=>[a.key,a.name]));
 const userLabel=(_a,u)=>activationLabel(u);
 const sharedCards=deck.shared.map(a=>{
  const target=Activations.targeting(a,state);
  const users=a.appliesTo.map(u=>userLabel(a,u));
  const preview=target?target.label+': '+target.text:users.join(' · ');
  return reviewReminder(reviewScope+'shared:'+a.key,a.name,`<details class="flash-card collapsible-flash rule-${a.category}" data-shared-rule="${escapeHTML(a.id)}"><summary class="flash-summary"><span class="flash-title-row"><h3>${escapeHTML(a.name)}</h3>${categoryBadge(a)}${guideHintBadges(a.guideMeta)}</span><p class="flash-preview">${escapeHTML(preview)}</p><span class="flash-chevron" aria-hidden="true">+</span></summary><div class="flash-expanded"><p class="flash-timing">${escapeHTML(a.timing)}</p><p class="flash-fact">${escapeHTML(a.summary)}</p>${guideHintNotes(a.guideMeta)}${target?`<div class="flash-expanded-target"><span>${target.label}</span><p>${escapeHTML(target.text)}</p></div>`:`<div class="flash-unit-list"><span>Units that can use this rule, subject to its conditions</span><ul>${users.map(name=>`<li>${escapeHTML(name)}</li>`).join('')}</ul></div>`}${a.promoted?'<p class="flash-applies">Each listed unit keeps its own equipment, conditions, and usage limits.</p>':''}${flashDetails([a])}</div></details>`,[a]);
 }).join('');
 const unitCards=deck.unitCards.map(card=>{
  const title=card.unit.body.name;
  const first=card.fightsFirst,allied=Library.unitInfo(card.unit.body,state.army.faction);
  const ruleNames=[...new Set([...(first?['Fights First']:[]),...card.guideMeta.flags,...(card.guideMeta.label?[card.guideMeta.label]:[]),...card.items.map(a=>a.name),...card.sharedIds.map(id=>sharedNames.get(id)).filter(Boolean)])];
  return reviewReminder(reviewScope+'unit:'+card.unit.id,title,window.WarPlannerStudyCards.unitCard({id:card.unit.id,title,preview:ruleNames.join(' · '),badges:`${allied?.allied?'<span class="rule-badge reference-only">'+escapeHTML(allied.originFaction)+' ally</span>':''}${first?'<span class="flash-fights-first">Fights First</span>':''}${guideHintBadges(card.guideMeta)}`,body:`${guideHintNotes(card.guideMeta)}${card.items.map(a=>`<div class="flash-rule"><div>${categoryBadge(a)}${guideHintBadges(a.guideMeta)}<h4>${escapeHTML(a.name)}</h4></div><p class="flash-timing">${escapeHTML(a.timing)}</p><p class="flash-fact">${escapeHTML(a.summary)}</p></div>`).join('')}${card.sharedIds.length?`<p class="flash-shared-links">Shared options above: ${escapeHTML(card.sharedIds.map(id=>sharedNames.get(id)).filter(Boolean).join(' · '))}</p>`:''}${card.items.length?flashDetails(card.items):''}`}),[...card.items,...deck.shared.filter(a=>card.sharedIds.includes(a.key))]);
 }).join('');
 const coreHelp=active.coreHelp||[];
 return `<section class="army-lessons flash-board" aria-label="Your army at this ${active.activationMode?'phase':'step'}">${sharedCards?`<div class="flash-grid shared-flash-grid">${sharedCards}</div>`:''}${unitCards?`<div class="flash-grid unit-flash-grid">${unitCards}</div>`:''}</section>${coreHelp.length?`<details class="think-details"><summary>Core help for this phase</summary>${coreHelp.map(s=>`<h3 class="activation-help-title">${escapeHTML(s.title)}</h3><p>${escapeHTML(s.body)}</p>`).join('')}</details>`:''}`;
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
 if(/^(space marines|adeptus astartes)$/.test(name))return 'Space Marines';
 if(/chaos|daemon|death guard|thousand sons|world eaters|emperors children/.test(name))return 'Chaos';
 if(/aeldari|eldar|drukhari|ynnari|harlequin|necron|ork|tyranid|genestealer|tau|t’au|votann/.test(name))return 'Xenos';
 if(/imperium|imperial|astra militarum|adepta|adeptus|space marine|blood angel|dark angel|space wolve|black templar|deathwatch|grey knight|salamander|raven guard|iron hand|white scar|ultramarine|crimson fist|flesh tearer|agent|inquisition|sister/.test(name))return 'Imperium';
 return 'Other';
}
function savedListLibrary(lists){
 const compare=(a,b)=>String(a||'').localeCompare(String(b||''),undefined,{sensitivity:'base',numeric:true});
 return ['Space Marines','Imperium','Chaos','Xenos','Other'].map(group=>{
  const members=lists.filter(list=>armyAlliance(list.army.faction)===group).sort((a,b)=>compare(a.army.name,b.army.name)||compare(a.army.faction,b.army.faction)||compare(a.id,b.id));
  if(!members.length)return '';
  return `<section class="saved-list-group" aria-label="${group}" data-army-group="${group}"><h2>${group}<span>${members.length} ${members.length===1?'list':'lists'}</span></h2><div class="saved-lists">${members.map(list=>`<article class="saved-list-entry"><button class="saved-list-card" data-open-list="${escapeHTML(list.id)}"><span class="saved-list-heading"><strong>${escapeHTML(list.army.name)}</strong><span aria-hidden="true">→</span></span>${listMetadata(list.army)}</button><div class="saved-list-actions">${list.id===state.activeListId?'<span class="pill">Active in guide</span>':''}<button type="button" class="text-button delete-list-button" data-delete-list="${escapeHTML(list.id)}" aria-label="Delete ${escapeHTML(list.army.name)}" ${deletingListId?'disabled':''}>${deletingListId===list.id?'Deleting…':'Delete'}</button></div></article>`).join('')}</div></section>`;
 }).join('');
}
function dispositionSetup(chosen){
 const list=(state.savedLists||[]).find(list=>list.id===chosen),own=Dispositions.resolve(list?.army.disposition),enabled=state.setupAddDisposition===true;
 const mission=enabled?Dispositions.matchup(own,state.setupOpponentDisposition):null;
 return `<label class="guide-disposition-toggle"><input id="guide-add-disposition" type="checkbox" ${enabled?'checked':''}>Add Disposition actions</label>${enabled?`<div class="guide-disposition-setup"><p>Your disposition: <strong>${escapeHTML(own||list?.army.disposition||'Not provided')}</strong></p>${!own?'<p class="guide-setup-error" role="status">Set a recognized disposition for this list in My army before adding disposition actions.</p>':''}<label for="guide-opponent-disposition">Opponent's Disposition?</label><select id="guide-opponent-disposition" required><option value="">Choose opponent’s disposition</option>${Dispositions.names.map(name=>`<option value="${escapeHTML(name)}" ${name===state.setupOpponentDisposition?'selected':''}>${escapeHTML(name)}</option>`).join('')}</select>${mission?`<p class="guide-mission-preview" role="status">Your primary mission: <strong>${escapeHTML(mission.name)}</strong></p>`:''}<p class="muted">Mission Deck 2026–27 standard matchup. Check any twist that changes primary missions. No score or game-state tracking required.</p></div>`:''}`;
}
function guideStartPage(){
 const lists=state.savedLists||[],chosen=state.setupListId||state.activeListId,mode=(state.setupGuideMode||state.guideMode)==='learn'?'learn':'quick';
 const groups=['Space Marines','Imperium','Chaos','Xenos','Other'].map(group=>{
  const members=lists.filter(list=>armyAlliance(list.army.faction)===group).sort((a,b)=>(a.army.faction||'').localeCompare(b.army.faction||'',undefined,{sensitivity:'base'})||a.army.name.localeCompare(b.army.name,undefined,{sensitivity:'base'}));
  return members.length?`<optgroup label="${group}">${members.map(list=>`<option value="${escapeHTML(list.id)}" ${list.id===chosen?'selected':''}>${escapeHTML(list.army.faction||'Unclassified')} — ${escapeHTML(list.army.name)}</option>`).join('')}</optgroup>`:'';
 }).join('');
 const first=state.setupFirstPlayer||state.firstPlayer;
 return `<section class="guide-carousel guide-start-shell" aria-label="Guide setup"><div class="guide-frame"><div class="guide-start-page"><div class="eyebrow">YOUR NEXT GAME</div><h1>Start your guide</h1>${ruleReportRequested?'<p class="practice-note">Choose a list and start the Guide to open the rule-report form. Find the relevant rule’s phase and step to report it.</p>':''}<form id="guide-start-form"><fieldset class="guide-mode-picker"><legend>Guide mode</legend><label><input type="radio" name="guideMode" value="quick" data-guide-mode ${mode==='quick'?'checked':''}><span>Quick guide<small>Compact army reminders for use during a game.</small></span></label><label><input type="radio" name="guideMode" value="learn" data-guide-mode ${mode==='learn'?'checked':''}><span>Learn to play<small>Core rules, smaller steps and explanations alongside your army.</small></span></label></fieldset><label for="guide-army-list">Army list</label><select id="guide-army-list" data-guide-list required ${lists.length?'':'disabled'}>${groups||(mode==='learn'?'<option value="">Core rules only — no army imported</option>':'<option value="">Import a list to get started</option>')}</select><label for="guide-first-player">Who goes first?</label><select id="guide-first-player" data-guide-first><option value="you" ${first==='you'?'selected':''}>You</option><option value="opponent" ${first==='opponent'?'selected':''}>Your opponent</option></select>${dispositionSetup(chosen)}<div class="guide-start-actions"><button class="primary guide-start-button" type="submit" ${lists.length||mode==='learn'?'':'disabled'}>Start <span aria-hidden="true">→</span></button><button id="guide-open-settings" type="button" class="outline guide-setup-settings-button" data-action="open-setup-settings"><span aria-hidden="true">⚙</span> Settings</button></div></form>${lists.length?'':'<button class="text-button" data-action="import">Import an army list</button>'}${guideCoverage()}</div></div>${guideSetupSettingsDialog()}</section>`;
}
function showGuideStart(reset=false){
 state.guideStarted=false;state.setupListId=state.activeListId;state.setupFirstPlayer=state.firstPlayer;state.setupGuideMode=state.guideMode;state.view='guide';
 if(reset)Object.assign(state,{reviewedReminders:{},round:1,turn:state.firstPlayer,phase:0,open:0,completed:{},revealed:{},history:[]});
 render();
}
function startGuide(){
 guidePrepared=null;guideSession.reset();
 const mode=(state.setupGuideMode||state.guideMode)==='learn'?'learn':'quick';
 const selected=state.savedLists?.find(list=>list.id===(state.setupListId||state.activeListId))||(mode==='learn'&&!state.savedLists?.length?{id:undefined,army:EMPTY_ARMY,renames:{},warnings:[]}:null);
 if(!selected){toast('Import and select an army list first.');return;}
 if(state.setupAddDisposition===true&&!Dispositions.matchup(selected.army.disposition,state.setupOpponentDisposition)){toast('Choose a valid list disposition and opponent disposition first.');return;}
 syncActiveList();
 const first=state.setupFirstPlayer==='opponent'?'opponent':state.setupFirstPlayer==='you'?'you':state.firstPlayer;
 Object.assign(state,{army:structuredClone(selected.army),activeListId:selected.id,renames:{...selected.renames},warnings:[...(selected.warnings||[])],guideMode:mode,firstPlayer:first,turn:first,round:1,phase:0,open:0,completed:{},revealed:{},history:[],reviewedReminders:{},guideStarted:true,view:'guide',guideDisposition:{enabled:state.setupAddDisposition===true,opponent:state.setupOpponentDisposition||''}});
 render(true);
}
function pendingGuideSettings(){return guideSettingsDraft||{guideMode:(!state.guideStarted&&state.setupGuideMode)||state.guideMode||'quick',guideFontSize:state.guideFontSize,guideShowPreviews:state.guideShowPreviews!==false,guideShowCoreStratagems:state.guideShowCoreStratagems===true,guideShowDeepStrike:state.guideShowDeepStrike!==false,guideRuleEditing:state.guideRuleEditing===true,guideSkipEmptySteps:state.guideSkipEmptySteps===true,guideRuleTypes:{...(state.guideRuleTypes||{})}};}
function stageGuideSetting(key,value){guideSettingsDraft={...pendingGuideSettings(),[key]:value};}
function reloadGuide(){
 const oldMode=state.guideMode,oldStep=lessons().steps[state.open]?.id;
 Object.assign(state,pendingGuideSettings());
 if(oldMode!==state.guideMode){
  const toLearn={'movement-activations':'movement-select','opponent-movement-activations':'movement-select','shooting-activations':'shooting-select','opponent-shooting-activations':'shooting-select','charge-activations':'charge-declare','fight-activations':'fight-resolve'};
  const toQuick={'movement-select':'movement-activations','movement-arrivals':'movement-activations','shooting-select':'shooting-activations','shooting-attacks':'shooting-activations','shooting-after':'shooting-activations','charge-declare':'charge-activations','charge-move':'charge-activations','fight-resolve':'fight-activations'};
  let target=state.guideMode==='learn'?(toLearn[oldStep]||oldStep):(toQuick[oldStep]||oldStep);
  if(state.guideMode!=='learn'&&state.turn==='opponent'&&['movement-activations','shooting-activations'].includes(target))target='opponent-'+target;
  const steps=Activations.steps(state);if(steps.some(step=>step.id===oldStep))target=oldStep;state.open=Math.max(0,steps.findIndex(step=>step.id===target));state.setupGuideMode=state.guideMode;
 }
 guideSettingsDraft=null;guidePrepared=null;guideSession.reset();clearGuideWarm();render(true);
}
function guideSettingsFields(setup=false){const settings=pendingGuideSettings();return `<div class="guide-settings-menu">${setup?'':`<label class="guide-font-label" for="guide-mode">Guide mode</label><select id="guide-mode"><option value="quick" ${settings.guideMode!=='learn'?'selected':''}>Quick guide</option><option value="learn" ${settings.guideMode==='learn'?'selected':''}>Learn to play</option></select>`}<label class="guide-font-label" for="guide-font-size">Font size</label><select id="guide-font-size">${['small','medium','large'].map(size=>`<option value="${size}" ${size===(settings.guideFontSize||'medium')?'selected':''}>${size[0].toUpperCase()+size.slice(1)}</option>`).join('')}</select><label class="guide-preview-setting"><input id="guide-show-previews" type="checkbox" ${settings.guideShowPreviews?'checked':''}>Show preview info</label><label class="guide-preview-setting"><input id="guide-skip-empty-steps" type="checkbox" ${settings.guideSkipEmptySteps?'checked':''} ${settings.guideMode==='learn'?'disabled':''}>Skip empty steps</label><p class="guide-settings-note">${settings.guideMode==='learn'?'Learn to play shows every core step, even when no army ability applies.':'Swipes and arrows skip steps without visible reminders. You can still open any step from the phase list.'}</p><fieldset class="guide-type-filters"><legend>Rule types</legend>${[['army','Army / Detachment'],['ability','Abilities'],['stratagem','Stratagems'],['enhancement','Enhancements'],['core','Core rules'],['disposition','Disposition actions']].map(([type,label])=>`<label class="guide-preview-setting"><input type="checkbox" data-guide-rule-type="${type}" ${settings.guideRuleTypes[type]!==false?'checked':''}>${label}</label>`).join('')}</fieldset><label class="guide-preview-setting"><input id="guide-show-core-stratagems" type="checkbox" ${settings.guideShowCoreStratagems?'checked':''}>Show Core Stratagems</label><label class="guide-preview-setting"><input id="guide-show-deep-strike" type="checkbox" ${settings.guideShowDeepStrike?'checked':''}>Show Deep Strike</label>${window.WarPlannerAdminPage?.canAccess?`<label class="guide-preview-setting"><input id="guide-rule-editing" type="checkbox" ${settings.guideRuleEditing?'checked':''}>Edit rules in guide (admin)</label>`:''}<p class="guide-settings-note">${setup?'Saved settings will be used when you press Start.':'Changes apply when you reload.'} The phase sequence always stays available.</p>${setup?'<div class="guide-setup-dialog-actions"><button type="button" class="outline" data-action="cancel-setup-settings">Cancel</button><button type="submit" class="primary">Save settings</button></div>':'<button type="button" class="guide-reload-button" data-action="reload-guide">Reload Guide</button><button type="button" data-action="print-guide">Print / Save PDF</button><button type="button" data-action="reset-guide">Reset guide</button><button type="button" data-action="choose-guide-army">Choose another army</button>'}</div>`;}
function guideSettings(){return `<details class="guide-settings"><summary aria-label="Guide settings" title="Guide settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.6 2.4-2 .9L4 5.6 2.5 8l1.8 1.8v2.4L2.5 14 4 16.4l2.4-.7 2 .9L9 19h3l.6-2.4 2-.9 2.4.7 1.5-2.4-1.8-1.8V9.8L18.5 8 17 5.6l-2.4.7-2-.9L12 3Z"/><circle cx="10.5" cy="11" r="3"/></svg></summary>${guideSettingsFields()}</details>`;}
function guideSetupSettingsDialog(){return `<dialog id="guide-setup-settings" class="guide-setup-dialog" aria-labelledby="guide-setup-settings-title"><form id="guide-setup-settings-form"><header><h2 id="guide-setup-settings-title">Guide settings</h2><button type="button" class="text-button" data-action="cancel-setup-settings" aria-label="Close guide settings">×</button></header>${guideSettingsFields(true)}</form></dialog>`;}
function openSetupGuideSettings(){
 setupGuideSettingsPrevious=guideSettingsDraft?structuredClone(guideSettingsDraft):null;
 // Re-render fields so reopening after Cancel always reflects the saved values.
 const dialog=$('#guide-setup-settings');if(!dialog)return;
 const menu=dialog.querySelector?.('.guide-settings-menu');if(menu)menu.outerHTML=guideSettingsFields(true);
 dialog.showModal();
}
function closeSetupGuideSettings(saveSettings=false){
 if(saveSettings){Object.assign(state,pendingGuideSettings());guideSettingsDraft=null;guidePrepared=null;guideSession.reset();}
 else guideSettingsDraft=setupGuideSettingsPrevious;
 setupGuideSettingsPrevious=null;$('#guide-setup-settings')?.close();render();$('#guide-open-settings')?.focus?.();
}

function dispositionGuideHTML(active){
 const cards=Dispositions.reminders(state,active);if(!cards.length)return '';
 return `<section class="disposition-reminders" aria-label="Your disposition primary mission">${cards.map(card=>reviewReminder(card.id,card.title,`<details class="flash-card collapsible-flash rule-disposition"><summary class="flash-summary"><span class="flash-title-row"><h3>${escapeHTML(card.title)}</h3><span class="rule-badge rule-disposition">Disposition / Primary</span></span><p class="flash-preview">${escapeHTML(card.mission)}</p><span class="flash-chevron" aria-hidden="true">+</span></summary><div class="flash-expanded"><p class="flash-timing">${escapeHTML(Dispositions.resolve(state.army.disposition))} vs ${escapeHTML(state.guideDisposition.opponent)} · ${escapeHTML(card.mission)}</p><p class="flash-fact">${escapeHTML(card.text)}</p><a href="${card.sourceUrl}" target="_blank" rel="noopener noreferrer">Mission Deck 2026–27 reference ↗</a></div></details>`)).join('')}</section>`;
}

function guideInfoPopup(){const active=lessons().steps[state.open];return `<div id="guide-info-popup" class="guide-info-popup" popover="auto" role="dialog" aria-labelledby="guide-info-title"><button type="button" class="guide-info-close" popovertarget="guide-info-popup" popovertargetaction="hide" aria-label="Close explanation" autofocus>×</button><h3 id="guide-info-title">${escapeHTML(active.title)}</h3><p class="lesson-instruction">${escapeHTML(active.body)}</p></div>`;}
function guide(){if(!state.guideStarted)return guideStartPage();if(!ensureGuidePrepared())return guidePreparationPage();return `<section class="guide-page-shell guide-carousel" aria-label="Interactive guide" data-show-previews="${state.guideShowPreviews!==false}" data-font-size="${['small','large'].includes(state.guideFontSize)?state.guideFontSize:'medium'}"><div class="guide-frame"><button class="guide-page-arrow previous-page" data-action="page-previous" aria-label="Previous page" title="Previous page" ${canPreviousPage()?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><header class="guide-fixed-header">${guideSettings()}${turnToggle()}${phaseTabs()}</header><div class="guide-viewport"><div class="guide-slide" id="guide-panel" role="tabpanel" aria-labelledby="phase-tab-${state.phase}">${guidePageHTML()}</div></div><button class="guide-page-arrow next-page" data-action="page-next" aria-label="Next page" title="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>${guideInfoPopup()}</section>`;}
// Templates contain one full cycle. Round-specific review marks are bound at mount.
let guidePrepared=null;
function guidePreparationContext(){return JSON.stringify([KEY,state.activeListId,Library.revision,window.WarPlannerContent?.generation,state.army,state.renames,state.firstPlayer,state.guideMode,state.guideShowCoreStratagems===true,state.guideShowDeepStrike!==false,state.guideRuleTypes,state.guideDisposition,state.guideSkipEmptySteps===true,guideRuleEditingEnabled()]);}
function guideTemplateKey(current){return [current.turn,current.phase,current.open].join(':');}
function ensureGuidePrepared(){
 // Non-visual adapters can continue to render synchronously.
 if(!window.requestAnimationFrame)return true;
 const context=guidePreparationContext();
 if(guidePrepared?.context===context)return guidePrepared.ready;
 const snapshot={...state},job={context,ready:false,done:0,pages:new Map(),content:new Map(),ruleCounts:new Map(),anyTimeCounts:new Map(),total:0,error:''},destinations=[];
 guidePrepared=job;
 for(const turn of ['you','opponent'])for(let phase=0;phase<5;phase++){
  const current={...snapshot,turn,phase,round:1};
  for(let open=0;open<Activations.steps(current).length;open++)destinations.push({turn,phase,open});
 }
 job.total=destinations.length;
 function prepareNext(){
  if(guidePrepared!==job||!state.guideStarted||state.view!=='guide'||guidePreparationContext()!==context){if(guidePrepared===job)guidePrepared=null;return;}
  const destination=destinations.shift(),original=state;
  try{
   state={...snapshot,...destination,round:1,completed:{},reviewedReminders:{}};
   job.pages.set(guideTemplateKey(state),buildGuidePageHTML());
   const deck=guideDeck(lessons().steps[state.open]);
   job.content.set(guideTemplateKey(state),deck.count);
   job.ruleCounts.set(guideTemplateKey(state),overviewRuleCount(deck));
   job.anyTimeCounts.set([state.turn,state.phase].join(':'),guideSession.anyTime(state).count);
  }catch(error){job.error='Could not prepare the guide. Try starting it again.';}
  finally{state=original;}
  if(job.error){render();return;}
  job.done++;
  const progress=document.querySelector('#guide-preparing-progress');if(progress)progress.value=job.done;
  if(destinations.length)setTimeout(prepareNext,0);
  else{job.ready=true;render(true);}
 }
 // Paint the loading state first; yield between pages so Cancel stays responsive.
 window.requestAnimationFrame(()=>setTimeout(prepareNext,0));
 return false;
}
function guidePreparationPage(){return `<section class="guide-start-page guide-preparing" aria-busy="${!guidePrepared?.error}"><h1>Preparing your guide</h1><p role="status">${guidePrepared?.error||'Loading every step for both players. Your guide will open when it is ready.'}</p><progress id="guide-preparing-progress" aria-label="Guide pages prepared" max="${guidePrepared?.total||1}" value="${guidePrepared?.done||0}"></progress><button type="button" class="text-button" data-action="choose-guide-army">Back to guide setup</button></section>`;}
function overviewRuleCount(deck){return deck.shared.length+deck.unitCards.reduce((n,card)=>n+card.items.length+(!card.items.length&&!card.sharedIds.length?1:0),0);}
function phaseOverviewHTML(){
 const steps=Activations.steps(state);
 return `<details id="guide-phase-overview" class="guide-phase-overview" ${state.guideOverviewOpen===true?'open':''}><summary><span>Phase overview</span><span class="overview-total">${steps.length} steps <span aria-hidden="true">⌄</span></span></summary><nav aria-label="Jump to a step in ${escapeHTML(phases[state.phase])}">${steps.map((step,index)=>{
  const current={...state,open:index};
  const stored=guidePrepared?.ready?guidePrepared.ruleCounts.get(guideTemplateKey(current)):undefined;
  const rules=stored??overviewRuleCount(guideSession.stepDeck(current,step)),primary=Dispositions.reminders(current,step).length;
  return `<button type="button" data-step="${index}" data-overview-step aria-current="${index===state.open?'step':'false'}"><span class="overview-step-title">${escapeHTML(step.title)}</span><span class="overview-counts">${rules?`<span class="overview-rule-count">${rules} ${rules===1?'rule':'rules'}</span>`:''}${primary?`<span class="overview-primary-count">${primary} primary</span>`:''}${!rules&&!primary?(state.guideMode==='learn'?'<span>Core lesson</span>':'<span>No reminders</span>'):''}</span></button>`;
 }).join('')}</nav></details>`;
}
function guidePageHTML(){const html=guidePrepared?.ready?guidePrepared.pages.get(guideTemplateKey(state))||buildGuidePageHTML():buildGuidePageHTML();return html.replace('<details id="guide-anytime" class="guide-anytime"','<details id="guide-anytime" class="guide-anytime"'+(state.guideAnyTimeOpen===true?' open':'')).replace('<div data-overview-slot></div>',phaseOverviewHTML()).replace('<div data-disposition-slot></div>',dispositionGuideHTML(lessons().steps[state.open]));}

function learningLessonHTML(active){
 if(state.guideMode!=='learn')return '';
 const lesson=Library.learningStep(active,state);
 return `<details class="learn-core" aria-label="Core rules walkthrough" open><summary class="learn-core-toggle"><span class="eyebrow">Learn to play · ${escapeHTML(phases[state.phase])}</span><span class="learn-core-caret" aria-hidden="true">⌄</span></summary><div class="learn-core-content"><p class="learn-core-body">${escapeHTML(lesson.intro)}</p>${lesson.perspective?`<p class="learn-perspective">${escapeHTML(lesson.perspective)}</p>`:''}<h3>Do this now</h3><ol>${lesson.actions.map(action=>`<li>${escapeHTML(action)}</li>`).join('')}</ol>${lesson.example?`<p class="learn-example"><strong>For example</strong><br>${escapeHTML(lesson.example)}</p>`:''}<details class="think-details learn-check"><summary>Quick question</summary><p class="question">${escapeHTML(active.question)}</p><details><summary>Show answer</summary><p>${escapeHTML(active.answer)}</p></details></details></div></details>`;
}
function learningSupportHTML(active){
 if(state.guideMode!=='learn')return '';
 const lesson=Library.learningStep(active,state);
 return `<div class="learn-support"><details class="think-details learn-why"><summary>Why this matters</summary><p>${escapeHTML(lesson.why)}</p></details><details class="think-details learn-glossary"><summary>Key terms</summary><dl>${lesson.glossary.map(([term,meaning])=>`<dt>${escapeHTML(term)}</dt><dd>${escapeHTML(meaning)}</dd>`).join('')}</dl></details></div>`;
}
function learningNavigationHTML(active){
 if(state.guideMode!=='learn')return '';
 const repeat=Library.learningStep(active,state).repeat;
 return `<div class="learn-navigation">${repeat?`<button type="button" class="outline learn-repeat" data-learning-repeat="${escapeHTML(repeat.id)}">${escapeHTML(repeat.label)}</button>`:''}<div><button type="button" class="outline" data-action="page-previous" ${canPreviousPage()?'':'disabled'}>← Back</button><span>Step ${state.open+1} of ${lessons().steps.length}</span><button type="button" class="primary" data-action="page-next">Next step →</button></div><p>Take your time. You can go back or repeat a unit’s steps whenever you need to.</p></div>`;
}

function buildGuidePageHTML(){
 const data=lessons();state.open=Math.max(0,Math.min(data.steps.length-1,state.open));
 const active=data.steps[state.open],deck=guideDeck(active),anyTime=guideSession.anyTime(state);
 const reportDeck={shared:[...deck.shared,...anyTime.shared],unitCards:[...deck.unitCards,...anyTime.unitCards],count:deck.count+anyTime.count};
 const {unsupported,phaseHasAbilities}=guideSession.coverage(state);
 return `<div class="focus-layout"><article class="lesson-focus rule-${active.category}" aria-labelledby="lesson-title"><div data-overview-slot></div><div class="guide-title-row"><h2 id="lesson-title" tabindex="-1">${escapeHTML(active.title)}</h2><button type="button" class="guide-info-button" popovertarget="guide-info-popup" aria-label="About ${escapeHTML(active.title)}" title="Step explanation"><span aria-hidden="true">ⓘ</span></button></div>${learningLessonHTML(active)}<button type="button" class="text-button" data-action="clear-phase-reviews">Clear this phase’s review marks</button>${anyTimeGuideHTML(anyTime)}<div data-disposition-slot></div>${flashBoard(active,deck)}${state.guideMode!=='learn'&&!phaseHasAbilities?`<p class="coverage-note">${unsupported.length?'Army-ability coverage is incomplete for this phase.':'No army abilities are listed for this phase in this turn.'}</p>`:''}${learningSupportHTML(active)}${learningNavigationHTML(active)}<details class="think-details guide-more"><summary>${state.guideMode==='learn'?'More context & sources':'Explanations & learning'}</summary><div class="guide-more-content">${state.guideMode==='learn'?'':`<details class="think-details"><summary>Why this matters</summary><p>${escapeHTML(active.why)}</p></details><details class="think-details"><summary>Test your understanding</summary><p class="question">${escapeHTML(active.question)}</p><p>${escapeHTML(active.answer)}</p></details>`}<div data-report-container>${window.WarPlannerReports?.guideForStep(state,active,reportDeck)||''}</div>${referenceDetails(active)}</div></details></article>${unsupported.length?`<p class="coverage-note">${unsupported.length} roster ${unsupported.length===1?'entry has':'entries have'} no unit-specific lesson coverage yet. Core guidance remains available.</p>`:''}</div>`;
}
function catalogCard(entry){
 const reviewed=Library.abilities.find(a=>a.id===Library.aliases[entry.id]);
 return reviewed||Library.abilities.find(a=>a.sourceRuleId===entry.id)||{...entry,question:'What should you check?',answer:'Check the current full rule and its exact restrictions.'};
}
function unitStudy(u){
 const info=Library.unitInfo(u,state.army.faction);
 if(!info)return `<p class="coverage-note">${(Builder.sources?.(u,state.army.faction)||[]).length>1?'Multiple datasheets match this name. Edit the list and choose its Datasheet source before studying this unit.':'No source record for this unit. Core guidance is still available.'}</p>`;
 return `${info.allied?'<p class="coverage-note">'+escapeHTML(info.originFaction)+' ally · '+escapeHTML(info.alliedDetachment||'Assigned Agents')+'</p>':''}${info.sourceReview?'<p class="coverage-note">'+escapeHTML(info.sourceReview)+'</p>':''}<details class="unit-lessons"><summary>Unit rules reference · ${info.abilities.length} entries${info.legend?' · Legends':''}</summary>${info.abilities.map(ref=>{
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

function alliedStatusHTML(army){const a=Builder.alliedStatus?.(army);if(!a?.alliedCount)return '';if(a.kind==='gsc')return `<aside class="banner allied-status"><strong>GSC allied units</strong>${Object.entries(a.totals).filter(([name,t])=>t.points||t.unknown||Builder.selectedDetachments(army).includes(name)).map(([name,t])=>`<p>${escapeHTML(name)}: ${t.points} / ${t.cap} points${t.unknown?' · '+t.unknown+' unit'+(t.unknown===1?'':'s')+' awaiting points':''}.</p>`).join('')}<p>Check current allied points, including enhancements. Brood Brothers lose Voice of Command; Kasrkin Warrior Elite remains available under the FAQ. Final Day allies retain their Tyranid keywords and unit abilities. Choose a Genestealer Cults Warlord.</p>${a.notes.length?`<ul>${a.notes.map(n=>`<li>${escapeHTML(n)}</li>`).join('')}</ul>`:''}</aside>`;return `<aside class="banner allied-status"><strong>Assigned Agents</strong><p>Characters ${a.counts.character}/${a.limits.character} · Retinue ${a.counts.chargedRetinue}/${a.limits.retinue} · Requisitioned ${a.counts.requisitioned}/${a.limits.requisitioned}${a.exemptRetinue?' · '+a.exemptRetinue+' exempt Retinue':''}. Based on a ${Number(army.limit)||2000}-point battle.</p><p>Agents keep their datasheet abilities. Host army rules, detachments and enhancements are not granted. Assigned Agents may have different points costs; confirm the allied cost in your current rules. Dedicated transports must start with eligible passengers embarked; confirm transport capacity, Warlord and all-model IMPERIUM requirements against your current rules.</p>${a.notes.length?`<ul>${a.notes.map(n=>`<li>${escapeHTML(n)}</li>`).join('')}</ul>`:''}</aside>`;}
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
 const matches=Builder.search(listEditor.query,listEditor.army.faction,listEditor.army),shown=matches.slice(0,12);
 return `<p class="builder-search-count">${matches.length} matches${matches.length>12?' · Keep typing to narrow the results':''}</p>${shown.map(u=>`<button type="button" class="builder-search-result" data-add-unit="${escapeHTML(u.id)}"><span>${escapeHTML(u.name)}${u.allied?' <small>'+escapeHTML(u.originFaction)+' ally</small>':''}${u.sourceReview?' <small>Check source</small>':''}${u.legend?' <small>Legends</small>':''}</span><span aria-hidden="true">＋</span></button>`).join('')||'<p>No units found. Try another name.</p>'}`;
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
 const army=listEditor.army,source=Builder.info(unit,listEditor.army.faction),label=listEditor.renames[unit.id]||'';
 const currentEnhancement=Builder.enhancement(unit),enhancements=Builder.enhancements(army,unit);
 const body=Builder.attachedTo(army,unit),bodies=Builder.eligibleBodies(army,unit);
 if(body&&!bodies.some(u=>u.id===body))bodies.push(army.units.find(u=>u.id===body));
 const token=source?.abilities.some(a=>a.id==='aspect-shrine-token-aeldari');
 const notes=unit.details.filter(d=>!/^Enhancement\s*:/i.test(d)&&!/^Attached as:/i.test(d)&&!(token&&/aspect shrine token/i.test(d))).join('\n');
 const counts=(source?.modelCounts||[]).filter(n=>n>0),sources=Builder.sources?.(unit,army.faction)||[];const sourcePicker=sources.length>1?`<label>Datasheet source<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="catalogUnitId"><option value="">Choose a source</option>${sources.map(s=>`<option value="${escapeHTML(s.id)}" ${s.id===source?.id?'selected':''}>${escapeHTML(s.originFaction||s.faction)}${s.allied?' · Ally':' · Native datasheet'}</option>`).join('')}</select></label>`:'';
 return `<article class="builder-unit"><div class="builder-unit-heading"><h3>${escapeHTML(unit.name)}</h3><div class="builder-unit-actions"><button class="text-button" type="button" data-duplicate-unit="${escapeHTML(unit.id)}" aria-label="Duplicate ${escapeHTML(unit.name)}">Duplicate</button><button class="text-button" type="button" data-remove-unit="${escapeHTML(unit.id)}" aria-label="Remove ${escapeHTML(unit.name)}">Remove</button></div></div><details ${listEditor.expandedUnitId===unit.id?'open':''}><summary>Unit options${body?' · Attached':''}</summary><div class="builder-unit-fields">${sourcePicker}${source?.allied?'<p class="practice-note">'+escapeHTML(source.originFaction)+' ally. Uses its source datasheet and unit abilities. '+(source.alliedKind==='gsc'?'Requires '+escapeHTML(source.alliedDetachment)+'. Only explicit GSC rules and eligible enhancements apply.':'Host army rules, detachments and enhancements are not granted.')+'</p>':''}${source?.alliedKind==='gsc'?`<label>Total unit points <small>Include equipment and enhancement cost</small><input type="number" min="1" max="10000" step="1" data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="points" value="${unit.points>0?Number(unit.points):''}" placeholder="Enter current points"></label>`:''}<label>Your label<input data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="label" value="${escapeHTML(label)}" maxlength="80" placeholder="Optional squad name"></label>${counts.length?`<label>Models<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="modelCount">${unit.modelCount===undefined?'<option value="" selected>As imported</option>':''}${editorOptions([...new Set([...counts,...(unit.modelCount?[unit.modelCount]:[])])].map(String),unit.modelCount===undefined?'':String(unit.modelCount))}</select></label>`:''}${bodies.length||source?.bodyguardIds.length||['leader','support'].includes(unit.role)?`<label>Attached to<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="attachment"><option value="">Independent</option>${bodies.map(b=>`<option value="${escapeHTML(b.id)}" ${body===b.id?'selected':''}>${escapeHTML(listEditor.renames[b.id]||b.name)}</option>`).join('')}</select></label>`:''}${enhancements.length||currentEnhancement?`<label>Enhancement<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="enhancement">${editorEnhancementOptions(unit)}</select></label>`:''}${token?`<label>Aspect Shrine Tokens<select data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="tokens">${[0,1,2].map(n=>`<option value="${n}" ${Builder.tokens(unit)===n?'selected':''}>${n}</option>`).join('')}</select></label>`:''}<label class="builder-notes">Equipment & notes <small>One item per line</small><textarea data-editor-unit="${escapeHTML(unit.id)}" data-unit-field="details" rows="4">${escapeHTML(notes)}</textarea></label></div></details></article>`;
}
function listEditorView(){
 const army=listEditor.army,aeldari=Builder.hasFaction(army.faction),selected=Builder.selectedDetachments(army),dets=Library.catalog.detachments.filter(d=>Library.factionMatches(d.faction,state.army.faction)&&selected.some(name=>name.toLowerCase().replace(/[^a-z0-9]/g,'')===d.name.toLowerCase().replace(/[^a-z0-9]/g,''))),pairings=[...new Set(dets.flatMap(d=>d.dispositions||[]))];
 return `<form id="list-editor-form" class="list-editor"><header class="heading"><div><div class="eyebrow">${listEditor.sourceId?'EDIT WORKING LIST':'BUILD A LIST'}</div><h1>${listEditor.sourceId?'Edit your list':'Create a list'}</h1><p>${listEditor.original?.originalExport?'Your original upload stays unchanged.':'Choose a faction and search its available units.'}</p></div><div class="button-row"><button type="button" class="text-button" data-action="cancel-list-editor">Cancel</button><button type="submit" class="primary">${listEditor.sourceId?'Save changes':'Create list'}</button></div></header><p class="editor-draft-note">${listEditor.dirty?'Unsaved changes':'Changes are saved when you submit this form.'}</p><p id="builder-error" class="builder-error" role="alert">${escapeHTML(listEditor.error)}</p><div class="builder-metadata">${Builder.alliedStatus?.(army)?`<label>Battle size<select data-list-field="limit">${[1000,2000,3000].map(n=>`<option value="${n}" ${Number(army.limit)===n?'selected':''}>${n} points</option>`).join('')}</select></label>`:''}<label>List name<input id="editor-list-name" data-list-field="name" value="${escapeHTML(army.name)}" maxlength="100" required></label><label>Roster<select data-list-field="faction" aria-label="Roster" ${army.units.length?'disabled':''}>${Builder.factions().some(f=>f.name===army.faction)?'':`<optgroup label="Imported faction"><option value="${escapeHTML(army.faction)}" selected>${escapeHTML(army.faction)}</option></optgroup>`}${Builder.factionGroups().map(group=>`<optgroup label="${escapeHTML(group.name)}">${editorOptions(group.factions.map(f=>f.name),group.factions.some(f=>f.name===army.faction)?army.faction:'')}</optgroup>`).join('')}</select></label>${editorDetachmentPicker()}<label>Disposition<select id="editor-disposition" data-list-field="disposition" required ${Builder.selectedDetachments(army).length?'':'disabled'}>${editorOptions(Builder.dispositions(army.faction,Builder.selectedDetachments(army)),Builder.dispositions(army.faction,Builder.selectedDetachments(army)).includes(army.disposition)?army.disposition:'',Builder.selectedDetachments(army).length?'Choose a disposition':'Choose a detachment first')}</select></label></div>${pairings.length?`<p class="builder-pairing">Listed dispositions for these detachments: ${escapeHTML(pairings.map(s=>s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')).join(', '))}. Check that your combination fits your game.</p>`:''}<section class="builder-unit-search"><h2>Add units</h2><label for="builder-unit-search">Search units by name</label><input id="builder-unit-search" type="search" value="${escapeHTML(listEditor.query)}" placeholder="Search units…" autocomplete="off" ${aeldari?'':'disabled'}><p class="builder-unit-notice" role="status">${escapeHTML(listEditor.unitNotice||'')}</p><div id="builder-search-results">${builderSearchResults()}</div></section>${alliedStatusHTML(army)}<section class="builder-roster"><h2>Your roster <span>${army.units.length} units</span></h2>${Builder.rosterGroups(army).map(group=>`<section class="builder-roster-group"><h3>${escapeHTML(group.name)}</h3>${group.units.map(listEditorUnit).join('')}</section>`).join('')||'<p class="builder-empty">Search for a unit above to start your list.</p>'}</section><p class="builder-footnote">Check equipment, enhancements, attachments and roster eligibility against your current rules.</p><button class="primary builder-save-bottom" type="submit">Save list</button></form>`;
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
 if(!selected)return `<header class="heading"><div><div class="eyebrow">YOUR ARMY, YOUR LESSONS</div><h1>My saved lists</h1><p>${lists.length?'Choose a list to see its roster and study it.':'Bring your army. Import a list to get started.'}</p></div><div class="button-row"><button class="outline" data-action="import">Import list</button><button class="primary" data-action="create-list">Create list</button></div></header>${listDeleteError?`<p class="list-delete-error" role="alert">${escapeHTML(listDeleteError)}</p>`:''}${savedListLibrary(lists)}`;
 const army=state.army;
 const sourceRoster=army.originalRoster||army;
 const exportText=army.originalExport||sourceRoster.units.map(u=>[u.name,u.modelCount?'Models: '+u.modelCount:'',u.group?'Attached group '+u.group+' · '+u.role:'',...u.details].filter(Boolean).join('\n')).join('\n\n');
 return `${listDeleteError?`<p class="list-delete-error" role="alert">${escapeHTML(listDeleteError)}</p>`:''}<button class="text-button" data-action="list-library">← Saved lists</button><header class="heading"><div><div class="eyebrow">YOUR SAVED ARMY LIST</div><h1>${escapeHTML(army.name)}</h1></div><div class="button-row"><button class="outline" data-action="edit-list">Edit list</button><button type="button" class="outline delete-list-button" data-delete-list="${escapeHTML(selected.id)}" ${deletingListId?'disabled':''}>${deletingListId===selected.id?'Deleting…':'Delete list'}</button><button class="outline" data-action="view-imported-list" aria-expanded="${!!state.showImportedList}">${state.showImportedList?'Hide':army.origin==='builder'?'View':'View'} ${army.origin==='builder'?'roster text':'imported list'}</button><button class="primary" data-view="guide">Open guide</button></div></header>${listMetadata(army)}${alliedStatusHTML(army)}${armyRulesReference()}${state.showImportedList?`<section class="imported-list"><h2>${army.origin==='builder'?'Roster text':'Original imported list'}</h2>${army.originalExport||army.origin==='builder'?'':'<p>The original export was not retained for this starter list. This is the original saved roster; import the full export to retain its original text.</p>'}<pre>${escapeHTML(exportText)}</pre></section>`:''}<input class="search" id="unit-search" type="search" aria-label="Search army units" placeholder="Search your units…"><div class="army-grid">${Builder.rosterGroups(army).map(group=>`<h2 class="roster-group-title">${escapeHTML(group.name)}</h2>${group.units.map(u=>`<article class="unit-card" data-unit-name="${escapeHTML(u.name.toLowerCase())}"><span class="unit-symbol">◇</span><h3>${escapeHTML(unitName(u))}</h3><p>${u.group?'Attached group '+escapeHTML(u.group)+' · '+escapeHTML(u.role||'Role to review'):'Individual entry'}${u.modelCount?' · '+u.modelCount+' models':''}</p><details><summary>Unit details & study notes</summary><label for="rename-${u.id}">Your label</label><input class="rename-input" id="rename-${u.id}" data-rename="${u.id}" value="${escapeHTML(unitName(u))}" maxlength="80"><ul>${u.details.length?u.details.map(d=>`<li>${escapeHTML(d)}</li>`).join(''):'<li>No equipment details retained.</li>'}</ul></details>${unitStudy(u)}</article>`).join('')}`).join('')}</div>`;
}
function prebattleView(){const cards=Library.prebattle.filter(a=>!a.units.length||state.army.units.some(u=>a.units.includes(u.name)));return `<details class="sequence-outline"><summary>Before a practice game</summary>${cards.map(a=>`<section class="aside-card" style="margin-top:12px"><h3>${escapeHTML(a.name)}</h3><p>${escapeHTML(a.summary)}</p>${referenceDetails(a)}</section>`).join('')}</details>`;}
function overview(){return `<header class="heading"><div><div class="eyebrow">KNOW YOUR NEXT MOVE</div><h1>Confidence comes with practice.</h1><p>Your army. Your pace. One decision at a time.</p></div></header><aside class="development-notice" aria-labelledby="development-notice-title"><h2 id="development-notice-title">Early development</h2><p class="development-notice-help">WarPlanner is still in early development. If something seems wrong, confirm it against the current official rules. You can report a rule error for review: <a href="${PageNavigation?.href('guide')||'#/guide'}" data-action="open-rule-picker">Report a rule error</a>.</p></aside>${armyStrip()}<div class="phase-hero"><div class="hero-kicker">YOUR PERSONAL FIELD GUIDE</div><h2>Learn it at the table.</h2><p>Walk through each phase, pause at the choices, and understand what to consider before you act.</p><div style="margin-top:24px"><button class="primary" data-view="guide">Resume guided play <span>→</span></button></div></div><div class="overview-cards"><div class="aside-card"><span class="eyebrow">PICK UP HERE</span><h3>${phases[state.phase]} Phase</h3><p>Round ${state.round} · ${state.turn==='you'?'Your turn':'Opponent’s turn'}</p></div><div class="aside-card"><span class="eyebrow">YOUR ROSTER</span><h3>${escapeHTML(Library.armyDetachments(state.army).join(' · '))}</h3><p>${state.army.units.length} units</p></div><div class="aside-card"><span class="eyebrow">THE APPROACH</span><h3>Understand, then act.</h3><p>Expandable prompts. No pressure to rush.</p></div></div><div class="banner">Personal study edition: core sequences and roster-specific timing reminders are available. Expand a lesson’s reference for its source and review status.</div>${prebattleView()}<div class="button-row"><button class="outline" data-action="import">Import an army</button><button class="text-button" data-action="restart">Start a fresh walkthrough</button></div><p class="footnote">WarPlanner is an independent, unofficial personal study companion.<br>Not affiliated with or endorsed by Games Workshop. Referenced trademarks belong to their owners.</p><details class="sequence-outline"><summary>References & credits</summary><p style="margin-top:14px;font-size:11px">Powered by <a href="https://40kdc.alpacasoft.dev" target="_blank" rel="noopener noreferrer">40kdc-data</a>. Community mechanics by Alpaca Software and the 40kdc community contributors, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Adaptations: selected roster coverage, rewritten study summaries, explicit timing prompts, and token-scope corrections. <a href="https://wahapedia.ru/wh40k11ed/the-rules/data-export/" target="_blank" rel="noopener noreferrer">Wahapedia</a> was also consulted. Official references and review dates are linked within each lesson.</p></details>`;}
function practiceView(){return window.WarPlannerPracticePage?.render({catalog:Library.catalog,rules:Library.abilities,faction:state.army.faction,savedLists:state.savedLists||[],activeListId:state.activeListId})||'<p>Practice is unavailable. Please reload the app.</p>'; }
function canPreviousPage(){return state.open>0||state.phase>0||state.turn!==state.firstPlayer||state.round>1;}
function adjacentGuidePage(current,direction){
 const target={round:current.round,turn:current.turn,phase:current.phase,open:current.open};
 if(direction>0){
  if(target.open<Activations.steps(current).length-1)target.open++;
  else{const following=next(current);Object.assign(target,{round:following.round,turn:following.turn,phase:following.phase,open:0});}
 }else{
  if(!(target.open>0||target.phase>0||target.turn!==current.firstPlayer||target.round>1))return null;
  if(target.open>0)target.open--;
  else{
   if(target.phase>0)target.phase--;
   else{target.phase=4;if(target.turn===current.firstPlayer){target.round--;target.turn=current.firstPlayer==='you'?'opponent':'you';}else target.turn=current.firstPlayer;}
   target.open=Activations.steps({...current,...target}).length-1;
  }
 }
 return target;
}
function guideStepHasReminders(current){
 const active=Activations.steps(current)[current.open];if(!active)return false;if(current.guideMode==='learn')return true;
 const count=guidePrepared?.ready?guidePrepared.content.get(guideTemplateKey(current)):undefined;
 const anyTimeCount=current.open===0?(guidePrepared?.ready?guidePrepared.anyTimeCounts.get([current.turn,current.phase].join(':')):undefined):0;
 return (count===undefined?guideSession.stepDeck(current,active).count:count)>0||Dispositions.reminders(current,active).length>0||current.open===0&&(anyTimeCount??guideSession.anyTime(current).count)>0;
}
function guideDestination(direction){
 const immediate=adjacentGuidePage(state,direction);if(!immediate||state.guideMode==='learn'||state.guideSkipEmptySteps!==true)return immediate;
 let candidate=immediate,boundary=null,last=immediate;
 // Search at most one full round. An entirely filtered guide must still move.
 const limit=['you','opponent'].reduce((n,turn)=>n+[0,1,2,3,4].reduce((v,phase)=>v+Activations.steps({...state,turn,phase}).length,0),0);
 for(let i=0;candidate&&i<limit;i++){
  const current={...state,...candidate};last=candidate;
  if(!boundary&&(candidate.phase!==state.phase||candidate.turn!==state.turn||candidate.round!==state.round))boundary=candidate;
  if(guideStepHasReminders(current))return candidate;
  candidate=adjacentGuidePage(current,direction);
 }
 return boundary||last;
}

let guideMotion=null,guideWarmJob=null,guideWarmEpoch=0;
const guideWarmPages=new Map();
function clearGuideWarm(){
 guideWarmEpoch++;
 if(guideWarmJob!==null){if(window.cancelIdleCallback)window.cancelIdleCallback(guideWarmJob);else clearTimeout(guideWarmJob);guideWarmJob=null;}
 for(const drag of guideWarmPages.values())drag.preview?.remove();guideWarmPages.clear();
}
function queueGuideWarm(){
 if(guidePrepared&&!guidePrepared.ready||guideWarmJob!==null||state.view!=='guide'||!state.guideStarted||reducedGuideMotion()||!document.createElement)return;
 const epoch=guideWarmEpoch,directions=[1,-1];
 function prepare(deadline){
  if(epoch!==guideWarmEpoch)return;guideWarmJob=null;if(guideMotion||guideGesture||state.view!=='guide')return;
  if(deadline&&(deadline.timeRemaining()<8||window.navigator?.scheduling?.isInputPending?.())){schedule();return;}
  const direction=directions.shift();if(!guideWarmPages.has(direction)){const drag=buildGuideDrag(direction);if(drag?.destination)guideWarmPages.set(direction,drag);}
  if(directions.length)schedule();
 }
 function schedule(){guideWarmJob=window.requestIdleCallback?window.requestIdleCallback(prepare,{timeout:500}):setTimeout(prepare,80);}
 schedule();
}
function reducedGuideMotion(){return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
function discardGuideDrag(drag){
 if(!drag)return;
 if(drag.current){drag.current.style.transform='';drag.current.inert=false;}
 drag.preview?.remove();
}
function cancelGuideMotion(){
 clearGuideWarm();
 const motion=guideMotion;guideMotion=null;
 if(motion){for(const animation of motion.animations)animation.cancel();discardGuideDrag(motion.drag);}
 if(guideGesture?.drag)discardGuideDrag(guideGesture.drag);
 guideGesture=null;
}
function makeGuideDrag(direction){
 const cached=guideWarmPages.get(direction);guideWarmPages.delete(direction);
 if(cached&&cached.current===document.querySelector('.guide-slide')&&cached.width===document.querySelector('.guide-viewport')?.clientWidth)return cached;
 cached?.preview?.remove();return buildGuideDrag(direction);
}
function buildGuideDrag(direction){
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
  syncGuideReviews(preview,{...state,...destination});
  fitUnitPreviews(preview.querySelectorAll('[data-unit-preview]'));
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
function commitGuidePage(destination,direction,drag=null){
 if(destination.phase!==state.phase||destination.turn!==state.turn||destination.round!==state.round){state.history.push({round:state.round,turn:state.turn,phase:state.phase,open:state.open});state.history=state.history.slice(-100);}
 Object.assign(state,destination);
 const header=document.querySelector('.guide-fixed-header'),popup=document.querySelector('#guide-info-popup');
 if(drag?.preview?.removeAttribute&&drag.current?.remove&&header&&popup){
  clearGuideWarm();drag.current.remove();
  const incoming=drag.preview;incoming.classList.remove('guide-preview');incoming.id='guide-panel';incoming.setAttribute('role','tabpanel');incoming.setAttribute('aria-labelledby','phase-tab-'+state.phase);incoming.removeAttribute('aria-hidden');incoming.inert=false;incoming.style.transform='';
  header.innerHTML=guideSettings()+turnToggle()+phaseTabs();popup.outerHTML=guideInfoPopup();
  for(const button of incoming.querySelectorAll('[data-step]')){const index=Number(button.dataset.step);button.setAttribute('aria-current',index===state.open?'step':'false');if(button.dataset.overviewStep!==undefined)continue;const marker=button.querySelector('span');if(marker)marker.textContent=state.completed[stepKey(index)]?'✓':String(index+1);}
  const previous=document.querySelector('.previous-page');if(previous)previous.disabled=!canPreviousPage();
  syncGuideReviews(incoming);save();refreshUnitPreviews();updateCloudUI();incoming.querySelector('#lesson-title')?.focus({preventScroll:true});queueGuideWarm();
 }else render(true);
}
function animateGuideDrag(drag,commit){
 if(!drag){return false;}
 drag.current.inert=true;
 const end=commit?-drag.direction*drag.width:0;
 const remaining=Math.min(1,Math.abs(end-drag.offset)/drag.width);
 const duration=commit?Math.max(60,Math.round(140*remaining)):110;
 const options={duration,easing:'cubic-bezier(.22,.75,.2,1)',fill:'forwards'};
 const animations=[];
 try{
  animations.push(drag.current.animate([{transform:`translate3d(${drag.offset}px,0,0)`},{transform:`translate3d(${end}px,0,0)`}],options));
  if(drag.preview)animations.push(drag.preview.animate([{transform:`translate3d(${drag.offset+drag.direction*drag.width}px,0,0)`},{transform:`translate3d(${end+drag.direction*drag.width}px,0,0)`}],options));
 }catch{for(const animation of animations)animation.cancel();discardGuideDrag(drag);return false;}
 const motion={drag,animations,commit};guideMotion=motion;
 Promise.all(animations.map(animation=>animation.finished)).then(()=>{
  if(guideMotion!==motion)return;
  guideMotion=null;
  for(const animation of animations)animation.cancel();
  if(commit)commitGuidePage(drag.destination,drag.direction,drag);else{discardGuideDrag(drag);clearGuideWarm();queueGuideWarm();}
 },()=>{if(guideMotion===motion){guideMotion=null;discardGuideDrag(drag);}});
 return true;
}
function finishGuideMotion(){
 const motion=guideMotion;if(!motion)return;
 guideMotion=null;for(const animation of motion.animations)animation.cancel();
 if(motion.commit)commitGuidePage(motion.drag.destination,motion.drag.direction,motion.drag);
 else discardGuideDrag(motion.drag);
}
function navigateGuide(direction,drag=null){
 finishGuideMotion();
 document.querySelector('.guide-info-popup:popover-open')?.hidePopover();
 const destination=guideDestination(direction);
 if(!destination){if(drag&&!animateGuideDrag(drag,false))discardGuideDrag(drag);return false;}
 if(reducedGuideMotion()){discardGuideDrag(drag);commitGuidePage(destination,direction);return true;}
 drag=drag||makeGuideDrag(direction);
 if(!animateGuideDrag(drag,true))commitGuidePage(destination,direction);
 return true;
}
let guideGesture=null;
function startGuideSwipe(event){
 finishGuideMotion();
 if(guideGesture?.drag)discardGuideDrag(guideGesture.drag);
 guideGesture=null;
 if(guideMotion||state.view!=='guide'||$('#import-dialog').open||document.querySelector('.guide-info-popup:popover-open')||event.touches.length!==1)return;
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
 const abort=()=>{if(gesture.drag){if(!animateGuideDrag(gesture.drag,false))discardGuideDrag(gesture.drag);}else queueGuideWarm();};
 if(gesture.cancelled||state.view!=='guide'||$('#import-dialog').open||event.touches.length){abort();return;}
 const touch=Array.from(event.changedTouches).find(t=>t.identifier===gesture.id);if(!touch){abort();return;}
 const dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
 if(Date.now()-gesture.time>1000||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.6||window.getSelection?.()?.toString()){if(gesture.drag&&event.cancelable)event.preventDefault();abort();return;}
 if(gesture.drag&&gesture.drag.direction!==(dx<0?1:-1)){discardGuideDrag(gesture.drag);gesture.drag=null;}
 paintGuideDrag(gesture,dx);
 const moved=navigateGuide(dx<0?1:-1,gesture.drag);
 if((moved||gesture.drag)&&event.cancelable)event.preventDefault();
}
document.addEventListener('toggle',event=>{
 const popup=event.target;if(popup.id!=='guide-info-popup'||event.newState!=='open')return;
 const button=document.querySelector('#guide-panel .guide-info-button');if(!button)return;
 const anchor=button.getBoundingClientRect(),box=popup.getBoundingClientRect();
 const left=Math.max(16,Math.min(anchor.right-box.width,window.innerWidth-box.width-16));
 const top=Math.max(16,Math.min(anchor.bottom+8+box.height<=window.innerHeight-16?anchor.bottom+8:anchor.top-box.height-8,window.innerHeight-box.height-16));
 popup.style.left=left+'px';popup.style.top=top+'px';
},true);
window.addEventListener?.('resize',()=>document.querySelector('.guide-info-popup:popover-open')?.hidePopover());
document.addEventListener('touchstart',startGuideSwipe,{passive:true});
document.addEventListener('touchmove',moveGuideSwipe,{passive:true});
document.addEventListener('touchend',endGuideSwipe,{passive:false});
document.addEventListener('touchcancel',()=>{discardGuideDrag(guideGesture?.drag);guideGesture=null;clearGuideWarm();queueGuideWarm();},{passive:true});
window.addEventListener?.('resize',()=>{cancelGuideMotion();queueGuideWarm();});
function advancePhase(){const target=next(state);transition({round:target.round,turn:target.turn,phase:target.phase});}
function transition(change){state.history.push({round:state.round,turn:state.turn,phase:state.phase,open:state.open});state.history=state.history.slice(-100);Object.assign(state,change);state.open=0;render(true);window.scrollTo({top:0,behavior:'smooth'});}
let pendingImport=null;
document.addEventListener('click',e=>{const b=e.target.closest('button,a[data-view],a[data-action]');if(!b)return;if(b.tagName==='A'){if(e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();}
 if(b.dataset.action==='toggle-nav'){state.sidebarCollapsed=!state.sidebarCollapsed;save();$('.shell')?.classList?.toggle('nav-collapsed',state.sidebarCollapsed);const label=state.sidebarCollapsed?'Expand navigation':'Collapse navigation';b.setAttribute?.('aria-expanded',String(!state.sidebarCollapsed));b.setAttribute?.('aria-label',label);b.title=label;b.textContent=state.sidebarCollapsed?'›':'‹';refreshUnitPreviews();return;}
 if(b.dataset.guideEdit!==undefined){if(guideRuleEditingEnabled())window.WarPlannerAdminPage?.openGuideRules(JSON.parse(b.dataset.guideEdit));return;}
 if(b.dataset.deleteList){void deleteSavedList(b.dataset.deleteList);return;}
 if(deletingListId)return;
 if(b.dataset.addUnit&&listEditor){e.preventDefault();Builder.add(listEditor.army,b.dataset.addUnit,'unit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));listEditor.expandedUnitId=listEditor.army.units.at(-1).id;listEditor.query='';listEditor.unitNotice=listEditor.army.units.at(-1).name+' added to your roster.';markEditorDirty();render();$('#builder-unit-search')?.focus?.();return;}
 if(b.dataset.duplicateUnit&&listEditor){const unit=Builder.duplicate(listEditor.army,b.dataset.duplicateUnit,'unit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));listEditor.expandedUnitId=unit.id;listEditor.unitNotice=unit.name+' duplicated as a separate unit.';markEditorDirty();render();toast(listEditor.unitNotice);return;}
 if(b.dataset.removeUnit&&listEditor){e.preventDefault();Builder.remove(listEditor.army,b.dataset.removeUnit);delete listEditor.renames[b.dataset.removeUnit];markEditorDirty();render();return;}
 if(b.dataset.openList){openSavedList(b.dataset.openList);return;}
 if(b.dataset.view){e.preventDefault();ruleReportRequested=b.dataset.action==='open-rule-report';if(pageNavigation)pageNavigation.navigate(b.dataset.view);else if(canChangePage(b.dataset.view))applyPage(b.dataset.view,{source:'link'});return;}
 if(b.dataset.phase!==undefined)transition({phase:Number(b.dataset.phase)});
 if(b.dataset.turn)switchGuideTurn(b.dataset.turn);
 if(b.dataset.first){if(b.dataset.first!==state.firstPlayer&&confirm('Restart the turn sequence with this first player? Your army remains saved.')){state.firstPlayer=b.dataset.first;state.round=1;state.turn=state.firstPlayer;state.phase=0;state.open=0;state.history=[];render();}}
 if(b.dataset.confirmRule){const k=Library.revision+'-'+b.dataset.confirmRule;state.confirmed[k]=!state.confirmed[k];save();b.textContent=state.confirmed[k]?'Undo my confirmation':'I checked this in my rules';}
 if(b.dataset.learningRepeat){const index=lessons().steps.findIndex(step=>step.id===b.dataset.learningRepeat);if(state.guideMode==='learn'&&index>=0){state.open=index;render(true);}return;}
 if(b.dataset.step!==undefined){const i=Number(b.dataset.step);state.open=i;render(true);}
 if(b.dataset.reveal!==undefined){const k=stepKey(Number(b.dataset.reveal));state.revealed[k]=!state.revealed[k];render();}
 if(b.dataset.complete!==undefined){const i=Number(b.dataset.complete),k=stepKey(i);state.completed[k]=!state.completed[k];if(state.completed[k]&&i<lessons().steps.length-1)state.open=i+1;render();}
 switch(b.dataset.action){
 case 'clear-phase-reviews':{const prefix=reminderPrefix();for(const key of Object.keys(state.reviewedReminders||{}))if(key.startsWith(prefix))delete state.reviewedReminders[key];render();break;}
 case 'open-rule-picker':window.WarPlannerReportPicker?.open();break;
 case 'open-onboarding':window.WarPlannerOnboarding?.open();break;
 case 'create-list':beginListEditor(true);break;
 case 'edit-list':beginListEditor();break;
 case 'cancel-list-editor':listEditor=null;render();break;
 case 'retry-list-save':void window.flushWarPlannerLists().catch(()=>{});break;
 case 'open-setup-settings':openSetupGuideSettings();break;
 case 'cancel-setup-settings':closeSetupGuideSettings();break;
 case 'print-guide':try{window.WarPlannerGuidePrint.open(state);}catch{toast('Could not prepare your printable guide. Please try again.');}break;
 case 'reload-guide':reloadGuide();break;
 case 'reset-guide':showGuideStart(true);break;
 case 'choose-guide-army':showGuideStart();break;
 case 'list-library':state.selectedListId=null;state.showImportedList=false;render();break;
 case 'view-imported-list':state.showImportedList=!state.showImportedList;render();break;
 case 'next':advancePhase();break;
 case 'page-next':navigateGuide(1);break;
 case 'page-previous':navigateGuide(-1);break;
 case 'swap-turn-order':swapGuideOrder();break;
 case 'study-next':if(state.open<lessons().steps.length-1){state.open++;render(true);}else advancePhase();break;
 case 'skip-step':if(state.open<lessons().steps.length-1){state.open++;render(true);}else advancePhase();break;
 case 'step-back':if(state.open>0){state.open--;render(true);}break;
 case 'back':{const previous=state.history.pop();if(previous){Object.assign(state,previous);state.open=previous.open||0;render();window.scrollTo(0,0);}break;}
 case 'round-down':if(state.round>1)transition({round:state.round-1});break;
 case 'round-up':transition({round:state.round+1});break;
 case 'restart':showGuideStart(true);break;
 case 'import':pendingImport=null;$('#import-feedback').innerHTML='';$('#import-form button[type=submit]').innerHTML='Review army <span>→</span>';$('#import-dialog').showModal();break;
 case 'revise-import':pendingImport=null;$('#import-feedback').innerHTML='';$('#import-form button[type=submit]').innerHTML='Review army <span>→</span>';$('#army-text').focus?.();break;
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
document.addEventListener('input',e=>{if(listEditor){if(e.target.id==='builder-unit-search'){listEditor.query=e.target.value;$('#builder-search-results').innerHTML=builderSearchResults();}if(e.target.dataset.listField){if(e.target.dataset.listField==='detachmentList')Builder.setDetachments(listEditor.army,e.target.value.split(/\r?\n/));else if(e.target.dataset.listField==='detachment')Builder.setDetachments(listEditor.army,[e.target.value]);else listEditor.army[e.target.dataset.listField]=e.target.value;markEditorDirty();}if(e.target.dataset.unitField==='label'){listEditor.renames[e.target.dataset.editorUnit]=e.target.value;markEditorDirty();}if(e.target.dataset.unitField==='details'){const unit=listEditor.army.units.find(u=>u.id===e.target.dataset.editorUnit);if(unit){const hasToken=Builder.info(unit,listEditor.army.faction)?.abilities.some(a=>a.id==='aspect-shrine-token-aeldari');const controlled=unit.details.filter(d=>/^Enhancement\s*:/i.test(d)||(hasToken&&/aspect shrine token/i.test(d)));unit.details=[...e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),...controlled];markEditorDirty();}}}if(e.target.id==='unit-search'){const q=e.target.value.toLowerCase();document.querySelectorAll('.unit-card').forEach(c=>c.hidden=!c.dataset.unitName.includes(q)&&!c.querySelector('h3').textContent.toLowerCase().includes(q));}if(e.target.id==='army-text'){pendingImport=null;$('#import-feedback').innerHTML='';$('#import-form button[type=submit]').innerHTML='Review army <span>→</span>';}});
document.addEventListener('change',e=>{
 if(e.target.dataset.guideMode!==undefined&&['quick','learn'].includes(e.target.value)){state.setupGuideMode=e.target.value;if(guideSettingsDraft)guideSettingsDraft.guideMode=e.target.value;render();return;}
 if(e.target.id==='guide-mode'&&['quick','learn'].includes(e.target.value)){stageGuideSetting('guideMode',e.target.value);const menu=document.querySelector('.guide-settings-menu');if(menu)menu.outerHTML=guideSettingsFields();$('#guide-mode')?.focus?.();return;}
 const optionKeys={'guide-skip-empty-steps':'guideSkipEmptySteps','guide-rule-editing':'guideRuleEditing','guide-show-core-stratagems':'guideShowCoreStratagems','guide-show-deep-strike':'guideShowDeepStrike','guide-show-previews':'guideShowPreviews'};
 if(optionKeys[e.target.id]){if(e.target.id==='guide-rule-editing'&&!window.WarPlannerAdminPage?.canAccess)return;stageGuideSetting(optionKeys[e.target.id],e.target.checked);return;}
 if(e.target.dataset.guideRuleType){stageGuideSetting('guideRuleTypes',{...pendingGuideSettings().guideRuleTypes,[e.target.dataset.guideRuleType]:e.target.checked});return;}
 if(e.target.id==='guide-font-size'){if(['small','medium','large'].includes(e.target.value))stageGuideSetting('guideFontSize',e.target.value);return;}
 if(e.target.id==='guide-add-disposition'){state.setupAddDisposition=e.target.checked;render();return;}
 if(e.target.id==='guide-opponent-disposition'){state.setupOpponentDisposition=Dispositions.resolve(e.target.value)||'';render();$('#guide-opponent-disposition')?.focus?.();return;}
 if(e.target.dataset.reviewReminder){clearGuideWarm();state.reviewedReminders=state.reviewedReminders||{};if(e.target.checked)state.reviewedReminders[e.target.dataset.reviewReminder]=true;else delete state.reviewedReminders[e.target.dataset.reviewReminder];save();e.target.closest?.('.reminder-item')?.classList.toggle('reminder-reviewed',e.target.checked);queueGuideWarm();return;}if(listEditor){try{if(e.target.dataset.editorDetachment){const names=Builder.selectedDetachments(listEditor.army).filter(name=>name.toLowerCase().replace(/[^a-z0-9]/g,'')!==e.target.dataset.editorDetachment.toLowerCase().replace(/[^a-z0-9]/g,''));if(e.target.checked)names.push(e.target.dataset.editorDetachment);Builder.setDetachments(listEditor.army,names);if(!Builder.dispositions(listEditor.army.faction,Builder.selectedDetachments(listEditor.army)).includes(listEditor.army.disposition))listEditor.army.disposition='';markEditorDirty();render();}if(e.target.dataset.listField){if(e.target.dataset.listField==='detachmentList')Builder.setDetachments(listEditor.army,e.target.value.split(/\r?\n/));else if(e.target.dataset.listField==='detachment')Builder.setDetachments(listEditor.army,[e.target.value]);else listEditor.army[e.target.dataset.listField]=e.target.value;markEditorDirty();if(e.target.dataset.listField==='faction'){Builder.setDetachments(listEditor.army,[]);listEditor.army.disposition='';listEditor.query='';render();}if(['detachment','detachmentList','limit'].includes(e.target.dataset.listField)){if(e.target.dataset.listField!=='limit'&&!Builder.dispositions(listEditor.army.faction,Builder.selectedDetachments(listEditor.army)).includes(listEditor.army.disposition))listEditor.army.disposition='';render();}}if(e.target.dataset.editorUnit){const id=e.target.dataset.editorUnit,unit=listEditor.army.units.find(u=>u.id===id);if(unit){const field=e.target.dataset.unitField;if(field==='catalogUnitId')Builder.setSource(listEditor.army,unit,e.target.value);if(field==='attachment')Builder.attach(listEditor.army,id,e.target.value);if(field==='enhancement')Builder.setEnhancement(listEditor.army,id,e.target.value);if(field==='tokens')Builder.setTokens(unit,Number(e.target.value));if(field==='points'){const points=e.target.value===''?0:Number(e.target.value);if(!Number.isInteger(points)||points<0||points>10000)throw Error('Enter whole unit points from 1 to 10000, or leave blank to review.');unit.points=points;}if(field==='modelCount'){if(e.target.value)unit.modelCount=Number(e.target.value);else delete unit.modelCount;}markEditorDirty();if(['attachment','enhancement','tokens','catalogUnitId','points'].includes(field)){listEditor.expandedUnitId=id;render();}}}}catch(error){listEditor.error=error.message;$('#builder-error').textContent=error.message;}}if(e.target.id==='guide-army-list'){state.setupListId=e.target.value;render();}if(e.target.id==='guide-first-player'){state.setupFirstPlayer=e.target.value;save();}if(e.target.dataset.rename){const value=e.target.value.trim();if(value){state.renames[e.target.dataset.rename]=value;libraryDirty=true;syncActiveList();save();e.target.closest('.unit-card').querySelector('h3').textContent=value;}else e.target.value=unitName(state.army.units.find(u=>u.id===e.target.dataset.rename));}});
document.addEventListener('toggle',event=>{
 if(event.target.id==='guide-anytime'){if(!document.querySelector('#guide-panel')?.contains(event.target)||event.target.closest('.guide-preview')||state.guideAnyTimeOpen===event.target.open)return;state.guideAnyTimeOpen=event.target.open;clearGuideWarm();save();queueGuideWarm();return;}
 if(event.target.id!=='guide-phase-overview'||!document.querySelector('#guide-panel')?.contains(event.target)||event.target.closest('.guide-preview')||state.guideOverviewOpen===event.target.open)return;
 state.guideOverviewOpen=event.target.open;clearGuideWarm();save();queueGuideWarm();
},true);
document.addEventListener('cancel',e=>{if(e.target.id==='guide-setup-settings'){e.preventDefault();closeSetupGuideSettings();}},true);
document.addEventListener('submit',e=>{if(e.target.id==='guide-setup-settings-form'){e.preventDefault();closeSetupGuideSettings(true);return;}if(e.target.id==='list-editor-form'){e.preventDefault();saveListEditor();return;}if(e.target.id==='guide-start-form'){e.preventDefault();startGuide();}});
$('#import-form').addEventListener('submit',e=>{e.preventDefault();if(pendingImport){syncActiveList();const id='list-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);state.savedLists.push({id,army:pendingImport.army,warnings:pendingImport.warnings,renames:{}});state.guideStarted=false;state.setupListId=id;state.activeListId=id;state.selectedListId=id;state.showImportedList=false;state.army=pendingImport.army;state.warnings=pendingImport.warnings;state.renames={};state.completed={};state.revealed={};state.history=[];state.phase=0;state.round=1;state.turn=state.firstPlayer;state.open=0;state.view='army';$('#import-dialog').close();pendingImport=null;render();toast(cloudLists?'Saving your list to your account…':'Army saved. Review your units before studying.');return;}try{pendingImport=parseArmy($('#army-text').value,{detachments:Library.catalog.detachments,factionMatches:Library.factionMatches});$('#import-feedback').innerHTML=window.WarPlannerImportReview.render(pendingImport);$('#import-form button[type=submit]').innerHTML='Use this army <span>→</span>';}catch(error){$('#import-feedback').textContent=error.message;}});
function canChangePage(view){if(window.WarPlannerAccount?.busy){toast('Please wait for your account change to finish.');return false;}if(view==='account'&&listEditor?.dirty){toast('Save or cancel your list edits before opening My Account.');return false;}if(window.WarPlannerAdminPage?.guideEditorActive&&!window.WarPlannerAdminPage.leave())return false;if(deletingListId)return false;if(view==='admin'&&!window.WarPlannerAdminPage?.canAccess)return false;return state.view!=='admin'||view==='admin'||!!window.WarPlannerAdminPage?.leave();}
function applyPage(view,{source}){if(source==='link'&&view==='army')state.selectedListId=null;state.view=view;if(source!=='initial'){render();window.scrollTo(0,0);const heading=document.querySelector('main h1,#guide-panel #lesson-title');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}}
pageNavigation=PageNavigation?.create({window,getView:()=>state.view,apply:applyPage,canAccess:view=>view!=='admin'||!!window.WarPlannerAdminPage?.canAccess,canLeave:canChangePage});
if(!window.WARPLANNER_CONFIG)pageNavigation?.start();
render();

window.setWarPlannerAccount=(user,library,service=null,idMap={},contentService=null)=>{
 pageNavigation?.pause();
 deletingListId=null;listDeleteError='';
 guidePrepared=null;guideSession.reset();rosterRefs=null;libraryDirty=true;savedLibrary=null;savedProgress=null;
 window.WarPlannerPracticePage?.reset();
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
 if(!state.army.units.length&&!(state.guideMode==='learn'&&state.guideStarted))state.view='army';
 pageNavigation?.start();render();
 window.WarPlannerOnboarding?.setAccount(user.id);
};
window.clearWarPlannerAccount=()=>{
 window.WarPlannerOnboarding?.clear();
 pageNavigation?.pause();
 deletingListId=null;listDeleteError='';
 guidePrepared=null;guideSession.reset();rosterRefs=null;libraryDirty=true;savedLibrary=null;savedProgress=null;
 window.WarPlannerPracticePage?.reset();
 window.WarPlannerAdminPage?.setService(null);
 listEditor=null;
 cloudLists?.dispose();cloudLists=null;cloudStatus='loading';
 guideSettingsDraft=null;setupGuideSettingsPrevious=null;KEY=null;state=initialState(EMPTY_ARMY);pendingImport=null;
 $('#import-dialog').close();$('#army-text').value='';$('#import-feedback').innerHTML='';render();
};

window.refreshWarPlannerContent=()=>{guidePrepared=null;guideSession.reset();render();};

window.refreshWarPlannerGuideEditor=()=>{const host=$('#guide-rule-editor-container');if(host)host.innerHTML=window.WarPlannerAdminPage?.renderGuideEditor?.()||'';};
window.onWarPlannerGuideRuleSaved=()=>{window.refreshWarPlannerContent();toast('Rule saved to Workshop.');};

window.getWarPlannerFeedbackContext=()=>({page:state.view,guideMode:state.guideMode,phase:state.view==='guide'?phases[state.phase]:'',turn:state.view==='guide'?state.turn:'',faction:state.army?.faction||''});
