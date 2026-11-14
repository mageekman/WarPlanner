/* Source-bound Space Marine/chapter study audit, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-marines.cjs BEFORE_JSON OUTPUT_PREFIX
 * Produces revision-checked SQL, never connects or applies it. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),I=require('../dist/rules-import.js');
const source=require('../tests/fixtures/marines-audit-sources.json'),baseline=require('../tests/fixtures/marines-audit-before.json'),notes=require('./marines-study-notes.json');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b';
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex'),copy=x=>structuredClone(x);
const names={'adeptus-astartes':'Space Marines','blood-angels':'Blood Angels','dark-angels':'Dark Angels',deathwatch:'Deathwatch','black-templars':'Black Templars','space-wolves':'Space Wolves',ultramarines:'Ultramarines','imperial-fists':'Imperial Fists','iron-hands':'Iron Hands','raven-guard':'Raven Guard',salamanders:'Salamanders','white-scars':'White Scars'};
const tables=(folder,table,section='core')=>source[section+'/'+folder+'/'+table+'.json']||[];
const native=Object.keys(names).flatMap(f=>tables(f,'abilities','enrichment').map(raw=>({raw,file:'data/enrichment/'+f+'/abilities.json',folder:f})));
const bySource=new Map(native.map(x=>[x.raw.ability_id,x])),noteMap=new Map(notes.flatMap(n=>n.sourceIds.map(id=>[id,n])));
assert.equal(native.length,640);assert.equal(bySource.size,640);assert.equal(noteMap.size,640);
const abilityIds=raw=>(raw.ability_ids||[]).map(a=>typeof a==='string'?a:a.id);
const phaseNames=['command','movement','shooting','charge','fight'];
function filter(f){
 if(!f)return '';const out=[];
 if(f.all_of?.length)out.push(f.all_of.join(' + '));if(f.any_of?.length)out.push('('+f.any_of.join(' or ')+')');
 if(f.none_of?.length)out.push('excluding '+f.none_of.join(' or '));
 if(f.not_states?.includes('engaged'))out.push('unengaged');if(f.state)out.push({engaged:'engaged','battle-shocked':'Battle-shocked',embarked:'embarked'}[f.state]||f.state);
 if(f.within){const w=f.within,of=typeof w.of==='string'?{'event-subject':'the triggering enemy', 'this-unit':'this unit','this-model':'the bearer','battlefield-edge':'a battlefield edge'}[w.of]||w.of:w.of?.objective?'an objective marker':filter(w.of)||'the specified unit';out.push((w.wholly?'wholly ':'')+(w.range==='objective-control'?'within control range of ': 'within '+w.range?.inches+'″ of ')+of);}
 if(f.visible)out.push('visible to the bearer');if(f.embarked_in)out.push('embarked in this transport');
 if(f.engaged_with)out.push('engaged with '+(f.engaged_with==='event-subject'?'the triggering enemy':f.engaged_with==='this-unit'?'this unit':filter(f.engaged_with)));
 return out.join('; ');
}
function eligibility(e){
 if(!e)return '';if(e.operator)return '('+e.operands.map(eligibility).join(e.operator==='or'?' OR ':' AND ')+')';const p=e.parameters||{};
 if(e.type==='matches')return filter(p.filter);
 if(e.type==='eligible')return p.to==='fight'?'eligible to fight':p.to==='embark-within'?'eligible to embark':'eligible for '+p.to;
 if(e.type==='happened')return 'targeted by the triggering enemy';
 if(e.type==='unit-state')return 'engaged with the triggering enemy'+(p.at==='phase-start'?' at phase start':'');
 if(e.type==='strength')return 'below '+p.below+' strength';
 if(e.type==='equipped-weapon-count')return 'equipped with at least one Melta or Torrent weapon';
 throw Error('Unreviewed target eligibility: '+JSON.stringify(e));
}
function target(row,raw,core){
 const d=row.data;
 if(d.category==='stratagem'){
  const r=core?.target_restrictions;if(!r)return 'Eligible unit specified in the summary; source has no separate target selection record.';
  assert.ok(Object.keys(r).every(k=>['required_keywords','required_keywords_any','excluded_keywords','count','selects','bound_to','side','eligibility'].includes(k)));
  return ['One friendly '+[...(r.required_keywords||[]),r.required_keywords_any?.length?'('+r.required_keywords_any.join(' or ')+')':''].filter(Boolean).join(' + ')+' '+(r.selects||'unit'),r.excluded_keywords?.length?'excluding '+r.excluded_keywords.join(' or '):'',r.bound_to==='attacked-unit'?'the attacked unit':r.bound_to==='triggering-unit'?'the triggering unit':'',eligibility(r.eligibility),...([].concat(raw.trigger||[]).filter(t=>t&&typeof t==='object').map(t=>t.object?.owner==='friendly'?t.object:t.subject?.owner==='friendly'?t.subject:null).filter(Boolean).map(f=>filter(Object.fromEntries(Object.entries(f).filter(([k])=>!['owner','all_of'].includes(k))))))].filter(Boolean).join('; ')+'.';
 }
 if(d.category==='enhancement')return 'Bearer/upgrade: '+(core?.keyword_restrictions||raw.keyword_restrictions||raw.applies_to?.all_of||[]).join(' + ')+(core?.datasheet_restriction_groups?.length?'; '+core.datasheet_restriction_groups.map(g=>g.unit_id||g.keywords?.join(' + ')).filter(Boolean).join(' or '):'')+'. Apply only to the bearer or unit specified in the summary.';
 if(d.units.length)return 'This '+d.units.join(' / ')+'. Apply the summary’s target and range conditions.';
 const f=raw.effect?.target;return f&&typeof f==='object'?filter(f)+'.': 'Eligible '+row.faction+' units or targets specified in the summary.';
}
function timing(raw,core,d){
 const phases=new Set(),turns=new Set();function walk(x){if(!x||typeof x!=='object')return;if(x.type==='phase-is'&&phaseNames.includes(x.parameters?.phase))phases.add(phaseNames.indexOf(x.parameters.phase));if(x.type==='player-turn-is')turns.add(x.parameters?.turn);for(const v of Object.values(x))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);}walk(raw);
 const tr=Array.isArray(raw.trigger)?null:raw.trigger,event=tr?.event;
 if(core?.phases?.length){phases.clear();core.phases.forEach(p=>{assert.ok(phaseNames.includes(p));phases.add(phaseNames.indexOf(p));});}
 if(!phases.size){const text=JSON.stringify(raw.effect),to=tr?.filter?.to,moves=tr?.filter?.move_types||[];
  if(to==='shoot'||tr?.filter?.kind==='shoot')phases.add(2);if(to==='fight'||tr?.filter?.kind==='fight')phases.add(4);
  if(moves.includes('charge'))phases.add(3);if(moves.some(m=>['normal','advance','fall-back'].includes(m)))phases.add(1);
  if(text.includes('"type":"ranged"')||text.includes('"attack_type":"ranged"'))phases.add(2);
  if(text.includes('"type":"melee"')||text.includes('"attack_type":"melee"')||text.includes('fights-first'))phases.add(4);
  if(text.includes('"roll":"advance"'))phases.add(1);if(text.includes('"roll":"charge"'))phases.add(3);
 }
 if(event==='round-started')phases.add(0);if(event==='battle-started'||event==='deployment-ended'||event==='battle-formations-declared')phases.clear();
 const turn=core?.player_turn||raw.player_turn|| (turns.size===1?[...turns][0]:null);
 return {phase:[...phases].sort(),turn:turn==='your-turn'?'you':turn==='opponent-turn'?'opponent':'either',window:({'phase-started':'start','phase-ended':'end','round-started':'round','round-ended':'round-end','turn-started':'turn-start','turn-ended':'turn-end','attacks-resolved':'after','move-ended':'after','model-destroyed':'after','targets-selected':'select',selected:'select','battle-started':'prebattle','deployment-ended':'prebattle','battle-formations-declared':'prebattle'})[event]||d.window||'act'};
}
function audit(records){
 for(const expected of baseline){const row=records.find(r=>r.key===expected.key);assert.ok(row,'Missing catalog entry: '+expected.key);for(const key of ['kind','faction','name','enabled','revision','data'])assert.equal(stable(row[key]),stable(expected[key]),'Entry changed; rebuild the audit: '+expected.key+' / '+key);}
 for(const f of Object.values(names))assert.ok(!records.some(r=>(r.faction===f||r.kind==='faction'&&r.name===f)&&!baseline.some(b=>b.key===r.key)),'Unexpected workshop entry; rebuild the audit: '+f);
 const result=new Map(records.map(r=>[r.key,copy(r)])),parent=baseline.filter(r=>r.faction==='Space Marines'),parentUnits=parent.filter(r=>r.kind==='unit'),parentDets=parent.filter(r=>r.kind==='detachment'),parentRules=parent.filter(r=>r.kind==='rule');
 const add=r=>{assert.ok(!result.has(r.key),'Duplicate '+r.key);result.set(r.key,r);};
 const mk=(kind,id,faction,name,data)=>({key:kind+':'+id,kind,faction,name,data:{id,name,...data},enabled:true,revision:0});
 for(const [folder,faction] of Object.entries(names)){
  const suffix=folder==='adeptus-astartes'?'':'-'+folder;
  const own=()=>[...result.values()].filter(r=>r.faction===faction);
  if(folder!=='adeptus-astartes'){
   const rawFaction=tables(folder,'factions')[0];
   if(!records.some(r=>r.kind==='faction'&&r.name===faction))add(mk('faction',folder,'',faction,{group:'Space Marines',aliases:rawFaction.aliases||[],importSource:{name:'40kdc-data',file:'data/core/'+folder+'/factions.json',sourceId:folder,record:copy(rawFaction),commit:pin}}));
   for(const p of parentUnits){const chapters=p.data.importSource.record.faction_keywords.filter(k=>k!=='Adeptus Astartes');if(chapters.length&&!chapters.includes(faction))continue;
    if(own().some(r=>r.kind==='unit'&&r.data.importSource?.sourceId===p.data.importSource.sourceId))continue;
    const id=p.data.importSource.record.id+suffix,r=mk('unit',id,faction,p.name,copy(p.data));r.data.id=id;r.data.keywords=[...new Set([...r.data.keywords,faction])];r.data.inheritedFrom=p.key;add(r);
   }
   const parsed=I.parse(Object.entries(source).filter(([path])=>path.split('/')[1]===folder).map(([name,data])=>({name:'data/'+name,text:JSON.stringify(data)})),{faction,group:'Space Marines'},[...result.values()]);
   for(const {row} of parsed.candidates.filter(c=>['rule','detachment'].includes(c.row.kind))){if(own().some(r=>r.kind===row.kind&&r.data.importSource?.sourceId===row.data.importSource?.sourceId))continue;
    const id=(row.data.importSource.sourceId||row.data.id)+suffix;row.data.id=id;row.key=row.kind+':'+id;row.revision=0;add(row);
   }
   // Native detachments refer to parent IDs; retain their original records, namespace the catalog IDs.
   for(const p of parentDets){if(own().some(r=>r.kind==='detachment'&&r.data.importSource?.sourceId===p.data.importSource?.sourceId))continue;
    const r=mk('detachment',p.data.id+suffix,faction,p.name,copy(p.data));r.data.id=p.data.id+suffix;r.data.inheritedFrom=p.key;add(r);
   }
   const units=own().filter(r=>r.kind==='unit'),unitIds=new Set(units.map(r=>r.data.importSource.record.id)),dets=new Set(own().filter(r=>r.kind==='detachment').map(r=>r.data.importSource?.record.id));
   const natives=native.filter(x=>x.folder===folder),nativeNames=new Set(natives.filter(x=>x.raw.ability_type==='faction').map(x=>x.raw.name));
   for(const p of [...parentRules,...[...result.values()].filter(r=>r.faction==='Space Marines'&&r.kind==='rule'&&!parentRules.some(p=>p.key===r.key)&&r.data.importSource.record.detachment_id&&parentDets.some(d=>d.data.importSource.record.detachment_rule_ids?.includes(r.data.importSource.sourceId)||d.data.importSource.record.detachment_rule_id===r.data.importSource.sourceId))]){const raw=p.data.importSource.record;if(own().some(r=>r.kind==='rule'&&r.data.importSource?.sourceId===raw.ability_id))continue;
    if(raw.ability_type==='unit'&&!(raw.unit_ids||[]).some(id=>unitIds.has(id))&&!units.some(u=>abilityIds(u.data.importSource.record).includes(raw.ability_id)))continue;
    if(raw.ability_type==='unit'&&(raw.unit_ids||[]).length&&(raw.unit_ids||[]).filter(id=>unitIds.has(id)).every(id=>natives.some(n=>n.raw.name===raw.name&&n.raw.unit_ids?.includes(id))))continue;
    if(raw.ability_type==='faction'&&nativeNames.has(raw.name))continue;
    if(raw.detachment_id&&!dets.has(raw.detachment_id))continue;
    const r=mk('rule',p.data.id+suffix,faction,p.name,copy(p.data));r.data.id=p.data.id+suffix;r.data.inheritedFrom=p.key;add(r);
   }
  }
  // Parent contains all chapter datasheets, so supply their unit abilities too.
  if(folder==='adeptus-astartes')for(const {raw,file} of native.filter(x=>x.folder!==folder&&['unit','faction'].includes(x.raw.ability_type)&&parentUnits.some(u=>u.data.importSource.record.faction_keywords.includes(names[x.folder])&&(x.raw.unit_ids?.includes(u.data.importSource.record.id)||abilityIds(u.data.importSource.record).includes(x.raw.ability_id)))||x.folder!==folder&&parentDets.some(d=>d.data.rules.includes(x.raw.ability_id)))){
   if(own().some(r=>r.kind==='rule'&&r.data.importSource?.sourceId===raw.ability_id))continue;
   const id=raw.ability_id+'-space-marines',r=mk('rule',id,faction,raw.name,{category:['faction','detachment'].includes(raw.ability_type)?'army':'ability',units:[],phase:[],turn:'either',window:'act',summary:'Pending source audit.',conditions:[],sourceIds:['admin'],status:'source-reference',referenceOnly:true,expanded:true,adminManaged:true,sourceLabel:'40kdc community data',sourceUrl:'https://github.com/wn-mitch/40kdc-data',importSource:{name:'40kdc-data',file,sourceId:raw.ability_id,record:copy(raw),commit:pin}});add(r);
  }
  const units=own().filter(r=>r.kind==='unit'),unitMap=new Map(units.map(r=>[r.data.importSource.record.id,r.data.id]));
  const rules=own().filter(r=>r.kind==='rule'),ruleMap=new Map(rules.map(r=>[r.data.importSource.sourceId,r.data.id]));
  // Chapter faction rules supersede the parent faction rule, without linking other chapters.
  for(const p of parentRules.filter(r=>r.data.importSource.record.ability_type==='faction')){if(!ruleMap.has(p.data.importSource.sourceId)){const equivalent=rules.find(r=>r.name===p.name&&r.data.importSource.record.ability_type==='faction');if(equivalent)ruleMap.set(p.data.importSource.sourceId,equivalent.data.id);}}
  for(const r of units){const raw=r.data.importSource.record;const attachment=tables('adeptus-astartes','leader-attachments').find(x=>x.leader_id===raw.id);
   r.data.bodyguardIds=(attachment?.eligible_bodyguard_ids||r.data.bodyguardIds||[]).filter(id=>unitMap.has(id)).map(id=>unitMap.get(id));
   r.data.abilities=(raw.ability_ids||[]).filter(a=>{const id=typeof a==='string'?a:a.id,e=bySource.get(id);if(!e)return true;
    const chapter=folder==='adeptus-astartes'?Object.keys(names).find(f=>f!=='adeptus-astartes'&&raw.faction_keywords.includes(names[f])):folder;
    if(e.folder!=='adeptus-astartes'&&e.folder!==chapter)return false;
    if(e.folder==='adeptus-astartes'&&chapter&&native.some(n=>n.folder===chapter&&n.raw.name===e.raw.name&&n.raw.unit_ids?.includes(raw.id)))return false;return true;
   }).map(a=>{const id=typeof a==='string'?a:a.id;return {...(typeof a==='object'?a:{}),id:ruleMap.get(id)||id};});
  }
  for(const row of rules){const d=row.data,original=d.importSource.record,sourceId=d.importSource.sourceId,entry=bySource.get(sourceId);assert.ok(entry,'Missing mechanics '+sourceId);let raw=entry.raw,note=noteMap.get(sourceId);
   // Existing enrichment may contain importer-added core restrictions/player-turn metadata only.
   if(original.effect&&['banner-of-macragge-adeptus-astartes','martial-paragon-tacticus-attack-force-adeptus-astartes','angelic-executioner-encarmine-speartip-blood-angels','shadow-of-abomination-encarmine-speartip-blood-angels'].includes(sourceId)){
    const reviewed=baseline.find(r=>r.kind==='rule'&&r.data.importSource.sourceId===sourceId);assert.equal(stable(original),stable(reviewed.data.importSource.record));raw=original;
    if(sourceId.startsWith('banner-of-macragge'))note={...note,summary:note.summary+' The melee bonus lasts for the phase.'};
    if(sourceId.startsWith('martial-paragon'))note={...note,state:'needs-summary',summary:'This saved Martial Paragon variant permits one Hit and one Wound re-roll, unlike the pinned source’s choice of attack keywords. Its saved mechanics do not state a per-activation or per-phase limit; check which version and limit apply.'};
    if(sourceId.startsWith('angelic-executioner'))note={...note,state:'structured',summary:'When the bearer’s unit fights, choose Lethal Hits or Sustained Hits 1 for its melee weapons for the phase.'};
    if(sourceId.startsWith('shadow-of-abomination'))note={...note,state:'structured',summary:'Once per battle for your army, when the bearer fights, improve its melee Damage by 1 for the phase.'};
   }else for(const k of ['effect','scope','trigger','usage','community_notes'])if(original.effect)assert.equal(stable(original[k]),stable(raw[k]),'Source mechanics changed: '+sourceId+' / '+k);
   const core=tables(folder,d.category==='enhancement'?'enhancements':'stratagems').find(c=>(c.ability_id||c.id)===sourceId)||tables(entry.folder,d.category==='enhancement'?'enhancements':'stratagems').find(c=>(c.ability_id||c.id)===sourceId);
   const nativeCore=core||null;
   d.units=units.filter(u=>u.data.abilities.some(a=>a.id===d.id)).map(u=>u.name);
   
   d.summary=note.state==='missing'?note.summary.replace('this named rule',row.name):note.summary;d.mechanicsPresentation=note.state;
   if(/Once per (turn|battle round|battle|phase)/i.test(raw.name)&&!/^Once per/i.test(d.summary)&&note.state==='structured'){const limit=raw.name.match(/Once per (turn|battle round|battle|phase)(?:,? per (unit|army))?/i);d.summary=limit[0]+'. '+d.summary;}
   d.targetText=target(row,raw,nativeCore);Object.assign(d,timing(raw,nativeCore,d));
   d.conditions=['Source-derived study note; confirm against current rules.'];
   if(nativeCore?.cp_cost!==undefined)d.conditions.push('Stratagem cost: '+nativeCore.cp_cost+'CP.'+(nativeCore.timing==='once-per-phase'?' Once per phase.':''));
   if(nativeCore?.keyword_restrictions){d.bearerKeywords=copy(nativeCore.keyword_restrictions);d.bearerRestrictions=copy(nativeCore.datasheet_restriction_groups||[]);d.enhancementUpgrade=nativeCore.upgrade_tag===true;}
   // Raw mechanics remain available in the Workshop; keep the detailed breakdown on native rows only.
   if(!d.inheritedFrom)d.mechanicsDetails=M.describe(raw).details;
   else delete d.mechanicsDetails;
   const coreRecord=nativeCore?Object.fromEntries(Object.entries(nativeCore).filter(([k])=>!['external_refs','game_version'].includes(k))):null;
   d.summaryAudit={id:'marines-2026-11-14',sourceHash:digest(original),summaryHash:digest(d.summary),mechanicsSourceId:sourceId,mechanicsHash:digest(raw),coreSource:coreRecord,commit:pin};
   if([14,25,134,136,173].some(i=>notes[i]===note)&&!d.guide)d.guide={order:'early',rank:15,phases:[2],turn:'you',label:'Early',note:'Consider resolving this before other shooters that benefit from the marked target.',flags:[]};
   if(note===notes[27]&&!d.guide)d.guide={order:'normal',rank:50,phases:[4],turn:'either',label:'',note:'This ability grants Fights First to the unit.',flags:['Fights First']};
   if(note===notes[532]&&!d.guide)d.guide={order:'normal',rank:50,phases:[4],turn:'either',label:'',note:'The bearer has Fights First; this does not grant it to other models.',flags:['Bearer: Fights First']};
  }
  for(const r of own().filter(r=>r.kind==='detachment'))for(const field of ['rules','stratagems','enhancements'])r.data[field]=r.data[field].map(id=>ruleMap.get(id)||id);
 }
 const changes=[...result.values()].filter(r=>{const old=records.find(o=>o.key===r.key);return !old||stable(old.data)!==stable(r.data)||old.enabled!==r.enabled;});changes.forEach(C.validate);
 const counts=Object.fromEntries(Object.values(names).map(f=>{const rows=[...result.values()].filter(r=>r.faction===f);return [f,{rules:rows.filter(r=>r.kind==='rule').length,units:rows.filter(r=>r.kind==='unit').length,detachments:rows.filter(r=>r.kind==='detachment').length,...Object.fromEntries(['structured','needs-summary','missing'].map(s=>[s,rows.filter(r=>r.kind==='rule'&&r.data.mechanicsPresentation===s).length]))}];}));
 return {changes,after:[...result.values()],counts};
}
module.exports={audit,notes,names,digest};
if(require.main===module){const [path,out]=process.argv.slice(2);if(!out)throw Error('Provide a catalog snapshot and output prefix.');const result=audit(JSON.parse(fs.readFileSync(path)));fs.writeFileSync(out+'-after.json',JSON.stringify(result.after));
 for(const [folder,faction] of Object.entries(names)){const rows=result.changes.filter(r=>r.faction===faction||r.kind==='faction'&&r.name===faction);assert.ok(rows.length<1000);const payload=rows.map(({key,kind,faction,name,data,enabled,revision})=>({key,kind,faction,name,data,enabled,expectedRevision:revision}));
 fs.writeFileSync(out+'-'+folder+'.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($marines_audit$${JSON.stringify(payload)}$marines_audit$::jsonb);\nCOMMIT;\n`);}
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({changed:result.changes.length,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts},null,2));}
