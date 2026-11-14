/* Reviewed, admin-only import workflow. No catalog writes happen during parsing. */
(function(root){
 'use strict';
 const I=root.WarPlannerRulesImport,C=root.WarPlannerContent,L=root.WarPlanLessons;
 let service=null,active=false,busy=false,files=[],review=null,notice='',error='',faction='Aeldari',group='Xenos',generation=0,finished=false;
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const refresh=()=>root.refreshWarPlannerContent?.();
 function clear(){generation++;active=false;busy=false;files=[];review=null;notice='';error='';finished=false;}
 function dirty(){return busy||!finished&&(files.length>0||!!review);}
 function canLeave(){return !busy&&(!dirty()||root.confirm('Discard the remaining import selections? Your saved catalog will stay as it is.'));}
 function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function choices(entry,index){
  if(entry.error)return '<span class="admin-import-error">'+e(entry.error)+'</span>';
  const values=entry.before?[['skip','Skip'],...(entry.source?[['source','Source details only']]:[]),['replace','Replace content']]:[['add','Add'],['skip','Skip']];
  return `<label class="import-choice-label">Action<select data-import-choice="${index}" aria-label="Import action for ${e(entry.name)}" ${busy?'disabled':''}>${values.map(([v,label])=>`<option value="${v}" ${entry.action===v?'selected':''}>${label}</option>`).join('')}</select></label>`;
 }
 function preview(){
  if(!review)return '';
  const selected=review.rows.filter(r=>r.action!=='skip').length,updates=review.rows.filter(r=>r.before).length,invalid=review.rows.filter(r=>r.error).length;
  return `<section class="import-review"><h2>Review the import</h2><p>${review.rows.length} entries · ${review.rows.length-updates} new · ${updates} existing · ${invalid} need attention</p><p>Source details only keeps your existing summaries, timing, badges and unit settings. Replace content uses the proposed imported fields. New source rules start as reference-only.</p><div class="button-row"><button type="button" class="outline" data-import-action="new-only" ${busy?'disabled':''}>New entries only</button><button type="button" class="outline" data-import-action="include-source" ${busy?'disabled':''}>Include source updates</button><button type="button" class="text-button" data-import-action="skip-all" ${busy?'disabled':''}>Skip all</button></div>${review.warnings.length?`<details class="import-warnings"><summary>${review.warnings.length} source notes</summary><ul>${review.warnings.map(w=>`<li>${e(w)}</li>`).join('')}</ul></details>`:''}<div class="import-entry-list">${review.rows.map((entry,index)=>{
   const changed=entry.before?Object.keys(entry.proposed.data).filter(k=>JSON.stringify(entry.before.data[k])!==JSON.stringify(entry.proposed.data[k])):[];
   const source=entry.proposed.data.importSource,view=entry.kind==='rule'?root.WarPlannerMechanics.enrich(entry.proposed.data):entry.proposed.data,beforeView=entry.before?(entry.kind==='rule'?root.WarPlannerMechanics.enrich(entry.before.data):entry.before.data):null;
   return `<article class="import-entry"><div class="import-entry-heading"><div><strong>${e(entry.name)}</strong><small>${e(entry.kind)} · ${e(entry.proposed.faction||'Faction registry')} · ${entry.before?'Matches existing entry':'New entry'}${entry.proposed.data.referenceOnly?' · Reference only':''}</small></div>${choices(entry,index)}</div><details><summary>Inspect source and proposed changes</summary>${entry.before?`<p>Different fields: ${e(changed.join(', ')||'none')}.</p><p><strong>Current summary:</strong> ${e(beforeView.summary||entry.before.data.description||entry.before.name)}</p>`:''}<p><strong>Proposed summary:</strong> ${e(view.summary||entry.proposed.data.description||entry.proposed.name)}</p>${source?.text?`<p class="import-source-text">${e(source.text)}</p>`:''}<details><summary>Proposed data</summary><pre>${e(JSON.stringify(entry.proposed.data,null,2))}</pre></details></details></article>`;
  }).join('')}</div><div class="import-apply"><p id="import-selection-count">${selected} entries selected. This save is one transaction; a conflict rolls back the entire batch.</p><button type="button" class="primary" data-import-action="apply" ${busy||!selected?'disabled':''}>${busy?'Importing…':'Import selected entries'}</button></div></section>`;
 }
 function render(){
  if(!service?.isAdmin)return '<section class="empty-card"><h1>Administrator access required</h1></section>';
  return `<section id="rules-import-page"><header class="heading"><div><div class="eyebrow">RULES WORKSHOP</div><h1>Import rules & source data</h1><p>Choose files, inspect the changes, then save the entries you select.</p></div><button type="button" class="outline" data-import-action="close" ${busy?'disabled':''}>Back to workshop</button></header><p class="admin-notice ${error?'admin-error':''}" role="status">${e(error||notice||'Choosing or previewing files does not change the database.')}</p><section class="import-inputs"><div class="import-help"><h2>Choose your source</h2><p><strong>40kdc:</strong> extract the GitHub ZIP, then select JSON files from a faction’s core and enrichment folders. Include abilities, units, detachments and phase mappings when available.</p><p><strong>Wahapedia:</strong> select its CSV exports together. Include Factions, Datasheets, Abilities and Datasheets_abilities to link rules to units; detachments, enhancements and Stratagems are supported too.</p><p>Imports update the shared rules catalog; saved army lists stay unchanged.</p><p><strong>WarPlanner:</strong> import an exported catalog or use the JSON template. PDF and ZIP contents are not parsed here.</p></div><div class="import-options"><label>Faction<input id="rules-import-faction" value="${e(faction)}" list="rules-import-factions" maxlength="100" ${busy?'disabled':''}><datalist id="rules-import-factions">${L.catalog.factions.map(f=>`<option value="${e(f.name)}"></option>`).join('')}</datalist></label><label>Group for a new faction<select id="rules-import-group" ${busy?'disabled':''}>${['Imperium','Chaos','Xenos'].map(g=>`<option ${group===g?'selected':''}>${g}</option>`).join('')}</select></label></div><div class="button-row"><label class="outline import-file-label">Add files<input id="rules-import-files" type="file" accept=".json,.csv,.txt" multiple ${busy?'disabled':''}></label><label class="outline import-file-label">Add extracted folder<input id="rules-import-folder" type="file" webkitdirectory multiple ${busy?'disabled':''}></label><button type="button" class="text-button" data-import-action="template" ${busy?'disabled':''}>Download JSON template</button><button type="button" class="text-button" data-import-action="export" ${busy?'disabled':''}>Export catalog backup</button></div><div class="import-files">${files.length?`<p>${files.length} files ready</p><details><summary>Selected files</summary><ul>${files.map(f=>`<li>${e(f.name)}</li>`).join('')}</ul></details>`:'<p>No files selected yet. You can add files from more than one folder.</p>'}</div><div class="button-row"><button type="button" class="primary" data-import-action="preview" ${busy||!files.length?'disabled':''}>Build import preview</button><button type="button" class="text-button" data-import-action="clear" ${busy?'disabled':''}>Clear files</button></div></section>${preview()}</section>`;
 }
 document.addEventListener('input',event=>{
  if(!active||busy||!service?.isAdmin)return;
  if(event.target.id==='rules-import-faction'){faction=event.target.value;review=null;finished=false;document.querySelector('.import-review')?.remove();}
 });
 document.addEventListener('change',async event=>{
  if(!active||busy||!service?.isAdmin)return;
  if(event.target.id==='rules-import-group'){group=event.target.value;review=null;finished=false;document.querySelector('.import-review')?.remove();return;}
  if(event.target.dataset.importChoice!==undefined){const entry=review?.rows[Number(event.target.dataset.importChoice)];if(entry&&!entry.error){entry.action=event.target.value;finished=false;const count=review.rows.filter(r=>r.action!=='skip').length;document.querySelector('#import-selection-count').textContent=count+' entries selected. This save is one transaction; a conflict rolls back the entire batch.';document.querySelector('[data-import-action="apply"]').disabled=!count;}return;}
  if(!['rules-import-files','rules-import-folder'].includes(event.target.id))return;
  const current=service,version=generation,incoming=[...event.target.files];busy=true;error='';refresh();
  try{
   const supported=incoming.filter(f=>/\.(json|csv|txt)$/i.test(f.name));if(!supported.length)throw Error('Choose JSON or CSV source files. Extract ZIP archives first.');
   if(supported.length+files.length>300)throw Error('Choose at most 300 source files. Select one faction’s folders rather than the entire repository.');
   if(supported.reduce((a,f)=>a+f.size,0)+files.reduce((a,f)=>a+f.text.length,0)>20*1024*1024)throw Error('Choose files totaling at most 20 MB.');
   const loaded=[];for(const f of supported){loaded.push({name:f.webkitRelativePath||f.name,text:await f.text()});if(current!==service||version!==generation)return;}
   for(const file of loaded){const match=files.findIndex(f=>f.name===file.name);if(match>=0)files[match]=file;else files.push(file);}
   review=null;finished=false;notice='Files loaded locally. Build a preview to inspect the changes.';
  }catch(e){if(current===service)error=e.message;}
  finally{if(current===service&&version===generation){busy=false;refresh();}}
 });
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button'),action=button?.dataset.importAction;if(!action||!active||busy||!service?.isAdmin)return;
  if(action==='close'){if(canLeave()){clear();refresh();}return;}
  if(action==='template'){download('warplanner-rules-template.json',I.template(faction));return;}
  if(action==='export'){download('warplanner-rules-backup.json',I.exportCatalog(service.records));return;}
  if(action==='clear'){files=[];review=null;finished=false;error='';notice='Files cleared. The database was not changed.';refresh();return;}
  if(['new-only','include-source','skip-all'].includes(action)&&review){finished=false;for(const r of review.rows)r.action=r.error||action==='skip-all'?'skip':!r.before?'add':action==='include-source'&&r.source?'source':'skip';refresh();return;}
  const current=service,version=generation;
  try{
   error='';if(action==='preview'){busy=true;notice='Loading the latest catalog for this preview…';refresh();await current.reload();if(current!==service||generation!==version)return;review=I.plan(I.parse(files,{faction,group},current.records),current.records);notice='Preview ready. Existing entries keep your curated content by default.';finished=false;}
   if(action==='apply'){
    const selected=I.selected(review);busy=true;refresh();const saved=await current.saveBatch(selected);if(current!==service||generation!==version)return;
    C.apply(current.records);for(const row of review.rows)if(selected.some(s=>s.key===row.key)){row.action='skip';row.before=saved.find(s=>s.key===row.key);row.proposed.revision=row.before.revision;if(row.source)row.sourceOnly=structuredClone(row.before);}
    finished=true;notice='Imported '+saved.length+' entries. The guide and builder now use the updated catalog. Rebuild the preview to import more changes.';
   }
  }catch(e){if(current===service)error=e.message;}
  finally{if(current===service&&generation===version){busy=false;refresh();}}
 });
 root.WarPlannerImportUI={render,canLeave,get active(){return active;},get hasDraft(){return dirty();},setService(next){clear();service=next;},open(){if(!service?.isAdmin)return;clear();active=true;faction=L.catalog.factions[0]?.name||'Aeldari';group=L.catalog.factions[0]?.group||'Xenos';},discard:clear};
})(window);
