/* Astra Militarum source-bound study audit, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-astra.cjs BEFORE_JSON OUTPUT_PREFIX
 * Generates a revision-checked repair; never connects to or writes a database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js');
const baseline=require('../tests/fixtures/astra-audit-before.json'),sources=require('../tests/fixtures/astra-audit-sources.json'),notes=require('./astra-study-notes.json');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b',faction="astra militarum";
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const table=name=>sources['core-'+name+'.json'];
const unitName=id=>table('units').find(u=>u.id===id)?.name||id;
function subject(x){
 if(typeof x==='string')return {'event-subject':'the triggering unit','event-object':'the triggering casualty','this-unit':'this unit','this-model':'the bearer'}[x]||x;
 if(x?.stratagem_target)return x.stratagem_target+' target';
 if(x?.objective)return (x.objective.controlled_by==='friendly'?'a friendly-controlled':'an')+' objective marker';
 return filter(x);
}
function filter(f={}){
 const parts=[];
 for(const key of Object.keys(f))assert.ok(['all_of','any_of','none_of','not_states','state','within','unit_ids','level','designated','owner','engaged_with'].includes(key),'Unreviewed target filter: '+key);
 if(f.owner)parts.push(f.owner==='friendly'?'friendly':f.owner==='enemy'?'enemy':f.owner);
 if(f.all_of?.length)parts.push(f.all_of.join(' + '));if(f.any_of?.length)parts.push('('+f.any_of.join(' or ')+')');
 if(f.none_of?.length)parts.push('excluding '+f.none_of.join(' or '));if(f.not_states?.length)parts.push('not '+f.not_states.join(' or '));
 if(f.state)parts.push(f.state);if(f.designated)parts.push('designated '+f.designated);if(f.unit_ids)parts.push(f.unit_ids.map(unitName).join(' or '));if(f.engaged_with)parts.push('engaged with '+subject(f.engaged_with));
 if(f.within){const w=f.within;assert.ok(Object.keys(w).every(k=>['of','range','wholly'].includes(k)));parts.push(w.range==='objective-control'?'within control range of '+subject(w.of):(w.wholly?'wholly ':'')+'within '+w.range.inches+'″ of '+subject(w.of));}
 return parts.join('; ');
}
function eligibility(x){
 if(!x)return '';if(x.operator){assert.ok(['not','and','or'].includes(x.operator));return x.operator==='not'?'not ('+x.operands.map(eligibility).join('; ')+')':'('+x.operands.map(eligibility).join(x.operator==='and'?' AND ':' OR ')+')';}
 const p=x.parameters||{};
 if(x.type==='matches')return filter(p.filter);
 if(x.type==='eligible'){assert.ok(['declare-charge','fight','embark-within'].includes(p.to));return p.to==='embark-within'?'eligible to embark within a '+filter(p.transport):'eligible to '+p.to.replace('declare-charge','declare a charge');}
 if(x.type==='model-count'){assert.equal(p.min,13);return 'at least 13 models';}
 if(x.type==='unit-state'){assert.equal(p.state,'engaged');assert.equal(p.at,'phase-start');return 'engaged at the start of the phase';}
 if(x.type==='strength'){assert.ok(['starting','half'].includes(p.below));return (p.subject?subject(p.subject)+': ':'')+'below '+(p.below==='half'?'Half-strength':'Starting Strength');}
 if(x.type==='rule-active'){assert.equal(p.rule?.ability_id,'voice-of-command-astra-militarum');const option=baseline.find(r=>r.kind==='rule'&&r.data.id===p.rule.ability_id).data.importSource.record.effect.effect.effect.options.find(o=>o.id===p.rule.option_id);assert.ok(option);return 'affected by '+option.name;}
 if(x.type==='same-unit')return 'same unit as '+subject(p.as);
 if(x.type==='in-region'){assert.equal(p.region?.rule_region?.region_id,'power-matrix');return (p.wholly?'wholly ':'')+'within the Power Matrix';}
 if(x.type==='happened'){
  if(p.event==='damage-allocated'){assert.equal(p.object,'this-unit');assert.equal(p.filter?.by,'event-subject');return 'damage allocated to this unit by the triggering enemy';}
  if(p.event==='after-roll'){assert.equal(p.object,'this-unit');assert.equal(p.subject,'event-subject');assert.deepEqual(p.filter,{roll:'hit',result:'success'});return 'hit by the triggering unit';}
  if(p.event==='selected'){assert.ok(['shoot','fight','move'].includes(p.filter?.to));assert.equal(p.window,'phase');return 'selected to '+p.filter.to+' this phase';}
  if(p.event==='model-destroyed'){assert.equal(p.filter?.by,'event-subject');assert.equal(p.window,'event');return 'a model in the selected unit was destroyed by the triggering enemy';}
  if(p.event==='targets-selected'){if(p.filter?.kind==='charge'){assert.equal(p.window,'phase');return 'selected charge targets this phase';}assert.equal(p.subject,'event-subject');assert.equal(p.object,'this-unit');return 'targeted by the triggering enemy';}
  if(p.event==='move-ended'){assert.ok(['charge','remain-stationary'].includes(p.filter?.move_types?.[0]));assert.equal(p.filter.move_types.length,1);assert.equal(p.window,'turn');return p.filter.move_types[0]==='charge'?'made a Charge move this turn':'Remained Stationary this turn';}
  if(p.event==='disembarked'){assert.ok(['turn','phase'].includes(p.window));return 'disembarked this '+p.window;}
  if(p.event==='set-up'){assert.equal(p.window,'phase');if(p.filter){assert.deepEqual(p.filter,{from:'strategic-reserves'});return 'set up from Strategic Reserves this phase';}return 'set up this phase';}
  if(p.event==='used'){assert.deepEqual(p.filter,{kind:'ability',id:'deep-strike'});assert.equal(p.window,'phase');return 'used Deep Strike this phase';}
  if(p.event==='attacks-resolved'){assert.equal(p.window,'phase');return 'finished its attacks this phase';}
  if(p.event==='destroyed'){assert.deepEqual(p.object,{owner:'enemy'});assert.deepEqual(p.filter,{by:'this-unit'});assert.equal(p.window,'phase');return 'destroyed an enemy unit this phase';}
 }
 throw Error('Unreviewed target eligibility: '+JSON.stringify(x));
}
function target(row,core){
 const d=row.data,raw=d.importSource.record;
 if(d.category==='stratagem'&&core?.target_restrictions){const all=[].concat(core.target_restrictions);
  const rendered=all.map(t=>{
   assert.ok(Object.keys(t).every(k=>['required_keywords','required_keywords_any','excluded_keywords','count','count_max','name','mode','side','selects','bound_to','eligibility','warlord'].includes(k)));
   assert.ok(!t.side||['your-army','enemy'].includes(t.side),'Unreviewed target side: '+t.side);
   const count=t.count==='up-to'?'Up to '+t.count_max:t.count==='one-or-more'?'One or more':'One';assert.ok(['one','up-to','one-or-more'].includes(t.count));
   return [(t.mode?'Mode '+t.mode.toUpperCase()+': ':t.name?t.name+' target: ':'')+count+(t.side==='enemy'?' enemy ':' friendly ')+[...(t.required_keywords||[]),...(t.required_keywords_any?.length?['('+t.required_keywords_any.join(' or ')+')']:[])].join(' + ')+' '+(t.selects||'unit')+(t.count==='one-or-more'||t.count==='up-to'&&t.count_max>1?'s':''),t.excluded_keywords?.length?'excluding '+t.excluded_keywords.join(' or '):'',t.bound_to==='attacked-unit'?'the attacked unit':t.bound_to==='triggering-unit'?'the triggering unit':'',t.warlord?'your Warlord':'',eligibility(t.eligibility)].filter(Boolean).join('; ');
  });
  return rendered.join(all.some(t=>t.mode)?' OR ':' AND ')+'. Apply the summary’s enemy-target, range and event restrictions.';
 }
 if(d.category==='enhancement'){
  const tags=core?.keyword_restrictions||raw.keyword_restrictions||raw.applies_to?.all_of||[];
  return 'Eligible '+(tags.length?tags.join(' + ')+' ':'')+'bearer or upgrade unit'+(core?.datasheet_restriction_groups?.length?': '+core.datasheet_restriction_groups.map(g=>g.unit_id?unitName(g.unit_id):(g.keywords||[]).join(' + ')).join(' or '):'')+'. Apply only to the model or unit specified in the summary.';
 }
 if(d.units.length)return d.units.join(' / ')+'. Apply the summary’s bearer, enemy-target and range restrictions.';
 return 'Eligible '+faction+' units specified in the summary; apply its detachment, keyword, range and event restrictions.';
}
function audit(records){
 const native=records.filter(r=>r.faction===faction||r.kind==='faction'&&r.name.toLowerCase()===faction);
 assert.equal(native.length,baseline.length,'Astra Militarum catalog changed; rebuild audit.');
 for(const expected of baseline){const row=native.find(r=>r.key===expected.key);assert.ok(row,'Missing entry: '+expected.key);assert.equal(stable(row),stable(expected),'Entry changed; rebuild audit: '+expected.key);}
 const rules=baseline.filter(r=>r.kind==='rule'),units=baseline.filter(r=>r.kind==='unit'),dets=baseline.filter(r=>r.kind==='detachment');
 assert.equal(rules.length,251);assert.equal(units.length,75);assert.equal(dets.length,12);assert.equal(notes.length,rules.length);assert.equal(new Set(notes.map(n=>n.id)).size,251);
 const imported=new Set(rules.map(r=>r.data.importSource.sourceId));assert.deepEqual([...imported].sort(),sources['enrichment-abilities.json'].map(r=>r.ability_id).sort());
 for(const [kind,items] of [['units',units],['detachments',dets]])assert.deepEqual(items.map(r=>kind==='units'&&r.data.id==='tech-priest-enginseer-astra-militarum'?(assert.equal(r.data.importSource.sourceId,'tech-priest-enginseer'),assert.equal(r.data.importSource.record.id,'tech-priest-enginseer'),'tech-priest-enginseer'):r.data.id).sort(),table(kind).map(r=>r.id).sort());
 for(const u of units){assert.ok(P.read(u.data).length,'Missing unit stats: '+u.name);P.validate(P.read(u.data));const sourceUnit=table('units').find(s=>s.id===(u.data.importSource?.sourceId||u.data.id));assert.ok(sourceUnit,'Missing source unit: '+u.name);assert.deepEqual(P.read(u.data),P.read({profiles:sourceUnit.profiles}),'Stats differ from pinned source: '+u.name);for(const ref of u.data.abilities||[])assert.ok(imported.has(ref.id)||['leader','deep-strike','infiltrators','deadly-demise','damaged','firing-deck','feel-no-pain','stealth','scouts','support','lone-operative','damaged-objective-control','fights-first','hover','super-heavy-walker'].includes(ref.id),'Missing unit ability: '+u.name+' / '+ref.id);for(const id of u.data.bodyguardIds||[])assert.ok(units.some(b=>b.data.id===id),'Missing bodyguard: '+id);}
 for(const d of dets)for(const id of [...d.data.rules,...d.data.stratagems,...d.data.enhancements])assert.ok(imported.has(id),'Missing detachment rule: '+id);
 const index=new Map(notes.map(n=>[n.id,n])),changes=[];
 for(const original of rules){const row=structuredClone(original),d=row.data,raw=d.importSource.record,note=index.get(d.id);
  assert.ok(note);assert.equal(raw.faction_id,'astra-militarum');assert.equal(raw.ability_id,note.id);assert.ok(M.isPlaceholder(original.data.summary),'Refusing to replace saved wording: '+original.key);
  const core=[...table('stratagems'),...table('enhancements')].find(r=>r.ability_id===raw.ability_id||r.id===raw.ability_id);
  Object.assign(d,{summary:note.summary,targetText:target(row,core),phase:structuredClone(note.phase),turn:note.turn,window:note.window,sourceRuleId:d.sourceRuleId||d.id,timingOverride:true,mechanicsPresentation:note.state,mechanicsDetails:M.describe(raw).details});
  // Core phase/turn gates are authoritative for Stratagem reminders. Conflicts
  // within the imported effect remain explicit in the text and review state.
  if(d.category==='stratagem'&&core){d.phase=core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p));assert.ok(d.phase.every(p=>p>=0));d.turn=core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either';}
  d.conditions=[...new Set([...(d.conditions||[]),'Source-derived study summary; check the current official wording before use.',...(core?.cp_cost!==undefined?['Stratagem cost: '+core.cp_cost+'CP. '+(core.timing==='once-per-phase'?'Once per phase.':'')]:[]),...(note.state!=='structured'?['Needs source review: '+note.summary]:[]),...(raw.game_version?.dataslate?.includes('provisional')?['Source marked pre-launch provisional.']:[])])];
  if(d.category==='enhancement'&&core){d.bearerKeywords=structuredClone(core.keyword_restrictions||[]);d.bearerRestrictions=structuredClone(core.datasheet_restriction_groups||[]);d.enhancementUpgrade=core.upgrade_tag===true;}
  d.summaryAudit={id:'astra-2026-11-15',sourceHash:digest(raw),summaryHash:digest(note.summary),coreSource:core||null,coreCommit:core?pin:null};
  C.validate(row);changes.push(row);
 }
 return {changes,counts:Object.fromEntries(['structured','needs-summary','missing'].map(s=>[s,notes.filter(n=>n.state===s).length]))};
}
module.exports={audit,notes,digest,target,eligibility};
if(require.main===module){const [file,out]=process.argv.slice(2);if(!out)throw Error('Provide catalog snapshot and output prefix.');const records=JSON.parse(fs.readFileSync(file)),result=audit(records),changed=new Map(result.changes.map(r=>[r.key,r])),payload=result.changes.map(({revision,...r})=>({...r,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>changed.get(r.key)||r)));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($astra_audit$${JSON.stringify(payload)}$astra_audit$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:251,changed:result.changes.length,units:75,detachments:12,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts}));}
