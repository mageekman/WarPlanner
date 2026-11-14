/* In-site content editor. Database policies, never this UI, authorize writes. */
(function(root){
 'use strict';
 const C=root.WarPlannerContent,L=root.WarPlanLessons,W=root.WarPlannerWorkshopBrowser,P=root.WarPlannerUnitProfiles;
 let service=null,draft=null,dirty=false,busy=false,message='',failure='',query='',referenceFilter='all',summaryFilter='all',history=[],factionScope=null,folder=null,browserLevel='factions',parentKey=null;
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
 function profileFields(data){
  const profiles=P.read(data);if(!Object.hasOwn(data,'profiles')&&!profiles.length)profiles.push({name:data.name||''});
  return `<section class="admin-unit-profiles" aria-label="Unit stats"><h3>Unit stats</h3><p>Shown in the Rules Workshop only. Movement is in inches; saves and Leadership are target numbers. Leave unknown stats blank. Imported values still need checking.</p>${profiles.map((profile,index)=>`<fieldset class="admin-stat-profile" data-unit-profile="${index}"><legend>Profile ${index+1}</legend><div class="admin-stat-profile-top">${field('profile-'+index+'-name','Profile name',profile.name||data.name||'')}<button type="button" class="text-button" data-admin-remove-profile="${index}" aria-label="Remove profile ${index+1}">Remove</button></div><div class="admin-stat-grid">${P.fields.map(f=>`<label class="admin-field">${e(f.label)}<input type="text" inputmode="text" name="profile-${index}-${f.key}" value="${e(profile[f.key]??'')}" placeholder="${e(f.hint)}" maxlength="30"></label>`).join('')}</div></fieldset>`).join('')}<button type="button" class="outline" data-admin-action="add-profile" ${profiles.length>=20?'disabled':''}>＋ Add profile</button></section>`;
 }
 function captureProfiles(form,fd,name){const originals=P.read(draft.data);return [...form.querySelectorAll('[data-unit-profile]')].map(el=>{const index=Number(el.dataset.unitProfile),profile={...(originals[index]||{}),name:String(fd.get('profile-'+index+'-name')||'').trim()||name};for(const f of P.fields)profile[f.key]=P.parse(fd.get('profile-'+index+'-'+f.key),f.key);return profile;});}
 function folderDefinition(){return W.definitions.find(d=>d.id===folder);}
 function scopeName(){return factionScope===W.ALL?'All content':factionScope===W.SHARED?'Shared / core':factionScope||'Choose a faction';}
 function listed(){return C.filterRecords(W.entries(service?.records||[],factionScope,folder),{kind:folderDefinition()?.kind||'',query,reference:referenceFilter}).filter(r=>r.kind!=='rule'||summaryFilter==='all'||root.WarPlannerMechanics.summaryState(r.data)===summaryFilter);}
 function rowButton(r){return `<button type="button" class="admin-result ${draft?.key===r.key?'selected':''}" data-admin-edit="${e(r.key)}" ${draft?.key===r.key?'aria-current="true"':''}><span class="admin-entry-icon" aria-hidden="true">${['unit','detachment','faction'].includes(r.kind)?'◇':'≡'}</span><span><strong>${e(r.name)}</strong><small>${e(r.faction==='*'?'Shared / core':r.faction||labels[r.kind])}${r.data.detachment?' · '+e(r.data.detachment):''}${r.kind==='rule'&&r.data.referenceOnly?' · Reference only':''}${r.kind==='rule'&&root.WarPlannerMechanics.summaryState(r.data)==='needs-summary'?' · Needs summary':''}${r.kind==='rule'&&root.WarPlannerMechanics.summaryState(r.data)==='missing'?' · Missing source mechanics':''}${!r.enabled?' · Disabled':''}</small></span><span class="admin-chevron" aria-hidden="true">›</span></button>`;}
 function results(){const rows=listed();return `<p class="admin-count">${rows.length} entries</p>${rows.map(rowButton).join('')||`<p class="admin-folder-empty">${folder?'No matching entries in this folder.':'Choose a content group to see its entries.'}</p>`}`;}
 function folderButton(id,name,selected,attribute,count){return `<button type="button" class="admin-folder ${selected?'selected':''}" ${attribute}="${e(id)}" ${selected?'aria-current="true"':''}><span class="admin-folder-icon" aria-hidden="true"></span><span>${e(name)}</span>${count!==undefined?`<small>${count}</small>`:''}<span class="admin-chevron" aria-hidden="true">›</span></button>`;}
 function factionFolders(){let group='';return folderButton(W.ALL,'All content',factionScope===W.ALL,'data-admin-scope')+folderButton(W.SHARED,'Shared / core',factionScope===W.SHARED,'data-admin-scope')+W.factions(service.records).map(f=>{const heading=f.group!==group?`<h3 class="admin-folder-group">${e(f.group)}</h3>`:'';group=f.group;return heading+folderButton(f.id,f.name,factionScope===f.id,'data-admin-scope');}).join('');}
 function contentFolders(){return W.folders(service.records,factionScope).map(f=>folderButton(f.id,f.name,folder===f.id,'data-admin-folder',f.count)).join('')||'<p class="admin-folder-empty">Select a faction on the left.</p>';}
 function breadcrumbs(){const parent=service.records.find(r=>r.key===parentKey);return `<nav class="admin-path" aria-label="Workshop path"><button type="button" data-admin-level="factions">Workshop</button>${factionScope?`<span aria-hidden="true">›</span><button type="button" data-admin-level="groups">${e(scopeName())}</button>`:''}${folder?`<span aria-hidden="true">›</span><button type="button" data-admin-level="entries">${e(folderDefinition()?.name||'Content')}</button>`:''}${parent&&draft?.key!==parent.key?`<span aria-hidden="true">›</span><button type="button" data-admin-edit="${e(parent.key)}">${e(parent.name)}</button>`:''}${draft?`<span aria-hidden="true">›</span><button type="button" data-admin-level="editor" aria-current="page">${e(draft.name||'New entry')}</button>`:''}</nav>`;}
 function relatedRules(){const rows=W.related(service.records,draft);return !['unit','detachment'].includes(draft?.kind)?'':`<section class="admin-related" aria-label="Related rules"><h3>${draft.kind==='detachment'?'Rules in this detachment':'Abilities for this unit'}</h3><p>Choose a rule to edit its text, timing and conditions.</p><div>${rows.map(rowButton).join('')||'<p class="admin-folder-empty">No linked rules yet. Add a rule and assign it to this '+(draft.kind==='unit'?'unit':'detachment')+'.</p>'}</div></section>`;}
 function editor(){
  if(!draft)return `<section class="admin-empty"><span class="eyebrow">YOUR RULES LIBRARY</span><h2>Choose something to edit.</h2><p>Open a faction, choose a folder, then select an entry. Its settings and related rules appear here.</p></section>`;
  const d=draft.kind==='rule'?root.WarPlannerMechanics.enrich(draft.data):draft.data,factions=L.catalog.factions.map(f=>f.name),dets=L.catalog.detachments.filter(x=>L.factionMatches(x.faction,draft.faction)).map(x=>x.name);
  let fields=field('name',draft.kind==='step'?'Page title':'Name',draft.name)+field('contentId','Stable ID',d.id,{readonly:!!draft.revision,help:draft.revision?'This ID keeps links and revisions intact.':'Optional: generated from the name and faction when saved.'});
  if(!['faction','step'].includes(draft.kind))fields+=select('faction','Faction',draft.kind==='rule'?['*',...factions]:factions,draft.faction,'Choose a faction');
  if(draft.kind!=='step')fields+=guideFields({...d,faction:draft.faction},draft.kind);
  if(draft.kind==='unit')fields+=select('fightsFirst','Fights First',['auto','yes','no'],d.fightsFirst||'auto')+'<p class="admin-guide-note">Attached units still require every model to qualify. Use custom badges above for other reminders.</p>';
  if(draft.kind==='rule'){
   if(d.mechanicsPresentation)fields+='<p class="admin-guide-note">This view reads the imported source mechanics. Reference-only status stays in place until you review the rule.</p>';
   fields+=select('category','Type',Object.keys(L.categories),d.category)+select('detachment','Detachment',dets,d.detachment||'','None / faction-wide');
   fields+=`<fieldset class="admin-phases"><legend>Phases</legend>${L.phases.map((p,i)=>`<label><input type="checkbox" name="phase" value="${i}" ${d.phase.includes(i)?'checked':''}>${p.name}</label>`).join('')}<small>Leave empty for reference-only or pre-battle content.</small></fieldset>`;
   fields+=select('turn','Player turn',['you','opponent','either'],d.turn)+select('window','Timing window',C.windows,d.window);
   fields+=field('summary','Rule text / study summary',d.summary,{area:true,help:'Write a short reminder: when it happens, who it affects, and what changes. Keep important limits and conditions. Save to database preserves your wording; source-only imports keep it. A source-derived summary still needs checking against your current rules.'})+field('conditions','Conditions & restrictions',(d.conditions||[]).join('\n'),{area:true,help:'One condition per line.'});
   fields+=field('units','Applies to these unit names',(d.units||[]).join('\n'),{area:true,help:'One exact roster name per line. Leave empty for an army-wide or detachment rule.'});
   fields+=field('targetText','Eligible targets',d.targetText||root.WarPlanActivations.targeting(d,{phase:d.phase[0]||0,turn:'you'})?.text||'',{area:true})+field('triggerText','Timing reminder',d.triggerText||'');
   fields+=`<label class="admin-check"><input name="leadingUnitRequired" type="checkbox" ${d.leadingUnitRequired?'checked':''}>Requires the character to be leading a unit</label>`+field('leadingBodyguard','Required bodyguard unit (optional)',d.leadingBodyguard||'');
   fields+=field('enhancement','Equipped enhancement name (enhancements only)',d.enhancement||'')+field('bearerKeywords','Required bearer keywords (enhancements only)',(d.bearerKeywords||[]).join('\n'),{area:true});
   fields+=`<label class="admin-check"><input name="referenceOnly" type="checkbox" ${d.referenceOnly?'checked':''}>Reference reminder — effect still needs review</label>`;
   fields+=field('question','Study question',d.question||'',{area:true})+field('answer','Study answer',d.answer||'',{area:true});
  }else if(draft.kind==='unit'){
   fields+=profileFields(d);
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
  return `<form id="admin-content-form" class="admin-editor"><div class="admin-editor-top"><div><span class="eyebrow">${draft.revision?'EDIT':'ADD'} · ${e(labels[draft.kind])}</span><h2>${e(draft.name||'New entry')}</h2>${draft.kind==='rule'&&d.referenceOnly?'<span class="rule-badge reference-only">Reference only</span>':''}<p id="admin-draft-status">${dirty?'Unsaved changes':draft.revision?'Revision '+draft.revision:'New content'}</p></div><button type="button" class="text-button" data-admin-action="cancel" ${busy?'disabled':''}>Close</button></div>${relatedRules()}<div class="admin-fields">${fields}</div><p class="admin-save-note">Save updates the shared site catalog. Existing saved army uploads stay unchanged. Unit and detachment matching uses their names.</p><div class="button-row"><button type="submit" class="primary" ${busy?'disabled':''}>${busy?'Saving…':'Save to database'}</button>${draft.revision?'<button type="button" class="outline" data-admin-action="history">Revision history</button>':''}</div><div class="admin-history">${history.map(h=>`<div><span>Revision ${h.revision} · ${e(new Date(h.changed_at).toLocaleString())}</span><button type="button" class="text-button" data-admin-restore="${h.revision}">Load into editor</button></div>`).join('')}</div></form>`;
 }
 function render(){
  if(root.WarPlannerImportUI?.active)return root.WarPlannerImportUI.render();
  if(!service?.isAdmin)return '<section class="empty-card"><h1>Administrator access required</h1></section>';
  const ruleFolder=folderDefinition()?.kind==='rule';
  return `<section id="admin-content-page"><header class="heading"><div><div class="eyebrow">ADMINISTRATION</div><h1>Rules workshop</h1><p>Open a faction. Choose a folder. Edit on the right.</p></div><button type="button" class="outline" data-admin-action="reload" ${busy?'disabled':''}>Reload catalog</button></header><div class="admin-notice ${failure?'admin-error':''}" role="status">${e(failure||message||'Changes are saved to Supabase and load for signed-in players.')}</div><div class="admin-add-bar"><button type="button" class="outline" data-admin-action="import">Import source files</button>${['rule','unit','detachment','faction'].map(kind=>`<button type="button" class="outline" data-admin-new="${kind}">＋ ${kind==='rule'?'Rule / ability':kind[0].toUpperCase()+kind.slice(1)}</button>`).join('')}</div>${breadcrumbs()}<div class="admin-explorer" data-level="${browserLevel}"><section class="admin-column admin-factions" aria-label="Faction folders"><header><h2 tabindex="-1">Factions</h2></header><div class="admin-column-body">${factionFolders()}</div></section><section class="admin-column admin-groups" aria-label="Content folders"><header><h2 tabindex="-1">${e(scopeName())}</h2><small>Content groups</small></header><div class="admin-column-body">${contentFolders()}</div></section><section class="admin-column admin-entries" aria-label="Folder entries"><header><h2 tabindex="-1">${e(folderDefinition()?.name||'Entries')}</h2><small>${e(factionScope?scopeName():'Select a folder')}</small></header><div class="admin-column-body"><div class="admin-browser"><label>Search this folder<input type="search" id="admin-search" placeholder="Search entries…" value="${e(query)}" ${folder?'':'disabled'}></label><details class="admin-filter-options" ${referenceFilter!=='all'||summaryFilter!=='all'?'open':''} ${ruleFolder?'':'hidden'}><summary>Filter rules</summary><label id="admin-reference-field">Reference status<select id="admin-reference-filter"><option value="all" ${referenceFilter==='all'?'selected':''}>All rules</option><option value="reference" ${referenceFilter==='reference'?'selected':''}>Reference only</option><option value="other" ${referenceFilter==='other'?'selected':''}>Other rules</option></select></label><label id="admin-summary-field">Summary coverage<select id="admin-summary-filter"><option value="all" ${summaryFilter==='all'?'selected':''}>All summaries</option><option value="needs-summary" ${summaryFilter==='needs-summary'?'selected':''}>Needs summary</option><option value="missing" ${summaryFilter==='missing'?'selected':''}>Missing source mechanics</option><option value="available" ${summaryFilter==='available'?'selected':''}>Summary available</option></select></label></details></div><div id="admin-results">${results()}</div></div></section><section class="admin-column admin-edit-column" aria-label="Entry editor"><header><h2 tabindex="-1">${draft?'Edit entry':'Editor'}</h2>${draft?'<small>'+e(draft.name||'New entry')+'</small>':'<small>Select an entry to begin</small>'}</header><div id="admin-editor-container" class="admin-column-body">${editor()}</div></section></div></section>`;
 }
 function refresh(){root.refreshWarPlannerContent?.();}
 function markDirty(){dirty=true;const s=document.querySelector('#admin-draft-status');if(s)s.textContent='Unsaved changes';}
 function canLeave(){if(root.WarPlannerImportUI?.active)return root.WarPlannerImportUI.canLeave();return !busy&&(!dirty||root.confirm('Discard your unsaved rule edits?'));}
 function capture(form,check=true){
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
   d.profiles=captureProfiles(form,fd,row.name);
   d.keywords=lines(get('keywords'));d.modelCounts=get('modelCounts').split(',').map(x=>Number(x.trim()));d.legend=fd.has('legend');
   d.bodyguardIds=lines(get('bodyguards')).map(name=>{const unit=L.catalog.units.find(u=>L.factionMatches(u.faction,row.faction)&&u.name.toLowerCase()===name.toLowerCase());if(!unit)throw Error('Add the bodyguard unit “'+name+'” first.');return unit.id;});
  }else if(row.kind==='detachment'){d.description=get('description');d.dispositions=lines(get('dispositions'));}
  else if(row.kind==='faction'){d.group=get('group');d.aliases=lines(get('aliases'));}
  else for(const key of ['body','why','question','answer','section'])d[key]=get(key);
  if(row.kind!=='step')d.guide={order:get('guideOrder'),rank:Number(get('guideRank')),phases:fd.getAll('guidePhase').map(Number),turn:get('guideTurn'),label:get('guideLabel'),note:get('guideNote'),flags:[...new Set(lines(get('guideFlags')))]};
  if(row.kind==='unit')d.fightsFirst=get('fightsFirst');
  d.sourceUrl=get('sourceUrl');d.sourceLabel=get('sourceLabel');d.faction=row.faction;
  if(['rule','step'].includes(row.kind)){d.status='admin-reviewed';d.sourceIds=[...new Set([...(d.sourceIds||[]),'admin'])];}
  row.enabled=row.kind==='step'||fd.has('enabled');return check?C.validate(row):row;
 }
 function newEntry(kind){
  const data={id:'',name:'',sourceLabel:'',sourceUrl:''};
  if(kind==='rule')Object.assign(data,{category:folderDefinition()?.category||(draft?.kind==='detachment'?'army':'ability'),detachment:draft?.kind==='detachment'?draft.name:'',units:draft?.kind==='unit'?[draft.name]:[],phase:[],turn:'you',window:'act',summary:'',conditions:[],sourceIds:['admin'],status:'admin-reviewed',expanded:true,question:'',answer:''});
  if(kind==='unit')Object.assign(data,{keywords:[],abilities:[],bodyguardIds:[],modelCounts:[1],legend:false});
  if(kind==='detachment')Object.assign(data,{rules:[],stratagems:[],enhancements:[],dispositions:[],gameModes:[]});
  if(kind==='faction')Object.assign(data,{group:'Xenos',aliases:[]});
  return {key:kind+':',kind,faction:kind==='faction'?'':['unit','detachment'].includes(draft?.kind)?draft.faction:factionScope===W.SHARED&&kind==='rule'?'*':factionScope&&![W.ALL,W.SHARED].includes(factionScope)?factionScope:L.catalog.factions[0]?.name||'',name:'',data,enabled:true,revision:0};
 }
 document.addEventListener('input',event=>{
  if(!service?.isAdmin)return;
  if(event.target.id==='admin-search'){query=event.target.value;document.querySelector('#admin-results').innerHTML=results();}
  else if(event.target.closest('#admin-content-form'))markDirty();
 });
 document.addEventListener('change',event=>{
  if(!service?.isAdmin)return;
  if(event.target.id==='admin-summary-filter'){summaryFilter=event.target.value;document.querySelector('#admin-results').innerHTML=results();}
  if(event.target.id==='admin-reference-filter'){referenceFilter=event.target.value;document.querySelector('#admin-results').innerHTML=results();}
  if(event.target.closest('#admin-content-form')){markDirty();if(event.target.name==='faction'){
   const det=event.target.form.elements.detachment;if(det)det.innerHTML=options(L.catalog.detachments.filter(d=>L.factionMatches(d.faction,event.target.value)).map(d=>d.name),'','None / faction-wide');
  }}
 });
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||!service?.isAdmin||busy)return;
  if((button.dataset.adminAction==='add-profile'||button.dataset.adminRemoveProfile!==undefined)&&draft?.kind==='unit'){
   try{const next=capture(document.querySelector('#admin-content-form'),false);if(button.dataset.adminAction==='add-profile'){if(next.data.profiles.length>=20)return;next.data.profiles.push({name:next.name});}else next.data.profiles.splice(Number(button.dataset.adminRemoveProfile),1);draft=next;dirty=true;failure='';refresh();}
   catch(error){failure=error.message;const notice=document.querySelector('.admin-notice');if(notice){notice.classList.add('admin-error');notice.textContent=failure;}}
   return;
  }
  if(button.dataset.adminLevel){browserLevel=button.dataset.adminLevel;const explorer=document.querySelector('.admin-explorer');if(explorer)explorer.dataset.level=browserLevel;return;}
  if(button.dataset.adminScope){if(!canLeave())return;factionScope=button.dataset.adminScope;folder=null;draft=null;parentKey=null;query='';referenceFilter='all';summaryFilter='all';dirty=false;history=[];browserLevel='groups';refresh();return;}
  if(button.dataset.adminFolder){if(!canLeave())return;folder=button.dataset.adminFolder;draft=null;parentKey=null;query='';referenceFilter='all';summaryFilter='all';dirty=false;history=[];browserLevel='entries';refresh();return;}
  if(button.dataset.adminEdit){if(!canLeave())return;const next=service.records.find(r=>r.key===button.dataset.adminEdit);if(!next)return;if(W.related(service.records,draft).some(r=>r.key===next.key))parentKey=draft.key;else if(next.key===parentKey)parentKey=null;draft=next;dirty=false;history=[];failure='';browserLevel='editor';refresh();return;}
  if(button.dataset.adminNew){if(!canLeave())return;const previous=draft;draft=newEntry(button.dataset.adminNew);parentKey=button.dataset.adminNew==='rule'&&['unit','detachment'].includes(previous?.kind)?previous.key:null;dirty=false;history=[];failure='';browserLevel='editor';refresh();return;}
  if(button.dataset.adminRestore){const old=history.find(h=>String(h.revision)===button.dataset.adminRestore);if(!old)return;if(!canLeave())return;const revision=draft.revision;draft=structuredClone(old.entry);draft.revision=revision;dirty=true;message='Earlier content loaded as a draft. Save to create a new revision.';refresh();return;}
  const action=button.dataset.adminAction;if(!action)return;
  if(action==='import'){if(canLeave()){draft=null;dirty=false;root.WarPlannerImportUI.open();refresh();}return;}
  if(action==='cancel'){if(canLeave()){draft=null;dirty=false;history=[];failure='';browserLevel=folder?'entries':factionScope?'groups':'factions';refresh();}return;}
  const current=service;
  try{
   if(action==='reload'){
    if(!canLeave())return;busy=true;await current.reload();if(service!==current)return;C.apply(current.records);draft=null;parentKey=null;dirty=false;browserLevel=folder?'entries':factionScope?'groups':'factions';message='Catalog reloaded.';
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
   draft=capture(event.target,false);C.validate(draft);busy=true;failure='';refresh();
   const saved=await current.save(draft);if(service!==current)return;
   draft=saved;dirty=false;history=[];C.apply(service.records);message='Saved to database. The guide and army builder now use this content.';
  }catch(error){if(service===current)failure=error.message;}
  finally{if(service===current){busy=false;refresh();}}
 });
 root.WarPlannerAdminPage={render,get canAccess(){return !!service?.isAdmin;},get hasDraft(){return dirty||busy||!!root.WarPlannerImportUI?.hasDraft;},canLeave,leave(){if(!canLeave())return false;root.WarPlannerImportUI?.discard();draft=null;parentKey=null;dirty=false;history=[];browserLevel=folder?'entries':factionScope?'groups':'factions';return true;},
  setService(next){root.WarPlannerImportUI?.setService(next);service?.dispose();service=next;draft=null;dirty=false;busy=false;message='';failure='';query='';referenceFilter='all';summaryFilter='all';history=[];factionScope=null;folder=null;parentKey=null;browserLevel='factions';if(next)C.apply(next.records);else C.reset();}
 };
})(window);
