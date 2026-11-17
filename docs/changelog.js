/* Public release notes, shared by signed-in and signed-out visitors. */
(function(root){
 'use strict';
 const entries=[{date:'2026-11-17',label:'November 16–17, 2026',title:'WarPlanner feature updates',items:[
  ['Learn to Play','Step-by-step core rules alongside your army’s abilities, with examples, quick questions, and collapsible explanations.'],
  ['Smoother Game Guide','Faster loading and swiping, optional empty-step skipping, an “Any time” rules section, and improved progress saving.'],
  ['More Guide Control','Settings before starting, rule-type filters, a collapsible phase overview, and optional disposition matchup reminders.'],
  ['Better Practice','Opponent faction and detachment quizzes, ability descriptions in answer choices, and redacted unit names to prevent giveaways.'],
  ['Improved Army Lists','Clearer import warnings, grouped factions and units, detachment-specific dispositions, unit duplication, and confirmation when adding units.'],
  ['Print & Save','Export a compact guide checklist for printing, saving as PDF, or viewing offline.'],
  ['Easier Getting Started','A welcome walkthrough with shortcuts to lists, practice, and guided play, plus password confirmation at signup.'],
  ['Better Rules & Feedback','More accurate rule matching, source and timing corrections, searchable rule reporting, and improved admin review tools.'],
  ['Visual Polish','Updated logo and favicon, simpler rule cards, aligned controls, and the restored dark theme.']
 ]}];
 const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){return `<header class="changelog-header"><h2 id="changelog-title">Changelog</h2><button type="button" class="icon-button" data-close-changelog aria-label="Close changelog" autofocus>×</button></header>${entries.map(entry=>`<article class="changelog-entry"><time datetime="${e(entry.date)}">${e(entry.label)}</time><h3>${e(entry.title)}</h3><ul>${entry.items.map(([name,description])=>`<li><strong>${e(name)}:</strong> ${e(description)}</li>`).join('')}</ul></article>`).join('')}`;}
 if(typeof module!=='undefined'&&module.exports){module.exports={entries,render};return;}
 let dialog=null;
 function open(){if(!dialog){dialog=document.createElement('dialog');dialog.className='changelog-dialog';dialog.setAttribute('aria-labelledby','changelog-title');dialog.innerHTML=render();document.body.append(dialog);}if(!dialog.open)dialog.showModal();}
 document.addEventListener('click',event=>{if(event.target.closest?.('[data-open-changelog]'))open();else if(event.target.closest?.('[data-close-changelog]'))dialog?.close();});
 root.WarPlannerChangelog={open};
})(typeof window!=='undefined'?window:globalThis);
