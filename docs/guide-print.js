/* A self-contained print snapshot; never changes the live guide or its caches. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports,L=node?require('./lessons.js'):root.WarPlanLessons,A=node?require('./activations.js'):root.WarPlanActivations,D=node?require('./dispositions.js'):root.WarPlannerDispositions;
 const phases=['Command','Movement','Shooting','Charge','Fight'],e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function ruleName(rule){return rule.borrowedEffect?(L.abilities.find(r=>r.id===rule.id)?.name||rule.name):rule.name;}
 function ruleHTML(rule){return `<article class="rule rule-card"><h4>${e(ruleName(rule))}</h4></article>`;}
 function deckHTML(deck,state){
  const shared=deck.shared.map(ruleHTML).join('');
  const units=deck.unitCards.filter(card=>card.items.length||card.fightsFirst).map(card=>{
   const name=(card.unit.members||[card.unit.body]).filter(Boolean).map(m=>state.renames?.[m.id]||m.name).join(' + ');
   const names=[...new Set([...(card.fightsFirst?['Fights First']:[]),...card.items.map(ruleName)])];
   return `<article class="unit rule-card"><h4>${e(name)}</h4><ul class="rule-names">${names.map(name=>`<li>${e(name)}</li>`).join('')}</ul></article>`;
  }).join('');
  return shared+units;
 }
 function build(state){
  const snapshot=structuredClone(state),session=A.createSession(),sections=[];
  for(const turn of ['you','opponent'])for(let phase=0;phase<5;phase++){
   const s={...snapshot,turn,phase},any=session.anyTime(s),steps=A.steps(s),pages=[];
   const anyCards=deckHTML(any,s);if(anyCards)pages.push(`<section class="step"><h3>Any time</h3><div class="cards">${anyCards}</div></section>`);
   for(const step of steps){const deck=session.stepDeck(s,step),missions=D.reminders(s,step);
    const cards=missions.map(m=>ruleHTML({name:m.title})).join('')+deckHTML(deck,s);
    if(s.guideShowEmptyTimings!==true&&!cards)continue;
    const title=s.guideMode!=='learn'&&['movement','shooting','charge','fight'].includes(step.activationMode)?'During '+phases[phase]:step.title;
    pages.push(`<section class="step"><h3>${e(title)}</h3><div class="cards">${cards}</div></section>`);
   }
   sections.push(`<section class="phase" data-current="${phase===snapshot.phase&&turn===snapshot.turn}"><h2>${turn==='you'?'Your turn':'Opponent’s turn'} · ${phases[phase]} phase</h2>${pages.join('')}</section>`);
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(snapshot.army.name)} — WarPlanner guide</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1f1f1;color:#171717;font:14px/1.5 system-ui,sans-serif}.toolbar{padding:16px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;background:#fff;border-bottom:1px solid #bbb}.toolbar button,.toolbar select{padding:10px;font:inherit;min-height:44px}.toolbar p{flex-basis:100%;margin:0;text-align:center;font-size:12px}main{max-width:900px;margin:20px auto;background:white;padding:28px}h1{font-size:25px;line-height:1.3;margin:0 0 8px}main>p{font-size:12px;color:#444;margin:4px 0}.phase{border:1px solid #aaa;border-radius:8px;padding:14px 16px;margin-top:16px}.phase>h2{font-size:18px;margin:0;padding:0 0 8px;border-bottom:1px solid #aaa;line-height:1.4}.step{margin-top:10px}.step>h3{font-size:13px;margin:0 0 6px;line-height:1.5}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.rule-card{border:1px solid #ccc;border-radius:5px;padding:8px 10px;min-width:0;break-inside:avoid;overflow-wrap:anywhere}.rule-card h4{font-size:12px;line-height:1.4;margin:0;font-weight:650}.rule-names{margin:5px 0 0;padding-left:15px;font-size:11px;line-height:1.5}.rule-names li+li{margin-top:2px}h1,h2,h3,h4{break-after:avoid}body.current .phase[data-current="false"]{display:none}@page{size:auto;margin:12mm}@media print{body{background:#fff;font-size:10pt}.toolbar{display:none}main{max-width:none;margin:0;padding:0}h1{font-size:18pt}main>p{font-size:9pt}.phase{margin-top:10px;padding:10px 12px;border-color:#999}.phase>h2{font-size:13pt}.step{margin-top:8px}.step>h3{font-size:10pt}.rule-card{padding:6px 8px}.rule-card h4{font-size:9pt}.rule-names{font-size:8.5pt}.cards{gap:5px}}@media screen and (max-width:600px){main{padding:16px;margin:0}.phase{padding:12px}.cards{grid-template-columns:1fr}}

</style></head><body><div class="toolbar"><label>Include <select id="print-scope"><option value="all">Whole guide · both turns</option><option value="current">Current phase and turn</option></select></label><button type="button" id="print-button">Print / Save PDF</button><button type="button" id="save-button">Save offline copy</button><p>To save a PDF, choose “Save as PDF” in your browser’s print options. The offline copy opens in a browser without signing in.</p></div><main><h1>${e(snapshot.army.name)} — Checklist</h1><p>${e(snapshot.army.faction)} · ${e(L.armyDetachments(snapshot.army).join(' · '))}</p><p>Battle round ${e(snapshot.round||1)}</p>${sections.join('')}</main><script>
document.getElementById('print-scope').addEventListener('change',function(){document.body.classList.toggle('current',this.value==='current')});document.getElementById('print-button').addEventListener('click',function(){window.print()});document.getElementById('save-button').addEventListener('click',function(){document.querySelectorAll('option').forEach(function(option){option.toggleAttribute('selected',option.selected)});const file=new Blob(['<!doctype html>'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='warplanner-guide.html';link.click();setTimeout(function(){URL.revokeObjectURL(url)},1000)});
</script></body></html>`;
 }
 function open(state){const popup=root.open('','_blank');if(!popup){root.alert('Allow popups for WarPlanner to open the printable guide.');return false;}try{popup.opener=null;popup.document.open();popup.document.write(build(state));popup.document.close();return true;}catch(error){popup.close();throw error;}}
 const api={build,open};if(node)module.exports=api;else root.WarPlannerGuidePrint=api;
})(typeof window!=='undefined'?window:globalThis);
