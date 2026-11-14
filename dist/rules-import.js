/* Parse source files into reviewable catalog changes. Never evaluates uploaded code. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports,C=node?require('./content.js'):root.WarPlannerContent,L=node?require('./lessons.js'):root.WarPlanLessons;
 const hash=s=>{let n=2166136261;for(const ch of s)n=Math.imul(n^ch.charCodeAt(0),16777619);return (n>>>0).toString(16);};
 const copy=v=>structuredClone(v),norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const phaseNames=['command','movement','shooting','charge','fight'];
 const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
 function plain(value){return String(value||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<\s*br\s*\/?\s*>/gi,'\n').replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|tr)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,code)=>{const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};if(code[0]!=='#')return named[code.toLowerCase()];const n=parseInt(code.slice(code[1].toLowerCase()==='x'?2:1),code[1].toLowerCase()==='x'?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
 function csv(text){
  text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0],delim=['|','\t',';',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell==='')quoted=true;else if(quoted)quoted=false;else cell+=ch;}
   else if(!quoted&&(ch===delim||ch==='\n'||ch==='\r')){row.push(cell);cell='';if(ch!==delim){if(ch==='\r'&&text[i+1]==='\n')i++;if(row.some(s=>s.trim()))rows.push(row);row=[];}}
   else cell+=ch;
  }
  if(quoted)throw Error('CSV has an unfinished quoted field.');row.push(cell);if(row.some(s=>s.trim()))rows.push(row);
  if(rows.length<2)throw Error('CSV needs column headers and at least one data row.');if(rows.length>100001)throw Error('CSV contains too many rows.');
  const headers=rows.shift().map(s=>s.trim().toLowerCase());if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error('CSV column headers must be unique.');return rows.map((cells,i)=>{if(cells.length>headers.length&&cells.slice(headers.length).some(Boolean))throw Error('CSV row '+(i+2)+' has too many columns.');return Object.fromEntries(headers.map((h,j)=>[h,cells[j]||'']).filter(([h])=>h));});
 }
 const baseName=path=>String(path).replace(/\\/g,'/').split('/').pop().toLowerCase().replace(/\.(json|csv|txt)$/,'');
 function parts(files){
  const tables=new Map(),canonical=[],warnings=[];let bytes=0;
  if(files.length>300)throw Error('Choose at most 300 source files, preferably one faction at a time.');
  for(let file of files){bytes+=new TextEncoder().encode(file.text).length;if(bytes>20*1024*1024)throw Error('Choose source files totaling at most 20 MB.');
   if(/\.(zip|pdf)$/i.test(file.name))throw Error('Extract ZIP archives first. PDF files are not parsed; use JSON/CSV exports or enter the rule in the workshop.');
   if(!/\.(json|csv|txt)$/i.test(file.name)){warnings.push('Skipped '+file.name+' (not JSON or CSV).');continue;}
   let data;try{data=/\.json$/i.test(file.name)?JSON.parse(file.text.replace(/^\uFEFF/,'')):csv(file.text);}catch(error){throw Error(file.name+': '+error.message);}
   if(!Array.isArray(data)&&(data?.format==='warplanner-rules'||Object.hasOwn(data||{},'entries'))){if(!Array.isArray(data.entries))throw Error(file.name+': entries must be an array.');canonical.push(...data.entries.map(row=>({row,file:file.name})));continue;}
   if(data?.key&&data?.kind){canonical.push({row:data,file:file.name});continue;}
   if(Array.isArray(data)&&data.some(x=>x?.key&&x?.kind)){if(data.some(x=>!x?.key||!x?.kind))throw Error(file.name+': mixed catalog and source records.');canonical.push(...data.map(row=>({row,file:file.name})));continue;}
   if(!Array.isArray(data)){const key=Object.keys(data||{}).find(k=>Array.isArray(data[k])&&['abilities','units','detachments','factions','enhancements','stratagems','rules'].includes(k));if(key){data=data[key];file={...file,name:key+'.json'};}else throw Error(file.name+': expected a JSON array or WarPlanner export.');}
   const key=baseName(file.name),known=['abilities','units','detachments','factions','enhancements','stratagems','phase-mappings','leader-attachments','unit-compositions','datasheets','datasheets_abilities','detachment_abilities','datasheets_keywords','datasheets_leader'];
   if(!known.includes(key)){warnings.push('Skipped '+file.name+' (unsupported source table).');continue;}
   if(!tables.has(key))tables.set(key,[]);tables.get(key).push(...data.map(raw=>({raw,file:file.name,csv:! /\.json$/i.test(file.name)})));
  }
  return {tables,canonical,warnings};
 }
 function timing(raw,mapping){
  const phases=new Set(),turns=new Set(),walk=x=>{if(!x||typeof x!=='object')return;if(x.type==='phase-is'&&phaseNames.includes(x.parameters?.phase))phases.add(phaseNames.indexOf(x.parameters.phase));if(x.type==='player-turn-is')turns.add(x.parameters?.turn);for(const v of Object.values(x))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);};walk(raw);
  for(const phase of mapping||[])if(phaseNames.includes(phase))phases.add(phaseNames.indexOf(phase));
  if(typeof raw.phase==='string')for(const [i,p] of phaseNames.entries())if(raw.phase.toLowerCase().includes(p))phases.add(i);
  const trigger=Array.isArray(raw.trigger)?raw.trigger[0]:raw.trigger,event=trigger?.event;
  const windows={'phase-started':'start','phase-ended':'end','round-started':'round','round-ended':'round-end','turn-started':'turn-start','turn-ended':'turn-end','attacks-resolved':'after','targets-selected':'select',selected:'select','battle-started':'prebattle','deployment-ended':'prebattle'};
  if(event==='round-started')phases.add(0);if(['round-ended','turn-ended'].includes(event))phases.add(4);
  const turn=String(raw.player_turn||raw.turn||'').toLowerCase().replace(/[’']/g,'');
  return {phase:[...phases].sort(),turn:turns.size===1&&turns.has('your-turn')||['your turn','your-turn','your'].includes(turn)?'you':turns.size===1&&turns.has('opponent-turn')||['opponents turn','opponent turn','opponent-turn','opponent'].includes(turn)?'opponent':'either',window:windows[event]||'act'};
 }
 function parse(files,options,existing=[]){
  const faction=String(options.faction||'').trim(),group=options.group||'Xenos';if(!faction)throw Error('Choose the faction you are importing.');if(!['Space Marines','Imperium','Chaos','Xenos'].includes(group))throw Error('Choose an army group.');
  const {tables,canonical,warnings}=parts(files),table=name=>(tables.get(name)||[]),candidates=[];
  const knownFactions=existing.filter(r=>r.kind==='faction'),factionRecord=knownFactions.find(r=>norm(r.name)===norm(faction)||(r.data.aliases||[]).some(n=>norm(n)===norm(faction)));
  const factionName=factionRecord?.name||faction;
  const importedFaction=table('factions').find(x=>norm(x.raw.name)===norm(factionName)||(x.raw.aliases||[]).some(n=>norm(n)===norm(factionName)));
  const factionIds=new Set([slug(factionName),factionRecord?.data.id,importedFaction?.raw.id].filter(Boolean).map(norm));
  function inFaction(raw){return !raw.faction_id||factionIds.has(norm(raw.faction_id));}
  function provenance(raw,file,text=''){return {name:!/\.json$/i.test(file)?'Wahapedia export':'40kdc-data',file,sourceId:String(raw.ability_id||raw.id||raw.source_id||''),text,record:JSON.parse(JSON.stringify(raw))};}
  function add(kind,id,name,data,source,factionValue=factionName){
   if(existing.some(r=>r.key===kind+':'+id&&kind!=='faction'&&!L.factionMatches(r.faction,factionValue)))id+='-'+slug(factionValue);
   const row={key:kind+':'+id,kind,faction:factionValue,name:plain(name),data:{id,name:plain(name),...data},enabled:true,revision:0};if(source)row.data.importSource=source;candidates.push({row,source:true});
  }
  const lookupUnit=id=>table('units').find(x=>x.raw.id===id)||table('datasheets').find(x=>x.raw.id===id);
  const selectedSheets=table('datasheets').filter(x=>inFaction(x.raw)),sheetIds=new Set(selectedSheets.map(x=>x.raw.id));
  const units=table('units').filter(x=>inFaction(x.raw)),detRows=table('detachments').filter(x=>inFaction(x.raw));
  const unitNames=new Map([...units,...selectedSheets].map(x=>[x.raw.id,plain(x.raw.name)]));
  for(const r of existing.filter(r=>r.kind==='unit'&&L.factionMatches(r.faction,factionName)))unitNames.set(r.data.id,r.name);
  const detNames=new Map(detRows.map(x=>[x.raw.id,plain(x.raw.name)]));for(const r of existing.filter(r=>r.kind==='detachment'&&L.factionMatches(r.faction,factionName)))detNames.set(r.data.id,r.name);
  const fallbackName=id=>unitNames.get(id)||existing.find(r=>r.kind==='unit'&&(r.data.id===id||slug(r.name)===id)&&L.factionMatches(r.faction,factionName))?.name;
  const refs=new Map();for(const {raw} of units)for(const a of raw.ability_ids||[]){const id=typeof a==='string'?a:a.id;if(!refs.has(id))refs.set(id,new Set());refs.get(id).add(plain(raw.name));}
  for(const x of table('datasheets_abilities'))if(sheetIds.has(x.raw.datasheet_id)&&x.raw.ability_id){if(!refs.has(x.raw.ability_id))refs.set(x.raw.ability_id,new Set());refs.get(x.raw.ability_id).add(unitNames.get(x.raw.datasheet_id));}
  for(const {raw,file} of units){
   const composition=table('unit-compositions').find(x=>x.raw.unit_id===raw.id)?.raw,counts=new Set(Object.values(raw.model_count||{}).filter(n=>Number.isInteger(n)&&n>0));
   for(const tier of composition?.tiers||[])for(const key of ['min','max']){const n=(tier.models||[]).reduce((a,m)=>a+(m[key]||0),0);if(n>0)counts.add(n);}
   const attachment=table('leader-attachments').find(x=>x.raw.leader_id===raw.id)?.raw;
   add('unit',raw.id,raw.name,{keywords:[...(raw.keywords||[]),...(raw.faction_keywords||[])],abilities:(raw.ability_ids||[]).map(a=>typeof a==='string'?{id:a}:a),bodyguardIds:attachment?.eligible_bodyguard_ids||[],modelCounts:[...counts].sort((a,b)=>a-b).length?[...counts].sort((a,b)=>a-b):[1],legend:!!raw.is_legend},provenance(raw,file));
  }
  for(const {raw,file} of selectedSheets){
   const match=existing.find(r=>r.kind==='unit'&&L.factionMatches(r.faction,factionName)&&norm(r.name)===norm(raw.name));
   if(!match)warnings.push('New CSV units use a model count of 1 until you review their unit settings.');
   const bodyguardIds=table('datasheets_leader').filter(x=>x.raw.leader_id===raw.id).map(x=>{const name=unitNames.get(x.raw.attached_id);return existing.find(r=>r.kind==='unit'&&L.factionMatches(r.faction,factionName)&&norm(r.name)===norm(name))?.data.id||'waha-unit-'+x.raw.attached_id+'-'+slug(factionName);});
   const keywords=table('datasheets_keywords').filter(x=>x.raw.datasheet_id===raw.id).map(x=>plain(x.raw.keyword));
   add('unit','waha-unit-'+raw.id+'-'+slug(factionName),raw.name,{keywords,abilities:[],bodyguardIds,modelCounts:match?.data.modelCounts||[1],legend:false},provenance(raw,file));
  }
  for(const {raw,file,csv:fromCSV} of detRows)add('detachment',fromCSV?'waha-detachment-'+raw.id+'-'+slug(factionName):raw.id,raw.name,{rules:raw.detachment_rule_ids||[raw.detachment_rule_id].filter(Boolean),stratagems:raw.stratagem_ids||[],enhancements:raw.enhancement_ids||[],dispositions:raw.force_dispositions||String(raw.force_disposition||'').split(/[,;]+/).map(s=>s.trim()).filter(Boolean),gameModes:raw.game_modes||[]},provenance(raw,file));
  const sourceAbilities=table('abilities'),sourceStrats=table('stratagems').filter(x=>inFaction(x.raw)&&(!x.csv||x.raw.faction_id||/^core\b/i.test(x.raw.type||''))),sourceEnh=table('enhancements').filter(x=>inFaction(x.raw));
  const sourceRule=(raw,file,{id,name=raw.name,category='ability',units:applicable=[],detachment='',enhancement='',text='',map=[]}={})=>{
   const summary=text||plain(raw.description||raw.summary||'')||'Imported structured mechanics for '+plain(name)+'. Review the imported source details before writing a study summary.';
   add('rule',id,plain(name),{category,units:[...new Set(applicable.filter(Boolean))],...timing(raw,map),summary,conditions:['Imported source: confirm current wording, timing, targets and restrictions before using this rule.'],sourceIds:['admin'],status:'source-reference',referenceOnly:true,expanded:true,adminManaged:true,detachment,enhancement:enhancement||null,bearerKeywords:raw.keyword_restrictions||[],bearerRestrictions:raw.datasheet_restriction_groups||[],enhancementUpgrade:raw.upgrade_tag===true||raw.upgrade==='true',sourceLabel:!/\.json$/i.test(file)?'Wahapedia export':'40kdc community data',sourceUrl:!/\.json$/i.test(file)?'https://wahapedia.ru/wh40k11ed/the-rules/data-export/':'https://github.com/wn-mitch/40kdc-data'},provenance(raw,file,text||plain(raw.description||raw.summary||'')));
  };
  for(const {raw,file,csv:fromCSV} of sourceAbilities){
   if(fromCSV)continue;if(!inFaction(raw)&&!refs.has(raw.ability_id))continue;
   const id=raw.ability_id;if(!id||!raw.name){warnings.push('Skipped an ability missing its ID or name in '+file);continue;}
   const strat=sourceStrats.find(x=>(x.raw.ability_id||x.raw.id)===id)?.raw,enh=sourceEnh.find(x=>(x.raw.ability_id||x.raw.id)===id)?.raw;
   const names=[...(refs.get(id)||[]),...(raw.unit_ids||[]).map(fallbackName).filter(Boolean)];
   if(raw.unit_ids?.length&&!names.length)warnings.push(raw.name+': select units.json as well to resolve eligible unit names.');
   const start=candidates.length;sourceRule({...raw,...(strat?{player_turn:strat.player_turn}:{} ),...(enh?{keyword_restrictions:enh.keyword_restrictions,datasheet_restriction_groups:enh.datasheet_restriction_groups,upgrade_tag:enh.upgrade_tag}:{} )},file,{id,name:raw.name,category:enh||raw.ability_type==='enhancement'?'enhancement':strat||raw.ability_type==='stratagem'?'stratagem':['faction','detachment'].includes(raw.ability_type)?'army':'ability',units:names,detachment:detNames.get((enh||strat||raw).detachment_id)||'',enhancement:enh?.name||(raw.ability_type==='enhancement'?raw.name:''),map:table('phase-mappings').find(x=>x.raw.source_id===id)?.raw.phases||[]});if(raw.unit_ids?.length&&!names.length&&candidates[start]){candidates[start].row.data.phase=[];candidates[start].row.data.conditions.push('Eligible unit names could not be resolved; set them before adding guide timing.');}
  }
  for(const {raw,file,csv:fromCSV} of [...sourceEnh,...sourceStrats]){
   if(!fromCSV&&sourceAbilities.some(x=>x.raw.ability_id===(raw.ability_id||raw.id)))continue;
   sourceRule(raw,file,{id:fromCSV?'waha-'+(sourceEnh.some(x=>x.raw===raw)?'enhancement-':'stratagem-')+raw.id+'-'+slug(factionName):raw.ability_id||raw.id,category:sourceEnh.some(x=>x.raw===raw)?'enhancement':'stratagem',detachment:plain(raw.detachment)||detNames.get(raw.detachment_id)||'',enhancement:sourceEnh.some(x=>x.raw===raw)?plain(raw.name):''});
  }
  const wahaAbilities=sourceAbilities.filter(x=>x.csv),linked=new Map();
  for(const {raw,file} of table('datasheets_abilities').filter(x=>sheetIds.has(x.raw.datasheet_id))){
   const base=wahaAbilities.find(x=>x.raw.id===raw.ability_id)?.raw||{},name=plain(raw.name||base.name),description=plain(raw.description||base.description);if(!name||!description)continue;
   const key=stable([raw.ability_id||name,name,description]);if(!linked.has(key))linked.set(key,{raw:{...base,...raw,name,description},file,names:[],id:raw.ability_id||raw.datasheet_id+'-'+raw.line});linked.get(key).names.push(unitNames.get(raw.datasheet_id));
  }
  for(const entry of linked.values())sourceRule(entry.raw,entry.file,{id:'waha-ability-'+entry.id+'-'+hash(entry.raw.description)+'-'+slug(factionName),name:entry.raw.name,units:entry.names,category:norm(entry.raw.type)==='core'?'core':norm(entry.raw.type)==='faction'?'army':'ability',text:entry.raw.description});
  for(const {raw,file} of wahaAbilities.filter(x=>inFaction(x.raw)&&x.raw.faction_id&&!refs.has(x.raw.id)))sourceRule(raw,file,{id:'waha-ability-'+raw.id+'-'+slug(factionName),category:'army'});
  for(const {raw,file} of table('detachment_abilities').filter(x=>inFaction(x.raw)))sourceRule(raw,file,{id:'waha-detachment-rule-'+raw.id+'-'+slug(factionName),category:'army',detachment:plain(raw.detachment)||detNames.get(raw.detachment_id)||''});
  for(const {row,file} of canonical)candidates.push({row:{...copy(row),revision:0},source:false,file});
  if(candidates.some(c=>c.source)&&!factionRecord){add('faction',slug(factionName),factionName,{group,aliases:importedFaction?.raw.aliases||[]},importedFaction?provenance(importedFaction.raw,importedFaction.file):null,'');}
  if(candidates.length>2000)throw Error('More than 2,000 entries found. Choose files for one faction and a smaller set of rules.');
  if(!candidates.length)throw Error('No supported entries matched this faction. Include its factions/units files to resolve IDs, or use a WarPlanner JSON export.');
  return {candidates,warnings:[...new Set(warnings)],faction:factionName};
 }
 function match(candidate,existing){
  const row=candidate.row,sourceId=row.data.importSource?.sourceId;
  const direct=existing.find(r=>r.key===row.key)||sourceId&&existing.find(r=>r.kind===row.kind&&L.factionMatches(r.faction,row.faction)&&(r.data.sourceRuleId===sourceId||L.aliases[sourceId]===r.data.id||sourceId==='burning-lance-aeldari'&&r.data.id==='fuegan-burning-lance'));
  if(direct)return direct;
  const same=existing.filter(r=>r.kind===row.kind&&norm(r.name)===norm(row.name)&&(row.kind==='faction'||L.factionMatches(r.faction,row.faction))&&(row.kind!=='rule'||r.data.category===row.data.category&&norm(r.data.detachment)===norm(row.data.detachment)));
  if(same.length>1&&row.kind==='rule'&&row.data.units?.length){const linked=same.filter(r=>r.data.units?.some(n=>row.data.units.some(u=>norm(n)===norm(u))));if(linked.length===1)return linked[0];}
  if(same.length>1)throw Error('Ambiguous match for '+row.name+'. Use a WarPlanner export with its stable ID.');return same[0];
 }
 function plan(parsed,existing){
  const rows=[],seen=new Map();
  for(const candidate of parsed.candidates){
   let old,proposed,error='';try{C.validate(candidate.row);old=match(candidate,existing);proposed=copy(candidate.row);if(old){proposed.key=old.key;proposed.data.id=old.data.id;proposed.revision=old.revision;if(candidate.source)proposed.faction=old.faction;}C.validate(proposed);}catch(e){error=e.message;const rejected=proposed||candidate.row;proposed={key:'invalid:'+rows.length,kind:typeof rejected?.kind==='string'?rejected.kind:'rule',faction:typeof rejected?.faction==='string'?rejected.faction:'',name:typeof rejected?.name==='string'?rejected.name:'Invalid entry '+(rows.length+1),data:{summary:'Entry rejected: '+error},enabled:false,revision:0};}
   const before=old?copy(old):null,sourceOnly=old&&candidate.source?{...copy(old),data:{...copy(old.data),importSource:copy(proposed.data.importSource)}}:null;
   const action=error?'skip':old?(candidate.source&&stable(old.data.importSource)!==stable(sourceOnly.data.importSource)?'source':'skip'):'add';
   const entry={key:proposed.key,name:proposed.name,kind:proposed.kind,before,proposed,sourceOnly,action,error,source:candidate.source};
   const previous=seen.get(entry.key);if(previous){if(stable(previous.proposed.data)!==stable(entry.proposed.data)){previous.error='Conflicting source records share this ID. Choose one source file.';previous.action='skip';}continue;}
   seen.set(entry.key,entry);rows.push(entry);
  }
  const unitIds=new Map(rows.filter(e=>!e.error&&e.kind==='unit').map(e=>[e.proposed.data.importSource?.record.id||e.proposed.data.id,e.proposed.data.id]));for(const entry of rows.filter(e=>!e.error&&e.kind==='unit'))entry.proposed.data.bodyguardIds=entry.proposed.data.bodyguardIds.map(id=>unitIds.get(id)||id);
  return {rows,warnings:parsed.warnings};
 }
 function selected(review){
  const rows=[];for(const entry of review.rows){if(entry.action==='skip')continue;if(entry.error)throw Error(entry.name+': '+entry.error);const row=entry.action==='source'?entry.sourceOnly:entry.proposed;if(!row)throw Error('Unsupported import choice.');C.validate(row);rows.push(copy(row));}
  if(!rows.length)throw Error('Choose at least one entry to import.');if(rows.length>1000)throw Error('Import at most 1000 entries at a time. Skip some entries and retry.');return rows;
 }
 function exportCatalog(records){return JSON.stringify({format:'warplanner-rules',version:1,entries:records.map(({key,kind,faction,name,data,enabled})=>({key,kind,faction,name,data,enabled}))},null,2);}
 function template(faction='Aeldari'){return exportCatalog([{key:'rule:example-ability',kind:'rule',faction,name:'Example ability',enabled:true,data:{id:'example-ability',name:'Example ability',category:'ability',units:[],phase:[],turn:'either',window:'act',summary:'Replace this with the rule text or your study summary.',conditions:[],sourceIds:['admin'],status:'source-reference',referenceOnly:true,expanded:true}}]);}
 const api={plain,csv,parse,plan,selected,exportCatalog,template};if(node)module.exports=api;else root.WarPlannerRulesImport=api;
})(typeof window!=='undefined'?window:globalThis);
