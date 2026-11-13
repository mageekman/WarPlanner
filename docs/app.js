'use strict';
const {phases,sample,parseArmy,next}=WarPlan;
let KEY=null;
const EMPTY_ARMY={name:'No army imported',faction:'',detachment:'',points:0,limit:2000,version:'',units:[]};
const Library=WarPlanLessons;
const Activations=WarPlanActivations;
const initialState=army=>({view:'guide',guideStarted:false,guideFontSize:'medium',army:structuredClone(army),round:1,turn:'you',phase:0,open:0,completed:{},revealed:{},history:[],renames:{},warnings:[],firstPlayer:'you',confirmed:{},flowRevision:'flashcards-v1'});
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
 if(state.activeListId!==id)Object.assign(state,{guideStarted:false,guideFontSize:'medium',army:structuredClone(list.army),activeListId:id,renames:{...list.renames},warnings:[...(list.warnings||[])],completed:{},revealed:{},history:[],round:1,turn:state.firstPlayer,phase:0,open:0});
 state.setupListId=id;state.selectedListId=id;state.showImportedList=false;state.view='army';render();
}
function loadAccountState(key,army){KEY=key;state=initialState(army);storageOK=true;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.army?.units)&&Number.isInteger(saved.phase)&&saved.phase>=0&&saved.phase<5){state={...state,...saved};state.view=['guide','army','overview','practice'].includes(state.view)?state.view:'guide';state.round=Math.max(1,Number(state.round)||1);state.turn=state.turn==='opponent'?'opponent':'you';state.firstPlayer=state.firstPlayer==='opponent'?'opponent':'you';state.confirmed=state.confirmed||{};delete state.activationSelections;delete state.activationReviewed;if(!['unit-activations-v1','flashcards-v1'].includes(saved.flowRevision)){state.open=0;state.history=[];}state.flowRevision='flashcards-v1';}}catch{storageOK=false;}
normalizeLists();
}
if(!window.WARPLANNER_CONFIG)loadAccountState('warplan.prototype.v1',sample);

const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){syncActiveList();if(!KEY)return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;}}
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
function render(focusLesson=false){cancelGuideMotion();save();const nav=[['overview','⌂','Study home'],['guide','▤','Guided play'],['army','◇','My army'],['practice','✧','Practice']];$('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="mark"><span>⌁</span></div>WARPLANNER</div><div class="tagline">KNOW YOUR NEXT MOVE.</div><div class="nav-label">YOUR FIELD GUIDE</div><nav class="nav" aria-label="Main navigation">${nav.map(([id,icon,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}" ${state.view===id?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}${id==='practice'?'<span class="soon">LATER</span>':''}</button>`).join('')}<button type="button" data-auth-signout><span class="nav-icon" aria-hidden="true">↪</span>Sign out</button></nav><div class="sidebar-bottom"><div class="private">◈ &nbsp; A personal study companion<br>Made for the way you learn.</div><div class="profile"><div class="avatar">WP</div><div><strong>Your study space</strong><small>Personal study · v0.6</small></div></div></div></aside><main>${state.view==='guide'?'':`<div class="topbar"><span>YOUR STUDY SPACE &nbsp; / &nbsp; <strong>${state.view==='guide'?'Guided play':state.view==='army'?'My army':state.view==='practice'?'Practice':'Study home'}</strong></span><span class="top-status"><span class="dot"></span>${storageOK?'Saved on this device':'Browser storage unavailable'}</span></div>`}${state.view==='guide'?guide():state.view==='army'?armyView():state.view==='practice'?practiceView():overview()}</main></div>`;refreshUnitPreviews();if(focusLesson)document.querySelector('#lesson-title')?.focus({preventScroll:true});}
function armyStrip(){return `<div class="army-strip"><div class="army-sigil" aria-hidden="true">⋈</div><div><h3>${escapeHTML(state.army.faction)} <span class="muted">/</span> ${escapeHTML(state.army.detachment)}</h3><p>${state.army.units.length} units · ${escapeHTML(state.army.disposition||'Disposition not provided')}</p></div><div class="strip-right"><span class="pill">${!state.army.units.length?'No army imported':state.army.units[0]?.id.startsWith('sample')?'Saved roster':'Imported roster'}</span><button class="text-button" data-view="army">View army ↗</button></div></div>`;}
function referenceDetails(item){
 const confirmation=state.confirmed[Library.revision+'-'+item.id];
 return `<details class="reference-details"><summary>Rules reference & review</summary><div class="reference-content"><p>${item.status==='official-checked'?'Compared with the linked official text.':'Compared with community references; confirm against your current app or book.'} ${confirmation?'You also marked this checked on this device.':''}</p>${item.section?`<p>Section ${escapeHTML(item.section)}</p>`:''}${item.sourceIds.map(id=>{const src=Library.sources[id];return `<a href="${src.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(src.name)} ↗</a><small>${escapeHTML(src.version)}</small>`;}).join('')}${item.status!=='official-checked'?`<button class="text-button" data-confirm-rule="${item.id}">${confirmation?'Undo my confirmation':'I checked this in my rules'}</button>`:''}</div></details>`;
}
function categoryBadge(item){return `<span class="rule-badge rule-${item.category}">${escapeHTML(Library.categories[item.category]||'Ability')}</span>`;}
function abilityCard(a){
 const instances=a.targetUnits||state.army.units.filter(u=>a.units.some(n=>n.toLowerCase()===u.name.toLowerCase()));
 const targets=instances.length?instances.map(unitName).join(' · '):'Army / detachment reminder';
 return `<details class="ability-card${a.sequencePreview?' sequence-priority':''} rule-${a.category}"><summary><span>${categoryBadge(a)}${a.sequencePreview?'<span class="sequence-label">PLAN NOW · RESOLVE AFTER SHOOTING</span>':''}<strong>${escapeHTML(a.sequencePreview?a.sequence.title:a.name)}</strong><small>${escapeHTML(targets)}</small></span><span class="ability-plus" aria-hidden="true">+</span></summary><div class="ability-body">${a.sequencePreview?`<p class="sequence-advice">${escapeHTML(a.sequence.advice)}</p><p class="sequence-rule-name">Ability: ${escapeHTML(a.name)}</p>`:''}<p>${escapeHTML(a.summary)}</p><ul>${a.conditions.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ul><details class="think-details"><summary>Check your understanding</summary><p class="question">${escapeHTML(a.question)}</p><p>${escapeHTML(a.answer)}</p></details>${referenceDetails(a)}</div></details>`;
}
function activationLabel(unit){if(unit.attached)return unitName(unit.body)+' + '+unit.leaders.map(unitName).join(' + ');return unit.members.map(unitName).join(' + ');}
function flashDetails(items){return `<details class="flash-details"><summary>Conditions & sources</summary>${items.map(a=>`<section><h4>${escapeHTML(a.name)}</h4><ul>${a.conditions.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ul>${referenceDetails(a)}</section>`).join('')}</details>`;}
function flashBoard(active){
 const deck=Activations.flashcards(state,active);
 if(!deck.count)return `<details class="army-lessons" open><summary>Your army at this step <span>0</span></summary><p class="ability-empty">No matching army abilities are listed for this step. Follow the core instructions above, then continue.</p></details>`;
 const sharedNames=new Map(deck.shared.map(a=>[a.key,a.name]));
 const userLabel=(a,u)=>a.id==='token'?(u.members.filter(m=>a.units.some(name=>name.toLowerCase()===m.name.toLowerCase())).map(unitName).join(' + ')||activationLabel(u)):activationLabel(u);
 const sharedCards=deck.shared.map(a=>{
  const target=Activations.targeting(a,state);
  const users=a.appliesTo.map(u=>userLabel(a,u));
  const preview=target?target.label+': '+target.text:users.join(' · ');
  return `<details class="flash-card collapsible-flash rule-${a.category}" data-shared-rule="${escapeHTML(a.id)}"><summary class="flash-summary"><span class="flash-title-row"><h3>${escapeHTML(a.name)}</h3>${categoryBadge(a)}</span><p class="flash-preview" ${target?'':`data-unit-preview data-full-preview="${escapeHTML(preview)}"`}>${escapeHTML(preview)}</p><span class="flash-chevron" aria-hidden="true">+</span></summary><div class="flash-expanded">${target?`<div class="flash-target"><span>${target.label}</span><p>${escapeHTML(target.text)}</p></div>`:`<div class="flash-unit-list"><span>Units that can use this rule, subject to its conditions</span><ul>${users.map(name=>`<li>${escapeHTML(name)}</li>`).join('')}</ul></div>`}<p class="flash-timing">${escapeHTML(a.timing)}</p><p class="flash-fact">${escapeHTML(a.summary)}</p>${a.promoted?'<p class="flash-applies">Each listed unit keeps its own equipment, conditions, and usage limits.</p>':''}${flashDetails([a])}</div></details>`;
 }).join('');
 const unitCards=deck.unitCards.map(card=>{
  const title=card.instances.length>1?card.unit.body.name:activationLabel(card.unit);
  const labels=card.instances.map(activationLabel).join(' · ');
  const priority=active.activationMode==='shooting'&&card.unit.priority<100;
  const first=card.instances.every(unit=>Activations.fightsFirst(state,unit));
  const ruleNames=[...new Set([...card.items.map(a=>a.name),...card.sharedIds.map(id=>sharedNames.get(id)).filter(Boolean)])];
  return `<details class="flash-card unit-flash-card collapsible-flash rule-ability" data-unit-card="${escapeHTML(card.unit.id)}"><summary class="flash-summary"><span class="flash-title-row"><h3>${escapeHTML(title)}</h3>${first?'<span class="flash-fights-first">Fights First</span>':priority?'<span class="flash-priority">Early ↗</span>':''}</span><p class="flash-preview">${escapeHTML(ruleNames.join(' · '))}</p><span class="flash-chevron" aria-hidden="true">+</span></summary><div class="flash-expanded">${card.instances.length>1?`<p class="flash-instances">${escapeHTML(labels)} · Each unit keeps its own limits.</p>`:''}${priority?`<p class="flash-order">${escapeHTML(card.unit.orderHint)}</p>`:''}${card.items.map(a=>`<div class="flash-rule"><div>${categoryBadge(a)}<h4>${escapeHTML(a.name)}</h4></div><p class="flash-timing">${escapeHTML(a.timing)}</p><p class="flash-fact">${escapeHTML(a.summary)}</p></div>`).join('')}${card.sharedIds.length?`<p class="flash-shared-links">Shared options above: ${escapeHTML(card.sharedIds.map(id=>sharedNames.get(id)).filter(Boolean).join(' · '))}</p>`:''}${card.items.length?flashDetails(card.items):''}</div></details>`;
 }).join('');
 const coreHelp=active.coreHelp||[];
 return `<details class="army-lessons flash-board" open><summary>Your army at this ${active.activationMode?'phase':'step'} <span>${deck.count} cards</span></summary><p class="reminder-caption">Shared rules first, then units. Tap a card for details; these reminders do not determine eligibility.</p>${sharedCards?`<div class="flash-grid shared-flash-grid">${sharedCards}</div>`:''}${unitCards?`<div class="flash-grid unit-flash-grid">${unitCards}</div>`:''}</details>${coreHelp.length?`<details class="think-details"><summary>Core help for this phase</summary>${coreHelp.map(s=>`<h3 class="activation-help-title">${escapeHTML(s.title)}</h3><p>${escapeHTML(s.body)}</p>`).join('')}</details>`:''}`;
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
function guideCoverage(){return `<footer class="focus-footer"><span>11th edition · Personal study snapshot</span><details><summary>Content coverage</summary><p>Core sequence checked against the June 2026 official PDF. Two army abilities checked against the October update; other army summaries use community references and need confirmation in your current rules. Stratagem cards are timing prompts, not complete instructions. No mission scoring or eligibility automation. Latest-update completeness is not guaranteed.</p><div class="rule-legend">${Object.keys(Library.categories).map(category=>categoryBadge({category})).join('')}</div><p>Reviewed 13 November 2026 · ${Library.revision}</p></details></footer>`;}
function armyAlliance(faction){
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
function guideSettings(){return `<details class="guide-settings"><summary aria-label="Guide settings" title="Guide settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.6 2.4-2 .9L4 5.6 2.5 8l1.8 1.8v2.4L2.5 14 4 16.4l2.4-.7 2 .9L9 19h3l.6-2.4 2-.9 2.4.7 1.5-2.4-1.8-1.8V9.8L18.5 8 17 5.6l-2.4.7-2-.9L12 3Z"/><circle cx="10.5" cy="11" r="3"/></svg></summary><div class="guide-settings-menu"><label class="guide-font-label" for="guide-font-size">Font size</label><select id="guide-font-size">${['small','medium','large'].map(size=>`<option value="${size}" ${size===(state.guideFontSize||'medium')?'selected':''}>${size[0].toUpperCase()+size.slice(1)}</option>`).join('')}</select><button type="button" data-action="reset-guide">Reset guide</button><button type="button" data-action="choose-guide-army">Choose another army</button></div></details>`;}
function guide(){if(!state.guideStarted)return guideStartPage();return `<section class="guide-page-shell guide-carousel" aria-label="Interactive guide" data-font-size="${['small','large'].includes(state.guideFontSize)?state.guideFontSize:'medium'}"><div class="guide-frame"><button class="guide-page-arrow previous-page" data-action="page-previous" aria-label="Previous page" title="Previous page" ${canPreviousPage()?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><header class="guide-fixed-header">${guideSettings()}${turnToggle()}${phaseTabs()}</header><div class="guide-viewport"><div class="guide-slide" id="guide-panel" role="tabpanel" aria-labelledby="phase-tab-${state.phase}">${guidePageHTML()}</div></div><button class="guide-page-arrow next-page" data-action="page-next" aria-label="Next page" title="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div></section>`;}
function guidePageHTML(){
 const data=lessons();state.open=Math.max(0,Math.min(data.steps.length-1,state.open));
 const active=data.steps[state.open];
 const unsupported=Library.isAeldari(state.army)?state.army.units.filter(u=>!sample.units.some(s=>s.name.toLowerCase()===u.name.toLowerCase())):state.army.units;
 const phaseHasAbilities=Library.phases[state.phase].steps.some(step=>Library.forStep(state,step).length>0);
 return `<div class="focus-layout"><article class="lesson-focus rule-${active.category}" aria-labelledby="lesson-title"><span class="lesson-kind">${categoryBadge(active)} <span class="rule-context">${escapeHTML(active.kind)}</span></span><h2 id="lesson-title" tabindex="-1">${escapeHTML(active.title)}</h2><p class="lesson-instruction">${escapeHTML(active.body)}</p>${flashBoard(active)}${!phaseHasAbilities?`<p class="coverage-note">${unsupported.length?'Army-ability coverage is incomplete for this phase.':'No army abilities are listed for this phase in this turn.'}</p>`:''}<details class="think-details"><summary>Why this matters</summary><p>${escapeHTML(active.why)}</p></details><details class="think-details"><summary>Test your understanding</summary><p class="question">${escapeHTML(active.question)}</p><p>${escapeHTML(active.answer)}</p></details>${referenceDetails(active)}</article><details class="sequence-outline"><summary>See the whole phase</summary><div>${data.steps.map((step,i)=>`<button data-step="${i}" aria-current="${i===state.open?'step':'false'}"><span>${state.completed[stepKey(i)]?'✓':i+1}</span>${escapeHTML(step.title)}</button>`).join('')}</div></details>${unsupported.length?`<p class="coverage-note">${unsupported.length} roster ${unsupported.length===1?'entry has':'entries have'} no unit-specific lesson coverage yet. Core guidance remains available.</p>`:''}</div>`;
}
function unitStudy(u){const available=Library.abilities.filter(a=>a.units.some(n=>n.toLowerCase()===u.name.toLowerCase())&&Library.matches(a,state.army));return available.length?`<details class="unit-lessons"><summary>Study this unit · ${available.length} reminders</summary>${available.map(abilityCard).join('')}</details>`:'';}
function listMetadata(army){return `<dl class="list-metadata"><div><dt>Roster</dt><dd>${escapeHTML(army.faction||'Not provided')} · ${army.units.length} ${army.units.length===1?'unit':'units'}</dd></div><div><dt>Detachment</dt><dd>${escapeHTML(army.detachment||'Not provided')}</dd></div><div><dt>Disposition</dt><dd>${escapeHTML(army.disposition||'Not provided')}</dd></div></dl>`;}
function armyView(){
 const lists=state.savedLists||[],selected=lists.find(l=>l.id===state.selectedListId);
 if(!selected)return `<header class="heading"><div><div class="eyebrow">YOUR ARMY, YOUR LESSONS</div><h1>My saved lists</h1><p>${lists.length?'Choose a list to see its roster and study it.':'Bring your army. Import a list to get started.'}</p></div><button class="outline" data-action="import">Import list</button></header><div class="saved-lists">${lists.map(list=>`<button class="saved-list-card" data-open-list="${escapeHTML(list.id)}"><span class="saved-list-heading"><strong>${escapeHTML(list.army.name)}</strong><span aria-hidden="true">→</span></span>${listMetadata(list.army)}${list.id===state.activeListId?'<span class="pill">Active in guide</span>':''}</button>`).join('')}</div>`;
 const army=state.army;
 const exportText=army.originalExport||army.units.map(u=>[u.name,u.group?'Attached group '+u.group+' · '+u.role:'',...u.details].filter(Boolean).join('\n')).join('\n\n');
 return `<button class="text-button" data-action="list-library">← Saved lists</button><header class="heading"><div><div class="eyebrow">YOUR SAVED ARMY LIST</div><h1>${escapeHTML(army.name)}</h1></div><div class="button-row"><button class="outline" data-action="view-imported-list" aria-expanded="${!!state.showImportedList}">${state.showImportedList?'Hide':'View'} imported list</button><button class="primary" data-view="guide">Open guide</button></div></header>${listMetadata(army)}${state.showImportedList?`<section class="imported-list"><h2>Imported list</h2>${army.originalExport?'':'<p>The original export was not retained for this starter list. This is the saved roster; import the full export to retain its original text.</p>'}<pre>${escapeHTML(exportText)}</pre></section>`:''}<input class="search" id="unit-search" type="search" aria-label="Search army units" placeholder="Search your units…"><div class="army-grid">${army.units.map(u=>`<article class="unit-card" data-unit-name="${escapeHTML(u.name.toLowerCase())}"><span class="unit-symbol">◇</span><h3>${escapeHTML(unitName(u))}</h3><p>${u.group?'Attached group '+escapeHTML(u.group)+' · '+escapeHTML(u.role||'Role to review'):'Individual entry'}</p><details><summary>Unit details & study notes</summary><label for="rename-${u.id}">Your label</label><input class="rename-input" id="rename-${u.id}" data-rename="${u.id}" value="${escapeHTML(unitName(u))}" maxlength="80"><ul>${u.details.length?u.details.map(d=>`<li>${escapeHTML(d)}</li>`).join(''):'<li>No equipment details retained.</li>'}</ul></details>${unitStudy(u)}</article>`).join('')}</div>`;
}
function prebattleView(){const cards=Library.prebattle.filter(a=>!a.units.length||state.army.units.some(u=>a.units.includes(u.name)));return `<details class="sequence-outline"><summary>Before a practice game</summary>${cards.map(a=>`<section class="aside-card" style="margin-top:12px"><h3>${escapeHTML(a.name)}</h3><p>${escapeHTML(a.summary)}</p>${referenceDetails(a)}</section>`).join('')}</details>`;}
function overview(){return `<header class="heading"><div><div class="eyebrow">KNOW YOUR NEXT MOVE</div><h1>Confidence comes with practice.</h1><p>Your army. Your pace. One decision at a time.</p></div></header>${armyStrip()}<div class="phase-hero"><div class="hero-kicker">YOUR PERSONAL FIELD GUIDE</div><h2>Learn it at the table.</h2><p>Walk through each phase, pause at the choices, and understand what to consider before you act.</p><div style="margin-top:24px"><button class="primary" data-view="guide">Resume guided play <span>→</span></button></div></div><div class="overview-cards"><div class="aside-card"><span class="eyebrow">PICK UP HERE</span><h3>${phases[state.phase]} Phase</h3><p>Round ${state.round} · ${state.turn==='you'?'Your turn':'Opponent’s turn'}</p></div><div class="aside-card"><span class="eyebrow">YOUR ROSTER</span><h3>${escapeHTML(state.army.detachment)}</h3><p>${state.army.units.length} units</p></div><div class="aside-card"><span class="eyebrow">THE APPROACH</span><h3>Understand, then act.</h3><p>Expandable prompts. No pressure to rush.</p></div></div><div class="banner">Personal study edition: core sequences and roster-specific timing reminders are available. Expand a lesson’s reference for its source and review status.</div>${prebattleView()}<div class="button-row"><button class="outline" data-action="import">Import an army</button><button class="text-button" data-action="restart">Start a fresh walkthrough</button></div><p class="footnote">WarPlanner is an independent, unofficial personal study companion.<br>Not affiliated with or endorsed by Games Workshop. Referenced trademarks belong to their owners.</p><details class="sequence-outline"><summary>References & credits</summary><p style="margin-top:14px;font-size:11px">Powered by <a href="https://40kdc.alpacasoft.dev" target="_blank" rel="noopener noreferrer">40kdc-data</a>. Community mechanics by Alpaca Software and the 40kdc community contributors, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Adaptations: selected roster coverage, rewritten study summaries, explicit timing prompts, and token-scope corrections. <a href="https://wahapedia.ru/wh40k11ed/the-rules/data-export/" target="_blank" rel="noopener noreferrer">Wahapedia</a> was also consulted. Official references and review dates are linked within each lesson.</p></details>`;}
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
 if(b.dataset.openList){openSavedList(b.dataset.openList);return;}
 if(b.dataset.view){if(b.dataset.view==='army')state.selectedListId=null;state.view=b.dataset.view;render();window.scrollTo(0,0);}
 if(b.dataset.phase!==undefined)transition({phase:Number(b.dataset.phase)});
 if(b.dataset.turn)switchGuideTurn(b.dataset.turn);
 if(b.dataset.first){if(b.dataset.first!==state.firstPlayer&&confirm('Restart the turn sequence with this first player? Your army remains saved.')){state.firstPlayer=b.dataset.first;state.round=1;state.turn=state.firstPlayer;state.phase=0;state.open=0;state.history=[];render();}}
 if(b.dataset.confirmRule){const k=Library.revision+'-'+b.dataset.confirmRule;state.confirmed[k]=!state.confirmed[k];save();b.textContent=state.confirmed[k]?'Undo my confirmation':'I checked this in my rules';}
 if(b.dataset.step!==undefined){const i=Number(b.dataset.step);state.open=i;render(true);}
 if(b.dataset.reveal!==undefined){const k=stepKey(Number(b.dataset.reveal));state.revealed[k]=!state.revealed[k];render();}
 if(b.dataset.complete!==undefined){const i=Number(b.dataset.complete),k=stepKey(i);state.completed[k]=!state.completed[k];if(state.completed[k]&&i<lessons().steps.length-1)state.open=i+1;render();}
 switch(b.dataset.action){
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
document.addEventListener('input',e=>{if(e.target.id==='unit-search'){const q=e.target.value.toLowerCase();document.querySelectorAll('.unit-card').forEach(c=>c.hidden=!c.dataset.unitName.includes(q)&&!c.querySelector('h3').textContent.toLowerCase().includes(q));}if(e.target.id==='army-text'){pendingImport=null;$('#import-feedback').innerHTML='';$('#import-form button[type=submit]').innerHTML='Review army <span>→</span>';}});
document.addEventListener('change',e=>{if(e.target.id==='guide-font-size'&&['small','medium','large'].includes(e.target.value)){state.guideFontSize=e.target.value;save();const guide=$('.guide-carousel');if(guide)guide.dataset.fontSize=state.guideFontSize;refreshUnitPreviews();}if(e.target.id==='guide-army-list'){state.setupListId=e.target.value;save();}if(e.target.id==='guide-first-player'){state.setupFirstPlayer=e.target.value;save();}if(e.target.dataset.rename){const value=e.target.value.trim();if(value){state.renames[e.target.dataset.rename]=value;save();e.target.closest('.unit-card').querySelector('h3').textContent=value;}else e.target.value=unitName(state.army.units.find(u=>u.id===e.target.dataset.rename));}});
document.addEventListener('submit',e=>{if(e.target.id==='guide-start-form'){e.preventDefault();startGuide();}});
$('#import-form').addEventListener('submit',e=>{e.preventDefault();if(pendingImport){syncActiveList();const id='list-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);state.savedLists.push({id,army:pendingImport.army,warnings:pendingImport.warnings,renames:{}});state.guideStarted=false;state.setupListId=id;state.activeListId=id;state.selectedListId=id;state.showImportedList=false;state.army=pendingImport.army;state.warnings=pendingImport.warnings;state.renames={};state.completed={};state.revealed={};state.history=[];state.phase=0;state.round=1;state.turn=state.firstPlayer;state.open=0;state.view='army';$('#import-dialog').close();pendingImport=null;render();toast('Army saved. Review your units before studying.');return;}try{pendingImport=parseArmy($('#army-text').value);$('#import-feedback').innerHTML=`<div class="banner" style="margin:15px 0 0">${pendingImport.army.units.length} entries found<br>${pendingImport.warnings.map(escapeHTML).join('<br>')}</div><div class="review-list">${pendingImport.army.units.map(u=>`<div class="review-row"><span>${escapeHTML(u.name)}${u.group?' · group '+escapeHTML(u.group):''}</span><span>${escapeHTML(u.role||'Unit')}</span></div>`).join('')}</div>`;$('#import-form button[type=submit]').innerHTML='Use this army <span>→</span>';}catch(error){$('#import-feedback').textContent=error.message;}});
render();

window.setWarPlannerAccount=(user,army)=>{
 loadAccountState('warplanner.account.'+user.id+'.v1',army||EMPTY_ARMY);
 pendingImport=null;$('#import-dialog').close();$('#army-text').value='';$('#import-feedback').innerHTML='';
 if(!state.army.units.length)state.view='army';
 render();
};
window.clearWarPlannerAccount=()=>{
 KEY=null;state=initialState(EMPTY_ARMY);pendingImport=null;
 $('#import-dialog').close();$('#army-text').value='';$('#import-feedback').innerHTML='';render();
};
