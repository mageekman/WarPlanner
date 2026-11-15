/* Adeptus Custodes source-bound study audit, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-custodes.cjs BEFORE_JSON OUTPUT_PREFIX
 * Generates a revision-checked repair; never connects to or writes a database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js');
const baseline=require('../tests/fixtures/custodes-audit-before.json'),sources=require('../tests/fixtures/custodes-audit-sources.json'),notes=require('./custodes-study-notes.json');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b',faction='Adeptus Custodes';
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const table=name=>sources['core-'+name+'.json'];
const unitName=id=>table('units').find(u=>u.id===id)?.name||id;
function filter(f={}){
 const parts=[];
 for(const key of Object.keys(f))assert.ok(['all_of','any_of','none_of','not_states','state','within','unit_ids','level','designated','owner'].includes(key),'Unreviewed target filter: '+key);
 if(f.all_of?.length)parts.push(f.all_of.join(' + '));if(f.any_of?.length)parts.push('('+f.any_of.join(' or ')+')');
 if(f.none_of?.length)parts.push('excluding '+f.none_of.join(' or '));if(f.not_states?.length)parts.push('not '+f.not_states.join(' or '));
 if(f.state)parts.push(f.state);if(f.designated)parts.push('designated '+f.designated);if(f.unit_ids)parts.push(f.unit_ids.map(unitName).join(' or '));
 if(f.within){const w=f.within,of=typeof w.of==='string'?({'event-subject':'the triggering enemy','this-unit':'this unit','this-model':'the bearer'}[w.of]||w.of):w.of?.objective?'an objective marker':w.of?.owner==='enemy'?'an enemy unit':filter(w.of);parts.push(w.range==='objective-control'?'within control range of '+of:'within '+w.range.inches+'″ of '+of);}
 return parts.join('; ');
}
function eligibility(x){
 if(!x)return '';if(x.operator){assert.ok(['not','and','or'].includes(x.operator));return x.operator==='not'?'not ('+x.operands.map(eligibility).join('; ')+')':'('+x.operands.map(eligibility).join(x.operator==='and'?' AND ':' OR ')+')';}
 const p=x.parameters||{};
 if(x.type==='matches')return filter(p.filter);
 if(x.type==='eligible'){assert.equal(p.to,'fight');return 'eligible to fight';}
 if(x.type==='wounds'){assert.equal(p.lost,true);return 'has lost a wound';}
 if(x.type==='happened'){assert.equal(p.event,'after-roll');assert.equal(p.filter?.roll,'hit');return 'hit by the triggering attacks';}
 if(x.type==='unit-state'){assert.equal(p.state,'engaged');assert.equal(p.at,'phase-start');return 'engaged with the triggering enemy at phase start';}
 if(x.type==='model-count')return 'at least '+p.min+' models';
 throw Error('Unreviewed target eligibility: '+JSON.stringify(x));
}
function target(row,core){
 const d=row.data,raw=d.importSource.record;
 if(d.category==='stratagem'&&core?.target_restrictions){const t=core.target_restrictions;
  assert.ok(Object.keys(t).every(k=>['required_keywords','excluded_keywords','count','side','selects','bound_to','eligibility'].includes(k)));
  return ['One friendly '+(t.required_keywords||[]).join(' + ')+' '+(t.selects||'unit'),t.excluded_keywords?.length?'excluding '+t.excluded_keywords.join(' or '):'',t.bound_to==='attacked-unit'?'the attacked unit':t.bound_to==='triggering-unit'?'the triggering unit':'',eligibility(t.eligibility)].filter(Boolean).join('; ')+'. Apply the summary’s enemy-target, range and event restrictions.';
 }
 if(d.category==='enhancement')return 'Eligible '+(core?.keyword_restrictions||raw.keyword_restrictions||raw.applies_to?.all_of||[]).join(' + ')+' bearer or upgrade unit'+(core?.datasheet_restriction_groups?.length?': '+core.datasheet_restriction_groups.map(g=>g.unit_id?unitName(g.unit_id):(g.keywords||[]).join(' + ')).join(' or '):'')+'. Apply only to the model or unit specified in the summary.';
 if(d.units.length)return d.units.join(' / ')+'. Apply the summary’s bearer, enemy-target and range restrictions.';
 return 'Eligible '+faction+' units specified in the summary; apply its detachment, keyword, range and event restrictions.';
}
function audit(records){
 const native=records.filter(r=>r.faction===faction||r.kind==='faction'&&r.name===faction);
 assert.equal(native.length,baseline.length,'Custodes catalog changed; rebuild audit.');
 for(const expected of baseline){const row=native.find(r=>r.key===expected.key);assert.ok(row,'Missing entry: '+expected.key);assert.equal(stable(row),stable(expected),'Entry changed; rebuild audit: '+expected.key);}
 const rules=baseline.filter(r=>r.kind==='rule'),units=baseline.filter(r=>r.kind==='unit'),dets=baseline.filter(r=>r.kind==='detachment');
 assert.equal(rules.length,158);assert.equal(units.length,39);assert.equal(dets.length,16);assert.equal(notes.length,rules.length);assert.equal(new Set(notes.map(n=>n.id)).size,158);
 const imported=new Set(rules.map(r=>r.data.importSource.sourceId));assert.deepEqual([...imported].sort(),sources['enrichment-abilities.json'].map(r=>r.ability_id).sort());
 for(const [kind,items] of [['units',units],['detachments',dets]])assert.deepEqual(items.map(r=>r.data.id).sort(),table(kind).map(r=>r.id).sort());
 for(const u of units){assert.ok(P.read(u.data).length,'Missing unit stats: '+u.name);P.validate(P.read(u.data));for(const ref of u.data.abilities||[])assert.ok(imported.has(ref.id)||['deep-strike','firing-deck','deadly-demise','damaged','leader','scouts','support','hover','feel-no-pain'].includes(ref.id),'Missing unit ability: '+u.name+' / '+ref.id);for(const id of u.data.bodyguardIds||[])assert.ok(units.some(b=>b.data.id===id),'Missing bodyguard: '+id);}
 for(const d of dets)for(const id of [...d.data.rules,...d.data.stratagems,...d.data.enhancements])assert.ok(imported.has(id),'Missing detachment rule: '+id);
 const index=new Map(notes.map(n=>[n.id,n])),changes=[];
 for(const original of rules){const row=structuredClone(original),d=row.data,raw=d.importSource.record,note=index.get(d.id);
  assert.ok(note);assert.equal(raw.faction_id,'adeptus-custodes');assert.equal(raw.ability_id,note.id);
  const core=[...table('stratagems'),...table('enhancements')].find(r=>r.ability_id===raw.ability_id||r.id===raw.ability_id);
  Object.assign(d,{summary:note.summary,targetText:target(row,core),phase:structuredClone(note.phase),turn:note.turn,window:note.window,sourceRuleId:d.sourceRuleId||d.id,timingOverride:true,mechanicsPresentation:note.state,mechanicsDetails:M.describe(raw).details});
  // Core phase/turn gates are authoritative for Stratagem reminders. Conflicts
  // within the imported effect remain explicit in the text and review state.
  if(d.category==='stratagem'&&core){d.phase=core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p));assert.ok(d.phase.every(p=>p>=0));d.turn=core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either';}
  d.conditions=[...new Set([...(d.conditions||[]),'Source-derived study summary; check the current official wording before use.',...(core?.cp_cost!==undefined?['Stratagem cost: '+core.cp_cost+'CP. '+(core.timing==='once-per-phase'?'Once per phase.':'')]:[]),...(note.state!=='structured'?['Needs source review: '+note.summary]:[]),...(raw.game_version?.dataslate?.includes('provisional')?['Source marked pre-launch provisional.']:[])])];
  if(d.category==='enhancement'&&core){d.bearerKeywords=structuredClone(core.keyword_restrictions||[]);d.bearerRestrictions=structuredClone(core.datasheet_restriction_groups||[]);d.enhancementUpgrade=core.upgrade_tag===true;}
  d.summaryAudit={id:'custodes-2026-11-15',sourceHash:digest(raw),summaryHash:digest(note.summary),coreSource:core||null,coreCommit:core?pin:null};
  if(d.id==='sanctified-flames-adeptus-custodes'&&!d.guide)d.guide={order:'early',rank:15,phases:[2],turn:'you',label:'Early',note:'Consider shooting early if Battle-shock would enable later attacks against the same enemy.',flags:[]};
  C.validate(row);changes.push(row);
 }
 return {changes,counts:Object.fromEntries(['structured','needs-summary','missing'].map(s=>[s,notes.filter(n=>n.state===s).length]))};
}
module.exports={audit,notes,digest,target,eligibility};
if(require.main===module){const [file,out]=process.argv.slice(2);if(!out)throw Error('Provide catalog snapshot and output prefix.');const records=JSON.parse(fs.readFileSync(file)),result=audit(records),changed=new Map(result.changes.map(r=>[r.key,r])),payload=result.changes.map(({revision,...r})=>({...r,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>changed.get(r.key)||r)));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($custodes_audit$${JSON.stringify(payload)}$custodes_audit$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:158,units:39,detachments:16,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts}));}
