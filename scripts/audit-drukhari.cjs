/* Drukhari source-bound study audit, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-drukhari.cjs BEFORE_JSON OUTPUT_PREFIX
 * Generates a revision-checked repair; never connects to or writes a database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const I=require('../dist/rules-import.js'),C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js');
const baseline=require('../tests/fixtures/drukhari-audit-before.json'),sources=require('../tests/fixtures/drukhari-audit-sources.json'),notes=require('./drukhari-study-notes.json');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b',faction='Drukhari';
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const table=name=>sources['core-'+name+'.json'];
const unitName=id=>table('units').find(u=>u.id===id)?.name||id;
function subject(x){
 if(typeof x==='string')return {'event-subject':'the triggering enemy','event-object':'the triggering casualty','this-unit':'this unit','this-model':'the bearer'}[x]||x;
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
 if(x.type==='strength'){assert.equal(p.below,'starting');return (p.subject?subject(p.subject)+': ':'')+'below Starting Strength';}
 if(x.type==='same-unit')return 'same unit as '+subject(p.as);
 if(x.type==='in-region'){assert.equal(p.region?.rule_region?.region_id,'flow-of-magic');return (p.wholly?'wholly ':'')+'within the Flow of Magic';}
 if(x.type==='happened'){
  if(p.event==='selected'){assert.ok(['shoot','fight'].includes(p.filter?.to));assert.equal(p.window,'phase');return 'selected to '+p.filter.to+' this phase';}
  if(p.event==='move-ended'){assert.deepEqual(p.filter?.move_types,['charge']);assert.equal(p.window,'turn');return 'made a Charge move this turn';}
  if(p.event==='disembarked'){assert.equal(p.window,'turn');return 'disembarked this turn';}
  if(p.event==='set-up'){assert.equal(p.filter?.from,'strategic-reserves');assert.equal(p.window,'phase');return 'set up from Strategic Reserves this phase';}
 }
 throw Error('Unreviewed target eligibility: '+JSON.stringify(x));
}
function target(row,core){
 const d=row.data,raw=d.importSource.record;
 if(d.category==='stratagem'&&core?.target_restrictions){const all=[].concat(core.target_restrictions);
  const rendered=all.map(t=>{
   assert.ok(Object.keys(t).every(k=>['required_keywords','required_keywords_any','excluded_keywords','count','count_max','name','mode','side','selects','bound_to','eligibility'].includes(k)));
   const count=t.count==='up-to'?'Up to '+t.count_max:'One';assert.ok(t.count==='one'||t.count==='up-to');
   return [(t.mode?'Mode '+t.mode.toUpperCase()+': ':t.name?t.name+' target: ':'')+count+' friendly '+[...(t.required_keywords||[]),...(t.required_keywords_any?.length?['('+t.required_keywords_any.join(' or ')+')']:[])].join(' + ')+' '+(t.selects||'unit')+(t.count==='up-to'&&t.count_max>1?'s':''),t.excluded_keywords?.length?'excluding '+t.excluded_keywords.join(' or '):'',t.bound_to==='attacked-unit'?'the attacked unit':t.bound_to==='triggering-unit'?'the triggering unit':'',eligibility(t.eligibility)].filter(Boolean).join('; ');
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
 const native=records.filter(r=>r.faction===faction||r.kind==='faction'&&r.name===faction);
 assert.equal(native.length,baseline.length,'Drukhari catalog changed; rebuild audit.');
 for(const expected of baseline){const row=native.find(r=>r.key===expected.key);assert.ok(row,'Missing entry: '+expected.key);assert.equal(stable(row),stable(expected),'Entry changed; rebuild audit: '+expected.key);}
 const rules=baseline.filter(r=>r.kind==='rule'),units=baseline.filter(r=>r.kind==='unit'),dets=baseline.filter(r=>r.kind==='detachment');
 assert.equal(rules.length,164);assert.equal(units.length,23);assert.equal(dets.length,10);assert.equal(notes.length,rules.length);assert.equal(new Set(notes.map(n=>n.id)).size,164);
 const imported=new Set(rules.map(r=>r.data.importSource.sourceId));assert.deepEqual([...imported].sort(),sources['enrichment-abilities.json'].map(r=>r.ability_id).sort());
 const files=Object.entries(sources).map(([name,data])=>({name:'data/'+name.replace('core-','core/drukhari/').replace('enrichment-','enrichment/drukhari/'),text:JSON.stringify(data)}));
 const planned=I.plan(I.parse(files,{faction,group:'Xenos'},records),records).rows.filter(e=>!e.before&&e.proposed.kind==='unit');
 assert.equal(planned.length,4);assert.ok(planned.every(e=>!e.error));
 const additions=planned.map(e=>{const r=structuredClone(e.proposed);r.revision=0;r.data.importSource.commit=pin;r.data.sourceUrl='https://github.com/wn-mitch/40kdc-data/tree/'+pin+'/data/core/drukhari';C.validate(r);return r;});
 assert.deepEqual(additions.map(r=>r.data.id).sort(),['coven-of-agonies-cronos','coven-of-agonies-talos','coven-of-agonies-wracks','xatrophos-nuul']);
 const completeUnits=units.concat(additions);
 for(const [kind,items] of [['units',completeUnits],['detachments',dets]])assert.deepEqual(items.map(r=>r.data.id).sort(),table(kind).map(r=>r.id).sort());
 for(const u of completeUnits){assert.ok(P.read(u.data).length,'Missing unit stats: '+u.name);P.validate(P.read(u.data));for(const ref of u.data.abilities||[])assert.ok(imported.has(ref.id)||['leader','deep-strike','infiltrators','deadly-demise','damaged','firing-deck','feel-no-pain','stealth','scouts','fights-first'].includes(ref.id),'Missing unit ability: '+u.name+' / '+ref.id);for(const id of u.data.bodyguardIds||[])assert.ok(completeUnits.some(b=>b.data.id===id),'Missing bodyguard: '+id);}
 for(const d of dets)for(const id of [...d.data.rules,...d.data.stratagems,...d.data.enhancements])assert.ok(imported.has(id),'Missing detachment rule: '+id);
 const index=new Map(notes.map(n=>[n.id,n])),changes=[];
 for(const original of rules){const row=structuredClone(original),d=row.data,raw=d.importSource.record,note=index.get(d.id);
  assert.ok(note);assert.equal(raw.faction_id,'drukhari');assert.equal(raw.ability_id,note.id);assert.ok(M.isPlaceholder(original.data.summary),'Refusing to replace saved wording: '+original.key);
  const factionCore=table('factions')[0],armyRule=factionCore.faction_rule_ids.includes(d.id),previousUnitScope=armyRule?structuredClone(d.units):null;
  if(armyRule)d.units=[];
  const core=[...table('stratagems'),...table('enhancements')].find(r=>r.ability_id===raw.ability_id||r.id===raw.ability_id)||(armyRule?factionCore:null);
  Object.assign(d,{summary:note.summary,targetText:target(row,core),phase:structuredClone(note.phase),turn:note.turn,window:note.window,sourceRuleId:d.sourceRuleId||d.id,timingOverride:true,mechanicsPresentation:note.state,mechanicsDetails:M.describe(raw).details});
  // Core phase/turn gates are authoritative for Stratagem reminders. Conflicts
  // within the imported effect remain explicit in the text and review state.
  if(d.category==='stratagem'&&core){d.phase=core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p));assert.ok(d.phase.every(p=>p>=0));d.turn=core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either';}
  d.conditions=[...new Set([...(d.conditions||[]),'Source-derived study summary; check the current official wording before use.',...(core?.cp_cost!==undefined?['Stratagem cost: '+core.cp_cost+'CP. '+(core.timing==='once-per-phase'?'Once per phase.':'')]:[]),...(note.state!=='structured'?['Needs source review: '+note.summary]:[]),...(raw.game_version?.dataslate?.includes('provisional')?['Source marked pre-launch provisional.']:[])])];
  if(d.category==='enhancement'&&core){d.bearerKeywords=structuredClone(core.keyword_restrictions||[]);d.bearerRestrictions=structuredClone(core.datasheet_restriction_groups||[]);d.enhancementUpgrade=core.upgrade_tag===true;}
  d.summaryAudit={id:'drukhari-2026-11-14',sourceHash:digest(raw),summaryHash:digest(note.summary),coreSource:core||null,coreCommit:core?pin:null,...(armyRule?{previousUnitScope}: {})};
  C.validate(row);changes.push(row);
 }
 return {changes:changes.concat(additions),counts:Object.fromEntries(['structured','needs-summary','missing'].map(s=>[s,notes.filter(n=>n.state===s).length]))};
}
module.exports={audit,notes,digest,target,eligibility};
if(require.main===module){const [file,out]=process.argv.slice(2);if(!out)throw Error('Provide catalog snapshot and output prefix.');const records=JSON.parse(fs.readFileSync(file)),result=audit(records),changed=new Map(result.changes.map(r=>[r.key,r])),payload=result.changes.map(({revision,...r})=>({...r,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>changed.get(r.key)||r).concat(result.changes.filter(r=>!records.some(old=>old.key===r.key)))));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($drukhari_audit$${JSON.stringify(payload)}$drukhari_audit$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:164,changed:result.changes.length,units:27,detachments:10,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts}));}
