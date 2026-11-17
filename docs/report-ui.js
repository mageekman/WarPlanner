/* Guide feedback and admin review queue. All content writes require server authorization. */
(function(root){
 'use strict';
 const R=root.WarPlannerRuleReports,C=root.WarPlannerContent;
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let reviewGeneration=0,service=null,epoch=0,timer=null,pending=[],queueOpen=false,queueError='',queueBusy=false,loading=false,editing=null;
 const drafts=new Map();let practiceKeys=new WeakMap();
 const uid=()=>root.crypto.randomUUID();
 function contextKey(page){return JSON.stringify([page.context.faction,page.context.phase,page.context.turn,page.context.stepId,page.options.map(o=>o.key)]);}
 function guideHTML(page){
  if(!service?.submitReport)return '';
  const key=contextKey(page);if(!drafts.has(key))drafts.set(key,{page,selected:page.defaultKey||'',issue:page.defaultIssue||'summary',text:'',missing:'',window:page.options.find(o=>o.key===page.defaultKey)?.timing.window||'act',phase:'keep',turn:'keep',open:false,id:uid(),busy:false,message:'',error:''});
  const d=drafts.get(key);if(!d.busy)d.page=page;
  const selected=d.page.options.find(o=>o.key===d.selected),missing=d.selected==='__missing__';
  const options=['<option value="">Select a unit or rule…</option>'];let group='';
  for(const o of page.options){if(o.group!==group){if(group)options.push('</optgroup>');group=o.group;options.push(`<optgroup label="${e(group)}">`);}options.push(`<option value="${e(o.key)}" ${d.selected===o.key?'selected':''}>${e(o.name)}</option>`);}if(group)options.push('</optgroup>');options.push(`<option value="__missing__" ${missing?'selected':''}>Something is missing</option>`);
  return `<details class="think-details guide-report" ${d.open?'open':''} data-report-details="${e(key)}"><summary>${e(page.title||'Report an incorrect or missing rule')}</summary><form data-guide-report="${e(key)}"><label>Unit / ability<select name="report_entity" required ${d.busy?'disabled':''}>${options.join('')}</select></label>${d.selected?missing?`<label>Name of the missing rule<input name="report_missing_name" maxlength="180" required value="${e(d.missing)}" ${d.busy?'disabled':''}></label><label>What should it say?<textarea name="report_text" rows="4" maxlength="5000" required ${d.busy?'disabled':''}>${e(d.text)}</textarea></label><p>The administrator will confirm its units and timing before adding it.</p>`:`<label>What is wrong?<select name="report_issue" ${d.busy?'disabled':''}>${Object.entries(R.types).filter(([id])=>id!=='missing').map(([id,label])=>`<option value="${id}" ${d.issue===id?'selected':''}>${label}</option>`).join('')}</select></label>${d.issue==='timing'?`<div class="report-timing-fields"><label>Timing<select name="report_window">${Object.entries(R.windows).map(([id,label])=>`<option value="${id}" ${d.window===id?'selected':''}>${label}</option>`).join('')}</select></label><label>Phase<select name="report_phase"><option value="keep" ${d.phase==='keep'?'selected':''}>Keep current phases</option>${['Command','Movement','Shooting','Charge','Fight'].map((p,i)=>`<option value="${i}" ${String(i)===d.phase?'selected':''}>${p}</option>`).join('')}</select></label><label>Player turn<select name="report_turn">${[['keep','Keep current turn'],['you','Your turn'],['opponent','Opponent’s turn'],['either','Either turn']].map(([v,l])=>`<option value="${v}" ${d.turn===v?'selected':''}>${l}</option>`).join('')}</select></label></div>`:''}<label>What should be changed?<textarea name="report_text" rows="4" maxlength="5000" required ${d.busy?'disabled':''}>${e(d.text)}</textarea></label><p>${d.issue==='summary'?'Enter the replacement rule summary.':d.issue==='targets'?'Enter the replacement target wording.':d.issue==='timing'?'The timing selections are the proposed correction; use this box to explain it.':'Describe the correction. The administrator will choose the exact fields with Edit.'}</p>`:''}<p class="report-message ${d.error?'report-error':''}" role="status">${e(d.error||d.message)}</p><button type="submit" class="outline" ${!selected&&!missing||d.busy?'disabled':''}>${d.busy?'Sending…':'Submit report'}</button></form></details>`;
 }
 function renderGuide(key){for(const form of document.querySelectorAll('[data-guide-report]')){if(form.dataset.guideReport!==key)continue;const holder=form.closest('[data-report-container]'),panel=form.closest('[data-report-details]'),draft=drafts.get(key);if(panel)draft.open=panel.open;if(holder)holder.innerHTML=guideHTML(draft.page);}}
 function recordForm(form){const d=drafts.get(form.dataset.guideReport);if(!d)return null;const panel=form.closest('[data-report-details]');if(panel)d.open=panel.open;const fd=new FormData(form);d.text=String(fd.get('report_text')??d.text);d.missing=String(fd.get('report_missing_name')??d.missing);d.window=String(fd.get('report_window')??d.window);d.phase=String(fd.get('report_phase')??d.phase);d.turn=String(fd.get('report_turn')??d.turn);return d;}
 async function send(form){
  const d=recordForm(form);if(!d||d.busy||!service)return;
  const option=d.page.options.find(o=>o.key===d.selected),missing=d.selected==='__missing__',issue=missing?'missing':d.issue;
  const payload={id:d.id,issue_type:issue,change_text:d.text.trim(),context:d.page.context,observed:option?.observed||{},entity_key:option?.key||null,base_revision:option?.revision||null,missing_name:missing?d.missing.trim():null,timing:issue==='timing'?{window:d.window,phase:d.phase==='keep'?option.timing.phase:[Number(d.phase)],turn:d.turn==='keep'?option.timing.turn:d.turn}:{}};
  const signature=JSON.stringify({...payload,id:null});if(d.sentSignature&&d.sentSignature!==signature){d.id=uid();payload.id=d.id;}d.sentSignature=signature;
  const current=service,session=epoch,key=form.dataset.guideReport;
  try{R.validateSubmission(payload);d.busy=true;d.error='';renderGuide(key);await current.submitReport(payload);if(epoch!==session)return;d.busy=false;d.message='Report sent to the Rules Workshop. Thank you.';d.text='';d.missing='';d.selected='';d.id=uid();d.sentSignature=null;renderGuide(key);if(current.isAdmin)void reload();}
  catch(error){if(epoch!==session)return;d.busy=false;d.error=error.message||'Could not send the report. Your draft is still here.';renderGuide(key);}
 }
 function count(){return pending.length;}
 function badgeHTML(){return `<span class="report-nav-badge" data-report-badge role="status" aria-label="${count()} pending rule reports" ${count()?'':'hidden'}>${count()}</span>`;}
 function queueHTML(){
  if(!service?.isAdmin)return '';
  const reports=pending;
  return `<details class="report-queue" ${queueOpen?'open':''} data-report-queue><summary>Submitted reports <span>${count()} pending</span></summary><div class="report-queue-toolbar"><button type="button" class="outline" data-report-action="reload" ${loading||queueBusy?'disabled':''}>Refresh reports</button></div><p class="report-message ${queueError?'report-error':''}" role="status">${e(queueError||(loading?'Loading reports…':''))}</p>${reports.map(report=>{
   let reason=R.directReviewReason(report,service.records);if(!reason){try{R.proposal(report,service.records);}catch(error){reason=error.message;}}
   const timing=report.issue_type==='timing'?`${R.windows[report.timing.window]||report.timing.window} · ${(Array.isArray(report.timing?.phase)?report.timing.phase:[]).map(i=>['Command','Movement','Shooting','Charge','Fight'][i]).join(', ')||'Reference only'} · ${report.timing.turn==='you'?'Your turn':report.timing.turn==='opponent'?'Opponent’s turn':'Either turn'}`:'';
   return `<article class="report-card"><div class="report-card-heading"><h3>${e(report.entity_name||report.missing_name)}</h3><span>${e(R.types[report.issue_type]||report.issue_type)}</span></div><p>${e(report.faction)} · ${e(report.context?.stepTitle||'Guide')} · ${e(new Date(report.created_at).toLocaleString())}</p>${report.observed?.summary?`<details class="report-observed"><summary>Text shown to the player</summary><p>${e(report.observed.summary)}</p></details>`:''}${timing?`<p class="report-proposed-timing">Proposed timing: ${e(timing)}</p>`:''}<p class="report-change">${e(report.change_text)}</p>${reason?`<p class="report-review-note">${e(reason)}</p>`:''}<div class="button-row"><button type="button" class="primary" data-report-action="approve" data-report-id="${e(report.id)}" ${reason||queueBusy?'disabled':''}>Approve</button><button type="button" class="outline" data-report-action="edit" data-report-id="${e(report.id)}" ${queueBusy?'disabled':''}>Edit</button><button type="button" class="text-button" data-report-action="reject" data-report-id="${e(report.id)}" ${queueBusy?'disabled':''}>Reject</button></div></article>`;
  }).join('')||(!loading?'<p class="report-empty">No pending reports.</p>':'')}</details>`;
 }
 function updateQueue(){
  document.querySelectorAll('[data-report-badge]').forEach(b=>{b.hidden=!count();b.textContent=count();b.setAttribute('aria-label',count()+' pending rule reports');});
  const box=document.querySelector('#rule-report-queue');if(box)box.innerHTML=queueHTML();
 }
 async function reload(){
  if(!service?.isAdmin||!service.listReports||loading||queueBusy)return;
  const current=service,session=epoch,generation=reviewGeneration;loading=true;
  try{const reports=await current.listReports('pending');if(session!==epoch||generation!==reviewGeneration)return;pending=reports.filter(report=>report.status==='pending');queueError='';}
  catch(error){if(session===epoch&&generation===reviewGeneration)queueError=error.message||'Could not load reports.';}
  finally{if(session===epoch){loading=false;updateQueue();}}
 }
 async function decide(report,decision,proposal=null,mode='direct'){
  if(queueBusy||!service?.isAdmin)throw Error('A review is already in progress.');
  const current=service,session=epoch;reviewGeneration++;queueBusy=true;queueError='';updateQueue();
  try{
   const result=await current.reviewReport(report,decision,proposal,mode);if(session!==epoch)throw Error('This account session has ended.');
   pending=pending.filter(r=>r.id!==report.id);updateQueue();
   if(decision==='approve'){
    try{await current.reload();if(session!==epoch)throw Error('This account session has ended.');C.apply(current.records);}
    catch(error){if(session!==epoch)throw error;queueError='Report approved, but the rules could not refresh. Refresh the page to load the saved change.';}
   }
   return result;
  }finally{if(session===epoch){queueBusy=false;updateQueue();}}
 }
 function reviewBanner(){return !editing?'':`<section class="report-editor-banner"><strong>Reviewing a player report · ${e(R.types[editing.issue_type])}</strong><p>${e(editing.change_text)}</p>${editing.issue_type==='timing'?`<p>Proposed timing: ${e(R.windows[editing.timing.window])}</p>`:''}${editing.issue_type==='missing'?'<p>Choose the new rule’s units, detachment and timing before approving. It starts as a reference entry.</p>':''}<p>Approving saves this draft and preserves the previous catalog revision.</p></section>`;}
 document.addEventListener('toggle',event=>{const el=event.target;if(el.matches?.('[data-report-details]')){const d=drafts.get(el.dataset.reportDetails);if(d)d.open=el.open;}if(el.matches?.('[data-report-queue]'))queueOpen=el.open;},true);
 document.addEventListener('input',event=>{const form=event.target.closest?.('[data-guide-report]');if(form)recordForm(form);});
 document.addEventListener('change',event=>{
  const form=event.target.closest?.('[data-guide-report]');
  if(form){const d=recordForm(form);if(!d)return;d.error='';d.message='';if(event.target.name==='report_entity'){d.selected=event.target.value;d.text='';d.missing='';d.id=uid();const selected=d.page.options.find(o=>o.key===d.selected);d.window=selected?.timing.window||'act';d.phase='keep';d.turn='keep';}if(event.target.name==='report_issue'){d.issue=event.target.value;d.id=uid();}if(['report_entity','report_issue'].includes(event.target.name))renderGuide(form.dataset.guideReport);}
 });
 document.addEventListener('submit',event=>{if(event.target.matches?.('[data-guide-report]')){event.preventDefault();void send(event.target);}});
 document.addEventListener('click',async event=>{
  const button=event.target.closest?.('[data-report-action]');if(!button||!service?.isAdmin)return;const action=button.dataset.reportAction;
  if(action==='reload'){void reload();return;}const report=pending.find(r=>r.id===button.dataset.reportId);if(!report||queueBusy)return;
  try{if(action==='edit'){const current=service,session=epoch;queueBusy=true;updateQueue();try{if(current.workshopReady===false&&current.ensureWorkshop)await current.ensureWorkshop();else await current.reload();if(session!==epoch)return;C.apply(current.records);if(root.WarPlannerAdminPage.openReport(report)){editing=report;root.refreshWarPlannerContent?.();}}finally{if(session===epoch){queueBusy=false;updateQueue();}}return;}
   if(action==='approve'){const reason=R.directReviewReason(report,service.records);if(reason)throw Error(reason);await decide(report,'approve',R.proposal(report,service.records));}
   if(action==='reject'){await decide(report,'reject');if(editing?.id===report.id){root.WarPlannerAdminPage.discardReport();editing=null;root.refreshWarPlannerContent?.();}}
  }catch(error){queueError=error.message;updateQueue();}
 });
 root.addEventListener?.('focus',()=>{void reload();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void reload();});
 root.WarPlannerReports={practiceForQuestion(question){if(!service)return '';if(!practiceKeys.has(question))practiceKeys.set(question,uid());return guideHTML(R.practiceContext(question,service.records,practiceKeys.get(question)));},guideForStep(state,active,deck){return service?guideHTML(R.pageContext(state,active,deck,service.records)):'';},guideHTML,badgeHTML,queueHTML,count,reviewBanner,get editing(){return editing;},clearEditing(){editing=null;},async approveEdited(draft){if(!editing)throw Error('No report is being edited.');const result=await decide(editing,'approve',draft,'edited');editing=null;return result.entry;},
  setService(next){epoch++;if(timer)clearInterval(timer);timer=null;service=next;pending=[];drafts.clear();practiceKeys=new WeakMap();editing=null;queueError='';queueBusy=false;loading=false;queueOpen=false;if(next?.isAdmin&&next.listReports){void reload();timer=setInterval(()=>{if(!document.hidden)void reload();},30000);}},reload
 };
})(window);
