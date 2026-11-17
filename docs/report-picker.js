/* Browse reportable rules without starting a game guide. */
(function(root){
 'use strict';
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const types={army:'Army / Detachment',ability:'Ability',core:'Core rule','core-stratagem':'Core stratagem',stratagem:'Stratagem',enhancement:'Enhancement'};
 const memberships=row=>row.data.memberships||[{faction:row.faction,detachments:[row.data.detachment].filter(Boolean)}];
 function rules(records){return records.filter(r=>r.kind==='rule'&&r.enabled!==false&&r.data.siteExcluded!=='combat-patrol'&&!r.data.sharedRuleId);}
 function factions(records){return [...new Set(rules(records).flatMap(r=>memberships(r).map(m=>m.faction)).filter(f=>f&&f!=='*'))].sort();}
 function detachments(records,faction){return [...new Set(rules(records).flatMap(r=>memberships(r).filter(m=>!faction||m.faction==='*'||norm(m.faction)===norm(faction)).flatMap(m=>m.detachments||[])))].sort();}
 function filter(records,{faction='',detachment='',type='',search=''}={}){
  const words=String(search).toLowerCase().trim().split(/\s+/).filter(Boolean);
  return rules(records).filter(r=>memberships(r).some(m=>(!faction||m.faction==='*'||norm(m.faction)===norm(faction))&&(!detachment||!m.detachments?.length||m.detachments.some(d=>norm(d)===norm(detachment))))&&(!type||r.data.category===type)&&words.every(w=>[r.name,r.data.summary,...(r.data.units||[])].join(' ').toLowerCase().includes(w))).sort((a,b)=>a.name.localeCompare(b.name)||a.key.localeCompare(b.key));
 }
 const api={filter,factions,detachments};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
 let dialog=null,filters={faction:'',detachment:'',type:'',search:''};
 const records=()=>root.WarPlannerReports?.reportRecords||[];
 function options(values,selected,label){return `<option value="">${label}</option>`+values.map(v=>`<option value="${e(v)}" ${v===selected?'selected':''}>${e(v)}</option>`).join('');}
 function results(){
  const rows=filter(records(),filters),box=dialog.querySelector('[data-picker-results]');
  box.innerHTML=`<p role="status">${rows.length} ${rows.length===1?'rule':'rules'} found${rows.length>50?' · Showing the first 50. Narrow your search to see more.':''}</p>${rows.slice(0,50).map(r=>`<button type="button" class="report-picker-result" data-pick-rule="${e(r.key)}"><strong>${e(r.name)}</strong><span>${e(memberships(r).map(m=>m.faction==='*'?'All factions':m.faction+(m.detachments?.length?' · '+m.detachments.join(', '):'')).join(' / '))} · ${e(types[r.data.category]||r.data.category)}</span></button>`).join('')||'<p>No rules match. Try a shorter search or clear a filter.</p>'}`;
 }
 function draw(){
  dialog.innerHTML=`<header><h2 id="report-picker-title">Report a rule error</h2><button type="button" class="icon-button" data-picker-close aria-label="Close rule picker">×</button></header><p>Find the rule, select it, then tell us what needs changing.</p><div class="report-picker-filters"><label>Faction<select data-picker-filter="faction">${options(factions(records()),filters.faction,'All factions')}</select></label><label>Detachment<select data-picker-filter="detachment">${options(detachments(records(),filters.faction),filters.detachment,'All detachments / shared rules')}</select></label><label>Rule type<select data-picker-filter="type"><option value="">All rule types</option>${Object.entries(types).map(([id,name])=>`<option value="${id}" ${filters.type===id?'selected':''}>${name}</option>`).join('')}</select></label><label class="report-picker-search">Search rules<input type="search" data-picker-filter="search" value="${e(filters.search)}" placeholder="Rule name, unit, or wording…"></label></div><div data-picker-results></div><div data-picker-form></div>`;
  results();
 }
 function open(){
  if(!dialog){dialog=document.createElement('dialog');dialog.className='report-picker-dialog';dialog.setAttribute('aria-labelledby','report-picker-title');document.body.append(dialog);}
  filters={faction:'',detachment:'',type:'',search:''};draw();
  if(!root.WarPlannerReports?.canReport)dialog.querySelector('[data-picker-results]').innerHTML='<p role="status">Reporting is unavailable. Sign in again and retry.</p>';
  if(!dialog.open)dialog.showModal();dialog.querySelector('input')?.focus();
 }
 document.addEventListener('input',event=>{if(event.target.dataset?.pickerFilter==='search'){filters.search=event.target.value;results();dialog.querySelector('[data-picker-form]').innerHTML='';}});
 document.addEventListener('change',event=>{const field=event.target.dataset?.pickerFilter;if(!field||field==='search')return;filters[field]=event.target.value;if(field==='faction'){filters.detachment='';draw();dialog.querySelector('[data-picker-filter="faction"]').focus();}else{results();dialog.querySelector('[data-picker-form]').innerHTML='';}});
 document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-picker-close]')){dialog?.close();return;}
  const button=event.target.closest?.('[data-pick-rule]');if(!button)return;
  const row=records().find(r=>r.key===button.dataset.pickRule);if(!row)return;
  const box=dialog.querySelector('[data-picker-form]');box.innerHTML=`<h3>${e(row.name)}</h3><div data-report-container>${root.WarPlannerReports.catalogForRule(row,filters.faction)}</div>`;box.scrollIntoView({block:'nearest',behavior:'smooth'});box.querySelector('select')?.focus({preventScroll:true});
 });
 root.WarPlannerReportPicker={...api,open,close(){dialog?.close();}};
})(typeof window!=='undefined'?window:globalThis);
