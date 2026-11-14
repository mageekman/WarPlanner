/* In-site content editor. Database policies, never this UI, authorize writes. */
(function(root){
 'use strict';
 const C=root.WarPlannerContent,L=root.WarPlanLessons;
 let service=null,draft=null,dirty=false,busy=false,message='',failure='',query='',filter='rule',referenceFilter='all',history=[];
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lines=s=>String(s||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const valueLabels={early:'Early',normal:'Normal order',late:'Late',auto:'Automatic from current rules',yes:'Has Fights First',no:'Does not have Fights First',you:'Your turn',opponent:'Opponent’s turn',either:'Either turn',round:'Start of battle round','turn-start':'Start of turn',start:'Start of phase','core-cp':'Gain Command Points',shock:'Battle-shock',act:'During the phase',select:'When a unit is selected',before:'Before the unit acts',after:'After the unit acts',react:'Reaction to an event',arrivals:'Reinforcements / arrivals',end:'End of phase','turn-end':'End of turn','round-end':'End of battle round',prebattle:'Pre-battle / reference'};
 const labels={rule:'Rules & abilities',unit:'Units',detachment:'Detachments',faction:'Factions',step:'Core guide pages'};
 const options=(values,current,empty='')=>(empty?`<option value="">${e(empty)}</option>`:'')+[...new Set([...values,...(current?[current]:[])])].map(v=>`<option value="${e(v)}" ${v===current?'selected':''}>${e(v==='*'?'All factions':valueLabels[v]||L.categories[v]||v)}</option>`).join('');
 function field(name,label,value,{area=false,help='',type='text',readonly=false}={}){return `<label class="admin-field">${label}${area?`<textarea name="${name}" rows="${['summary','body'].includes(name)?6:3}">${e(value)}</textarea>`:`<input name="${name}" type="${type}" value="${e(value)}" ${readonly?'readonly':''}>`}${help?`<small>${help}</small>`:''}</label>`;}
 const select=(name,label,values,current,empty='')=>`<label class="admin-field">${label}<select name="${name}">${options(values,current,empty)}</select></label>`;
 function guideFields(data,kind){
  const g=L.guideSettings(data,kind);
  return `<details class="admin-guide-settings" ${data.guide||g.order!=='normal'?'open':''}><summary>Guide order & badges</summary><div class="admin-fields">${select('guideOrder','Suggested activation order',['normal','early','late'],g.order)}${field('guideRank','Order within this priority group',g.rank,{type:'number',help:'1 comes first, 99 comes last. Normal-order cards ignore this number.'})}<fieldset class="admin-phases"><legend>Show hints in these phases</legend>${L.phases.map((p,i)=>`<label><input type="checkbox" name="guidePhase" value="${i}" ${g.phases.includes(i)?'checked':''}>${p.name}</label>`).join('')}</fieldset>${select('guideTurn','Show hints during',['you','opponent','either'],g.turn)}${field('guideLabel','Priority badge (optional)',g.label,{help:'Leave blank for Move early, Shoot early, Fight early, or the matching late label.'})}${field('guideNote','Sequencing / badge explanation',g.note,{area:true,help:'Explain why this should happen early or late, or what to remember about a badge.'})}${field('guideFlags','Extra guide badges',g.flags.join('\n'),{area:true,help:'One per line, e.g. Deep Strike, Once per battle, Keep in range. These are reminders; add the actual rule separately.'})}<p class="admin-guide-note">These settings change guide hints and card order. The rule still resolves at its saved timing window. Faction and detachment hints provide defaults for their rules.</p></div></details>`;
 }
 function listed(){return C.filterRecords(service?.records||[],{kind:filter,query,reference:referenceFilter});}
 function results(){const rows=listed();return `<p class="admin-count">${rows.length} entries</p>${rows.map(r=>`<button type="button" class="admin-result ${draft?.key===r.key?'selected':''}" data-admin-edit="${e(r.key)}"><strong>${e(r.name)}</strong><small>${e(r.faction==='*'?'All factions':r.faction||labels[r.kind])}${r.data.detachment?' · '+e(r.data.detachment):''}${r.kind==='rule'&&r.data.referenceOnly?' · Reference only':''}${!r.enabled?' · Disabled':''}</small></button>`).join('')||'<p class="muted">No matching content.</p>'}`;}
 function editor(){
  if(!draft)return `<section class="admin-empty"><span class="eyebrow">YOUR RULES LIBRARY</span><h2>Choose something to edit.</h2><p>Search the existing content, or add a rule, unit, detachment or faction.</p></section>`;
  const d=draft.data,factions=L.catalog.factions.map(f=>f.name),dets=L.catalog.detachments.filter(x=>L.factionMatches(x.faction,draft.faction)).map(x=>x.name);
  let fields=field('name',draft.kind==='step'?'Page title':'Name',draft.name)+field('contentId','Stable ID',d.id,{readonly:!!draft.revision,help:draft.revision?'This ID keeps links and revisions intact.':'Optional: generated from the name and faction when saved.'});
  if(!['faction','step'].includes(draft.kind))fields+=select('faction','Faction',draft.kind==='rule'?['*',...factions]:factions,draft.faction,'Choose a faction');
  if(draft.kind!=='step')fields+=guideFields({...d,faction:draft.faction},draft.kind);
  if(draft.kind==='unit')fields+=select('fightsFirst','Fights First',['auto','yes','no'],d.fightsFirst||'auto')+'<p class="admin-guide-note">Attached units still require every model to qualify. Use custom badges above for other reminders.</p>';
  if(draft.kind==='rule'){
   fields+=select('category','Type',Object.keys(L.categories),d.category)+select('detachment','Detachment',dets,d.detachment||'','None / faction-wide');
   fields+=`<fieldset class="admin-phases"><legend>Phases</legend>${L.phases.map((p,i)=>`<label><input type="checkbox" name="phase" value="${i}" ${d.phase.includes(i)?'checked':''}>${p.name}</label>`).join('')}<small>Leave empty for reference-only or pre-battle content.</small></fieldset>`;
   fields+=select('turn','Player turn',['you','opponent','either'],d.turn)+select('window','Timing window',C.windows,d.window);
   fields+=field('summary','Rule text / study summary',d.summary,{area:true})+field('conditions','Conditions & restrictions',(d.conditions||[]).join('\n'),{area:true,help:'One condition per line.'});
   fields+=field('units','Applies to these unit names',(d.units||[]).join('\n'),{area:true,help:'One exact roster name per line. Leave empty for an army-wide or detachment rule.'});
   fields+=field('targetText','Eligible targets',d.targetText||root.WarPlanActivations.targeting(d,{phase:d.phase[0]||0,turn:'you'})?.text||'',{area:true})+field('triggerText','Timing reminder',d.triggerText||'');
   fields+=`<label class="admin-check"><input name="leadingUnitRequired" type="checkbox" ${d.leadingUnitRequired?'checked':''}>Requires the character to be leading a unit</label>`+field('leadingBodyguard','Required bodyguard unit (optional)',d.leadingBodyguard||'');
   fields+=field('enhancement','Equipped enhancement name (enhancements only)',d.enhancement||'')+field('bearerKeywords','Required bearer keywords (enhancements only)',(d.bearerKeywords||[]).join('\n'),{area:true});
   fields+=`<label class="admin-check"><input name="referenceOnly" type="checkbox" ${d.referenceOnly?'checked':''}>Reference reminder — effect still needs review</label>`;
   fields+=field('question','Study question',d.question||'',{area:true})+field('answer','Study answer',d.answer||'',{area:true});
  }else if(draft.kind==='unit'){
   fields+=field('keywords','Keywords',d.keywords.join('\n'),{area:true,help:'One keyword per line. Include Character / Epic Hero where applicable.'})+field('modelCounts','Available model counts',d.modelCounts.join(', '),{help:'Separate counts with commas, for example 5, 10.'});
   const names=d.bodyguardIds.map(id=>L.catalog.units.find(u=>u.id===id&&L.factionMatches(u.faction,draft.faction))?.name||id);
   fields+=field('bodyguards','Units this character can lead',names.join('\n'),{area:true,help:'One existing unit name per line. Assign rule text from Rules & abilities.'});
   fields+=`<label class="admin-check"><input name="legend" type="checkbox" ${d.legend?'checked':''}>Legends unit</label>`;
  }else if(draft.kind==='detachment'){
   fields+=field('description','Study notes',d.description||'',{area:true})+field('dispositions','Dispositions',d.dispositions.join('\n'),{area:true,help:'One per line. Add detachment rules in Rules & abilities and select this detachment.'});
  }else if(draft.kind==='faction'){
   fields+=select('group','Army group',['Imperium','Chaos','Xenos'],d.group)+field('aliases','Alternate faction names',d.aliases.join('\n'),{area:true});
  }else{
   fields+=field('body','Instructions',d.body,{area:true})+field('why','Why this matters',d.why||'',{area:true})+field('question','Study question',d.question||'',{area:true})+field('answer','Study answer',d.answer||'',{area:true})+field('section','Source section',d.section||'');
  }
  if(d.importSource)fields+=`<details class="admin-import-source"><summary>Imported source details · ${e(d.importSource.name||'Source')}</summary><p>${e(d.importSource.file||'')} · ${e(d.importSource.sourceId||'')}</p>${d.importSource.text?`<p class="import-source-text">${e(d.importSource.text)}</p>`:'<p>This source provides structured mechanics rather than complete rule prose.</p>'}<details><summary>Structured source record</summary><pre>${e(JSON.stringify(d.importSource.record,null,2))}</pre></details></details>`;
  fields+=field('sourceLabel','Source / reference label',d.sourceLabel||'')+field('sourceUrl','Source link',d.sourceUrl||'',{type:'url'});
  if(draft.kind!=='step')fields+=`<label class="admin-check"><input type="checkbox" name="enabled" ${draft.enabled?'checked':''}>Enabled in the site</label>`;
  return `<form id="admin-content-form" class="admin-editor"><div class="admin-editor-top"><div><span class="eyebrow">${draft.revision?'EDIT':'ADD'} · ${e(labels[draft.kind])}</span><h2>${e(draft.name||'New entry')}</h2>${draft.kind==='rule'&&d.referenceOnly?'<span class="rule-badge reference-only">Reference only</span>':''}<p id="admin-draft-status">${dirty?'Unsaved changes':draft.revision?'Revision '+draft.revision:'New content'}</p></div><button type="button" class="text-button" data-admin-action="cancel" ${busy?'disabled':''}>Close</button></div><div class="admin-fields">${fields}</div><p class="admin-save-note">Save updates the shared site catalog. Existing saved army uploads stay unchanged. Unit and detachment matching uses their names.</p><div class="button-row"><button type="submit" class="primary" ${busy?'disabled':''}>${busy?'Saving…':'Save to database'}</button>${draft.revision?'<button type="button" class="outline" data-admin-action="history">Revision history</button>':''}</div><div class="admin-history">${history.map(h=>`<div><span>Revision ${h.revision} · ${e(new Date(h.changed_at).toLocaleString())}</span><button type="button" class="text-button" data-admin-restore="${h.revision}">Load into editor</button></div>`).join('')}</div></form>`;
 }
 function render(){
  if(root.WarPlannerImportUI?.active)return root.WarPlannerImportUI.render();
  if(!service?.isAdmin)return '<section class="empty-card"><h1>Administrator access required</h1></section>';
  return `<section id="admin-content-page"><header class="heading"><div><div class="eyebrow">ADMINISTRATION</div><h1>Rules workshop</h1><p>Edit the content that powers army building and the guide.</p></div><button type="button" class="outline" data-admin-action="reload" ${busy?'disabled':''}>Reload catalog</button></header><div class="admin-notice ${failure?'admin-error':''}" role="status">${e(failure||message||'Changes are saved to Supabase and load for signed-in players.')}</div><div class="admin-add-bar"><button type="button" class="outline" data-admin-action="import">Import source files</button>${['rule','unit','detachment','faction'].map(kind=>`<button type="button" class="outline" data-admin-new="${kind}">＋ ${kind==='rule'?'Rule / ability':kind[0].toUpperCase()+kind.slice(1)}</button>`).join('')}</div><div class="admin-workspace"><aside class="admin-browser"><label>Content type<select id="admin-kind">${Object.entries(labels).map(([k,v])=>`<option value="${k}" ${filter===k?'selected':''}>${v}</option>`).join('')}</select></label><label id="admin-reference-field" ${filter==='rule'?'':'hidden'}>Reference status<select id="admin-reference-filter"><option value="all" ${referenceFilter==='all'?'selected':''}>All rules</option><option value="reference" ${referenceFilter==='reference'?'selected':''}>Reference only</option><option value="other" ${referenceFilter==='other'?'selected':''}>Other rules</option></select></label><label>Search content<input type="search" id="admin-search" placeholder="Name, faction or detachment…" value="${e(query)}"></label><div id="admin-results">${results()}</div></aside><div id="admin-editor-container">${editor()}</div></div></section>`;
 }
 function refresh(){root.refreshWarPlannerContent?.();}
 function markDirty(){dirty=true;const s=document.querySelector('#admin-draft-status');if(s)s.textContent='Unsaved changes';}
 function canLeave(){if(root.WarPlannerImportUI?.active)return root.WarPlannerImportUI.canLeave();return !busy&&(!dirty||root.confirm('Discard your unsaved rule edits?'));}
 function capture(form){
  const fd=new FormData(form),get=n=>String(fd.get(n)||'').trim(),row=structuredClone(draft),d=row.data;
  row.name=get('name');row.faction=['faction','step'].includes(row.kind)?row.faction:get('faction');
  d.id=get('contentId')||slug(row.name+'-'+(row.faction==='*'?'core':row.faction));row.key=row.kind+':'+d.id;
  if(row.kind==='step')d.title=row.name;else d.name=row.name;
  if(row.kind==='rule'){
   for(const key of ['category','detachment','turn','window','summary','targetText','triggerText','leadingBodyguard','enhancement','question','answer'])d[key]=get(key);
   for(const key of ['conditions','units','bearerKeywords'])d[key]=lines(get(key));
   d.phase=fd.getAll('phase').map(Number);d.referenceOnly=fd.has('referenceOnly');d.leadingUnitRequired=fd.has('leadingUnitRequired');
   d.expanded=true;d.adminManaged=true;
   if(d.category==='enhancement'&&!d.enhancement)d.enhancement=row.name;
  }else if(row.kind==='unit'){
   d.keywords=lines(get('keywords'));d.modelCounts=get('modelCounts').split(',').map(x=>Number(x.trim()));d.legend=fd.has('legend');
   d.bodyguardIds=lines(get('bodyguards')).map(name=>{const unit=L.catalog.units.find(u=>L.factionMatches(u.faction,row.faction)&&u.name.toLowerCase()===name.toLowerCase());if(!unit)throw Error('Add the bodyguard unit “'+name+'” first.');return unit.id;});
  }else if(row.kind==='detachment'){d.description=get('description');d.dispositions=lines(get('dispositions'));}
  else if(row.kind==='faction'){d.group=get('group');d.aliases=lines(get('aliases'));}
  else for(const key of ['body','why','question','answer','section'])d[key]=get(key);
  if(row.kind!=='step')d.guide={order:get('guideOrder'),rank:Number(get('guideRank')),phases:fd.getAll('guidePhase').map(Number),turn:get('guideTurn'),label:get('guideLabel'),note:get('guideNote'),flags:[...new Set(lines(get('guideFlags')))]};
  if(row.kind==='unit')d.fightsFirst=get('fightsFirst');
  d.sourceUrl=get('sourceUrl');d.sourceLabel=get('sourceLabel');d.faction=row.faction;
  if(['rule','step'].includes(row.kind)){d.status='admin-reviewed';d.sourceIds=[...new Set([...(d.sourceIds||[]),'admin'])];}
  row.enabled=row.kind==='step'||fd.has('enabled');return C.validate(row);
 }
 function newEntry(kind){
  const data={id:'',name:'',sourceLabel:'',sourceUrl:''};
  if(kind==='rule')Object.assign(data,{category:'ability',units:[],phase:[],turn:'you',window:'act',summary:'',conditions:[],sourceIds:['admin'],status:'admin-reviewed',expanded:true,question:'',answer:''});
  if(kind==='unit')Object.assign(data,{keywords:[],abilities:[],bodyguardIds:[],modelCounts:[1],legend:false});
  if(kind==='detachment')Object.assign(data,{rules:[],stratagems:[],enhancements:[],dispositions:[],gameModes:[]});
  if(kind==='faction')Object.assign(data,{group:'Xenos',aliases:[]});
  return {key:kind+':',kind,faction:kind==='faction'?'':L.catalog.factions[0]?.name||'',name:'',data,enabled:true,revision:0};
 }
 document.addEventListener('input',event=>{
  if(!service?.isAdmin)return;
  if(event.target.id==='admin-search'){query=event.target.value;document.querySelector('#admin-results').innerHTML=results();}
  else if(event.target.closest('#admin-content-form'))markDirty();
 });
 document.addEventListener('change',event=>{
  if(!service?.isAdmin)return;
  if(event.target.id==='admin-reference-filter'){referenceFilter=event.target.value;document.querySelector('#admin-results').innerHTML=results();}
  if(event.target.id==='admin-kind'){filter=event.target.value;document.querySelector('#admin-reference-field').hidden=filter!=='rule';document.querySelector('#admin-results').innerHTML=results();}
  if(event.target.closest('#admin-content-form')){markDirty();if(event.target.name==='faction'){
   const det=event.target.form.elements.detachment;if(det)det.innerHTML=options(L.catalog.detachments.filter(d=>L.factionMatches(d.faction,event.target.value)).map(d=>d.name),'','None / faction-wide');
  }}
 });
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||!service?.isAdmin||busy)return;
  if(button.dataset.adminEdit){if(!canLeave())return;draft=service.records.find(r=>r.key===button.dataset.adminEdit);dirty=false;history=[];failure='';refresh();return;}
  if(button.dataset.adminNew){if(!canLeave())return;draft=newEntry(button.dataset.adminNew);dirty=false;history=[];failure='';refresh();return;}
  if(button.dataset.adminRestore){const old=history.find(h=>String(h.revision)===button.dataset.adminRestore);if(!old)return;if(!canLeave())return;const revision=draft.revision;draft=structuredClone(old.entry);draft.revision=revision;dirty=true;message='Earlier content loaded as a draft. Save to create a new revision.';refresh();return;}
  const action=button.dataset.adminAction;if(!action)return;
  if(action==='import'){if(canLeave()){draft=null;dirty=false;root.WarPlannerImportUI.open();refresh();}return;}
  if(action==='cancel'){if(canLeave()){draft=null;dirty=false;history=[];failure='';refresh();}return;}
  const current=service;
  try{
   if(action==='reload'){
    if(!canLeave())return;busy=true;await current.reload();if(service!==current)return;C.apply(current.records);draft=null;dirty=false;message='Catalog reloaded.';
   }else if(action==='history'){
    draft=capture(document.querySelector('#admin-content-form'));busy=true;const versions=await current.history(draft.key);if(service!==current)return;history=versions;message=history.length?'Choose a revision to load into the editor.':'No earlier revisions yet.';
   }
   failure='';
  }catch(error){if(service===current)failure=error.message;}
  finally{if(service===current){busy=false;refresh();}}
 });
 document.addEventListener('submit',async event=>{
  if(event.target.getAttribute('id')!=='admin-content-form')return;event.preventDefault();if(!service?.isAdmin||busy)return;
  const current=service;
  try{
   draft=capture(event.target);busy=true;failure='';refresh();
   const saved=await current.save(draft);if(service!==current)return;
   draft=saved;dirty=false;history=[];C.apply(service.records);message='Saved to database. The guide and army builder now use this content.';
  }catch(error){if(service===current)failure=error.message;}
  finally{if(service===current){busy=false;refresh();}}
 });
 root.WarPlannerAdminPage={render,get canAccess(){return !!service?.isAdmin;},get hasDraft(){return dirty||busy||!!root.WarPlannerImportUI?.hasDraft;},canLeave,leave(){if(!canLeave())return false;root.WarPlannerImportUI?.discard();draft=null;dirty=false;history=[];return true;},
  setService(next){root.WarPlannerImportUI?.setService(next);service?.dispose();service=next;draft=null;dirty=false;busy=false;message='';failure='';query='';referenceFilter='all';history=[];if(next)C.apply(next.records);else C.reset();}
 };
})(window);
