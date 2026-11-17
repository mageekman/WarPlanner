/* First-visit help. Dismissal is scoped to the signed-in account on this device. */
(function(root){
 'use strict';
 const steps=[
  {title:'Welcome to WarPlanner',body:'Get to know your army, then take it to the table. WarPlanner brings your rules, practice questions and phase reminders together.',items:['Bring your army: import a list or create one here.','Learn your rules: quiz yourself on a saved list or a whole faction.','Play with confidence: follow a guide built around your list.'],note:'Use it at your own pace. You don’t have to record every move or keep the game state up to date.'},
  {title:'1. Bring your army',body:'Open My army and choose Import list or Create list.',items:['Import: paste a text export from the official Warhammer 40,000 app, New Recruit, or another supported list tool.','Review the imported units and detachment, then save the list.','Create: choose your faction and detachment, add your units, then save.'],note:'Already have a list? Importing is the quickest way to get going.',actions:[['Import list','import'],['Create list','create-list']]},
  {title:'2. Get familiar with your rules',body:'Open Practice, choose your saved list or a faction, then pick the question types and set length.',items:['Use your list to focus on the units and rules you’ll actually bring.','Choose a faction to study more of its rules, even before you have a saved list.','Check the explanations after answering. Try Know Your Opponent when you want to learn another faction.'],note:'You can practise before a game or come back to the questions you missed.',actions:[['Open Practice','practice','view']]},
  {title:'3. Take your list to the table',body:'Open Guided play, select your saved list and review the settings before pressing Start.',items:['Choose Learn to play for step-by-step core instructions alongside your army rules.','Choose Quick guide when you want a faster cheat sheet during a game.','Move through the phases, expand the rules you need, and mark reminders as reviewed if that helps.'],note:'The guide uses your list and the phase you choose. Check the tabletop situation and each rule’s conditions before using an ability.',actions:[['Open Guided play','guide','view']]}
 ];
 let account=null,index=0,dialog=null;
 const dismissed=new Set(),key=()=>account?'warplanner.onboarding.'+account+'.v1':null;
 function finish(){if(account){dismissed.add(account);try{localStorage.setItem(key(),'done');}catch{}}dialog?.close();}
 function draw(){
  const step=steps[index];
  dialog.innerHTML=`<header><span class="eyebrow">GETTING STARTED · ${index+1} OF ${steps.length}</span><button type="button" class="icon-button" data-onboarding="close" aria-label="Close welcome guide">×</button></header><h2 id="welcome-title" tabindex="-1">${step.title}</h2><p>${step.body}</p><ol>${step.items.map(item=>`<li>${item}</li>`).join('')}</ol><p class="welcome-note">${step.note}</p>${step.actions?`<div class="button-row">${step.actions.map(([label,target,kind])=>`<button type="button" class="outline" data-onboarding="launch" ${kind==='view'?'data-view':'data-action'}="${target}">${label}</button>`).join('')}</div>`:''}<footer><button type="button" class="text-button" data-onboarding="close">Skip for now</button><div>${index?'<button type="button" class="outline" data-onboarding="back">Back</button>':''}<button type="button" class="primary" data-onboarding="next">${index===steps.length-1?'Finish':'Next →'}</button></div></footer><small>Reopen this walkthrough from Getting started in the navigation.</small>`;
  dialog.querySelector('h2')?.focus();
 }
 function open(){
  index=0;
  if(!dialog){dialog=document.createElement('dialog');dialog.className='welcome-dialog';dialog.setAttribute('aria-labelledby','welcome-title');document.body.append(dialog);dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});}
  draw();if(!dialog.open)dialog.showModal();dialog.querySelector('h2')?.focus();
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-onboarding]');if(!button)return;
  const action=button.dataset.onboarding;
  if(action==='close'||action==='launch')finish();
  else if(action==='back'){index=Math.max(0,index-1);draw();}
  else if(action==='next'){if(index===steps.length-1)finish();else{index++;draw();}}
 });
 root.WarPlannerOnboarding={open,setAccount(id){dialog?.close();account=id;if(!id)return;let seen=dismissed.has(id);try{seen=seen||localStorage.getItem(key())==='done';}catch{}if(!seen)open();},clear(){dialog?.close();account=null;}};
})(window);
