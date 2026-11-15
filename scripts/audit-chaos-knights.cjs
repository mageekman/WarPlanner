/* Chaos Knights source-bound study audit, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-chaos-knights.cjs BEFORE_JSON OUTPUT_PREFIX
 * Generates a revision-checked repair; never connects to or writes a database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js');
const baseline=require('../tests/fixtures/chaos-knights-audit-before.json'),sources=require('../tests/fixtures/chaos-knights-audit-sources.json'),notes=require('./chaos-knights-study-notes.json');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b',faction='Chaos Knights';
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const table=name=>sources['core-'+name+'.json'];
const reviewedEffectDifferences={"pterrorshades-traitoris-lance-chaos-knights":{"imported":"b9a0536cd0ce93b2880ee5cc340630ccbaf9cbabb39c3d7fcd1630e2e92abe76","pinned":"f5ab2aad537721dc265f98f776f71ba50dc78a7398766af1e741c066030a78ff"},"titanic-duel-lords-of-dread-chaos-knights":{"imported":"89a2f0f842b1df73ddeeb6dc5f38688ae37ac9bffe4536c49a044a102a19451d","pinned":"6e5ff743a04f7c34ebd52490a05825dba0175c89e230e6660cb30467aab75521"}};
function subject(x){
 if(typeof x==='string'){assert.ok(['battlefield-edge','event-subject'].includes(x));return x==='battlefield-edge'?'a battlefield edge':'the triggering enemy';}
 if(x?.stratagem_target){assert.deepEqual(x,{stratagem_target:'first'});return 'the first TITANIC target';}
 if(x?.objective){assert.deepEqual(x,{objective:{}});return 'an objective marker';}
 return filter(x);
}
function filter(f={}){
 assert.ok(Object.keys(f).every(k=>['owner','state','designated','all_of','within'].includes(k)),'Unreviewed target filter: '+JSON.stringify(f));
 const parts=[f.owner,...(f.all_of||[]),f.state,f.designated?'designated '+f.designated:''].filter(Boolean);
 if(f.within){const w=f.within;assert.ok(Object.keys(w).every(k=>['of','range','wholly'].includes(k)));parts.push(w.range==='objective-control'?'within control range of '+subject(w.of):(w.wholly?'wholly ':'')+'within '+w.range.inches+'″ of '+subject(w.of));}
 return parts.join('; ');
}
function eligibility(x){
 if(!x)return '';
 if(x.operator){assert.ok(['not','and','or'].includes(x.operator));return x.operator==='not'?'not ('+x.operands.map(eligibility).join('; ')+')':'('+x.operands.map(eligibility).join(x.operator==='and'?' AND ':' OR ')+')';}
 const p=x.parameters||{};
 if(x.type==='matches')return filter(p.filter);
 if(x.type==='wounds'){assert.deepEqual(p,{subject:'this-unit',lost:true});return 'has lost wounds (check the summary’s event binding)';}
 if(x.type==='same-unit'){assert.deepEqual(p,{as:{stratagem_target:'first'}});return 'same unit as the first TITANIC target';}
 if(x.type==='happened'){assert.deepEqual(p,{event:'selected',filter:{to:'shoot'},window:'phase'});return 'selected to shoot this phase';}
 throw Error('Unreviewed target eligibility: '+JSON.stringify(x));
}
function target(row,core){
 const d=row.data;
 if(d.category==='stratagem'&&core?.target_restrictions){const all=[].concat(core.target_restrictions);
  return all.map(t=>{
   assert.ok(Object.keys(t).every(k=>['required_keywords','excluded_keywords','count','count_max','name','side','selects','bound_to','eligibility'].includes(k)),'Unreviewed core target: '+JSON.stringify(t));
   assert.ok(!t.side||t.side==='your-army');assert.ok(t.count==='one'||t.count==='up-to');assert.ok(!t.bound_to||['attacked-unit','triggering-unit'].includes(t.bound_to));
   const owner=t.side==='your-army'||t.required_keywords?.length?' friendly ':'';
   return [(t.name?t.name+' target: ':'')+(t.count==='up-to'?'Up to '+t.count_max:'One')+owner+(t.required_keywords?.join(' + ')||'')+' '+t.selects+(t.count==='up-to'&&t.count_max>1?'s':''),t.excluded_keywords?.length?'excluding '+t.excluded_keywords.join(' or '):'',t.bound_to==='attacked-unit'?'the attacked unit':t.bound_to==='triggering-unit'?'the triggering unit':'',eligibility(t.eligibility)].filter(Boolean).join('; ');
  }).join(' AND ')+'. Apply the summary’s ownership, secondary-recipient, enemy-target, range and event restrictions.';
 }
 if(d.category==='enhancement'){
  const restrictions=(core?.datasheet_restriction_groups||[]).map(g=>{assert.ok(g.unit_id);return table('units').find(u=>u.id===g.unit_id)?.name||g.unit_id;});
  return 'Eligible '+(core?.keyword_restrictions||[]).join(' + ')+(core?.upgrade_tag?' upgrade unit':' bearer')+(restrictions.length?'; restricted to '+restrictions.join(' or '):'')+'. Apply only to the model or unit specified in the summary.';
 }
 if(d.units.length)return d.units.join(' / ')+'. Apply the summary’s bearer, recipient, enemy-target and range restrictions.';
 return 'Eligible Chaos Knights or allied units specified in the summary; apply its faction, detachment, keyword, range and event restrictions.';
}
function audit(records){
 const native=records.filter(r=>r.faction===faction||r.kind==='faction'&&r.name===faction);
 assert.equal(native.length,baseline.length,'Chaos Knights catalog changed; rebuild audit.');
 for(const expected of baseline){const row=native.find(r=>r.key===expected.key);assert.ok(row,'Missing entry: '+expected.key);assert.equal(stable(row),stable(expected),'Entry changed; rebuild audit: '+expected.key);}
 const rules=baseline.filter(r=>r.kind==='rule'),units=baseline.filter(r=>r.kind==='unit'),dets=baseline.filter(r=>r.kind==='detachment');
 assert.equal(rules.length,110);assert.equal(units.length,20);assert.equal(dets.length,8);assert.equal(notes.length,110);assert.equal(new Set(notes.map(n=>n.id)).size,110);
 const imported=new Set(rules.map(r=>r.data.importSource.sourceId));assert.deepEqual([...imported].sort(),sources['enrichment-abilities.json'].map(r=>r.ability_id).sort());
 for(const [kind,items] of [['units',units],['detachments',dets]])assert.deepEqual(items.map(r=>r.data.id).sort(),table(kind).map(r=>r.id).sort());
 for(const u of units){const source=table('units').find(s=>s.id===u.data.id);assert.equal(u.data.importSource.sourceId,u.data.id);assert.equal(stable(u.data.importSource.record),stable(source));assert.ok(P.read(u.data).length,'Missing unit stats: '+u.name);P.validate(P.read(u.data));assert.deepEqual(P.read(u.data),P.read({profiles:source.profiles}),'Stats differ from pinned source: '+u.name);
  for(const ref of u.data.abilities||[])assert.ok(imported.has(ref.id)||['damaged','damaged-objective-control','deadly-demise','scouts'].includes(ref.id),'Missing unit ability: '+u.name+' / '+ref.id);
  for(const id of u.data.bodyguardIds||[])assert.ok(units.some(b=>b.data.id===id),'Missing bodyguard: '+id);
 }
 for(const d of dets){const source=table('detachments').find(s=>s.id===d.data.id);assert.equal(stable(d.data.importSource.record),stable(source));for(const [key,ids] of [['rules',source.detachment_rule_ids||[source.detachment_rule_id]],['stratagems',source.stratagem_ids],['enhancements',source.enhancement_ids]]){assert.deepEqual(d.data[key],ids);for(const id of ids)assert.ok(imported.has(id),'Missing detachment rule: '+id);}}
 const factionRow=baseline.find(r=>r.kind==='faction');assert.equal(stable(factionRow.data.importSource.record),stable(table('factions')[0]));for(const id of table('factions')[0].faction_rule_ids)assert.ok(imported.has(id),'Missing faction rule: '+id);
 const index=new Map(notes.map(n=>[n.id,n])),changes=[];
 for(const original of rules){const row=structuredClone(original),d=row.data,raw=d.importSource.record,note=index.get(d.id),pinned=sources['enrichment-abilities.json'].find(r=>r.ability_id===d.importSource.sourceId);
  assert.ok(note);assert.equal(raw.faction_id,'chaos-knights');assert.equal(raw.ability_id,note.id);assert.ok(M.isPlaceholder(original.data.summary),'Refusing to replace saved wording: '+original.key);
  for(const key of ['effect','trigger','scope','usage','community_notes','applies_to']){
   if(key==='effect'&&reviewedEffectDifferences[d.id]){const pair=reviewedEffectDifferences[d.id];assert.equal(digest(raw.effect),pair.imported,'Unreviewed imported effect: '+d.id);assert.equal(digest(pinned.effect),pair.pinned,'Pinned effect changed: '+d.id);}
   else assert.equal(stable(raw[key]),stable(pinned[key]),'Mechanics differ from pin: '+d.id+' / '+key);
  }
  const core=[...table('stratagems'),...table('enhancements')].find(r=>r.ability_id===raw.ability_id||r.id===raw.ability_id);if(['stratagem','enhancement'].includes(d.category))assert.ok(core,'Missing core eligibility: '+d.id);
  Object.assign(d,{summary:note.summary,targetText:target(row,core),phase:structuredClone(note.phase),turn:note.turn,window:note.window,sourceRuleId:d.sourceRuleId||d.id,timingOverride:true,mechanicsPresentation:note.state,mechanicsDetails:M.describe(raw).details});
  if(d.category==='stratagem'){d.phase=core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p));assert.ok(d.phase.every(p=>p>=0));d.turn=core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either';}
  d.conditions=[...new Set([...(d.conditions||[]),'Source-derived study summary; check the current official wording before use.',...(core?.cp_cost!==undefined?['Stratagem cost: '+core.cp_cost+'CP. '+(core.timing==='once-per-phase'?'Once per phase.':'')]:[]),...(note.state!=='structured'?['Needs source review: '+note.summary]:[]),...(raw.game_version?.dataslate?.includes('provisional')?['Source marked pre-launch provisional.']:[])])];
  if(d.category==='enhancement'){d.bearerKeywords=structuredClone(core.keyword_restrictions||[]);d.bearerRestrictions=structuredClone(core.datasheet_restriction_groups||[]);d.enhancementUpgrade=core.upgrade_tag===true;}
  d.summaryAudit={id:'chaos-knights-2026-11-15',sourceHash:digest(raw),summaryHash:digest(note.summary),coreSource:core||null,coreCommit:core?pin:null};
  C.validate(row);changes.push(row);
 }
 return {changes,counts:Object.fromEntries(['structured','needs-summary','missing'].map(s=>[s,notes.filter(n=>n.state===s).length]))};
}
module.exports={audit,notes,digest,target,eligibility,reviewedEffectDifferences};
if(require.main===module){const [file,out]=process.argv.slice(2);if(!out)throw Error('Provide catalog snapshot and output prefix.');const records=JSON.parse(fs.readFileSync(file)),result=audit(records),changed=new Map(result.changes.map(r=>[r.key,r])),payload=result.changes.map(({revision,...r})=>({...r,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>changed.get(r.key)||r)));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($chaos_knights_audit$${JSON.stringify(payload)}$chaos_knights_audit$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:110,changed:result.changes.length,units:20,detachments:8,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts}));}
