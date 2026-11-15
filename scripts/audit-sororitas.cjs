/* Adepta Sororitas source-bound study audit, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-sororitas.cjs BEFORE_JSON OUTPUT_PREFIX
 * Generates a revision-checked repair; never connects to or writes a database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js');
const baseline=require('../tests/fixtures/sororitas-audit-before.json'),sources=require('../tests/fixtures/sororitas-audit-sources.json'),notes=require('./sororitas-study-notes.json');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b',faction='Adepta Sororitas';
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const table=name=>sources['core-'+name+'.json'];
const reviewedDifferences={"extremis-trigger-word-sanctuary-guardians-arco-flagellants-adepta-sororitas":{"scope":{"imported":"98356552296454a365163232d34ae9032ce12dab42767c8afd257b37ee319d24","pinned":"ea1d1e5a725a984099e0659895d2306c5bac3d3ae13a78250334c0095b4fcf5c"}},"healing-tears-adepta-sororitas":{"effect":{"imported":"cb222e319e750cdb896969ffbe5b5366ae5223dd7663bdab5b0d124e578973f9","pinned":"5bb39d24b5ccc0374b2494583d716c7057e1dfa592de5210d36ba134acc90c5c"}},"rapturous-blows-adepta-sororitas":{"effect":{"imported":"cbac45da4b070ffc10bd7a5455b89610e12ab65014416713d3e0c685fd0918c0","pinned":"ab247387b4135866277997eac473365fd9fb8d7a636a8209b82e55aec2cab681"}}};
const bearerNoteGroups={
 'catechism-of-divine-penitence-penitent-host-adepta-sororitas':['Canoness','Palatine','Ministorum Priest'],
 'iron-surplice-of-saint-istalela-bringers-of-flame-adepta-sororitas':['Canoness','Palatine'],
 'litanies-of-faith-army-of-faith-adepta-sororitas':['Canoness','Palatine'],
 'mantle-of-ophelia-hallowed-martyrs-adepta-sororitas':['Canoness','Palatine']
};
function bearerEligibility(row,core){
 const raw=row.data.importSource.record,applies=raw.applies_to||{},groups=core?.datasheet_restriction_groups||[];
 assert.ok(Object.keys(applies).every(k=>['all_of','none_of'].includes(k)),'Unreviewed bearer filter: '+row.key);
 // An explicit core datasheet restriction wins over a generic keyword filter
 // missing from that named datasheet (notably the Sanctuary Battle Sisters).
 const keywords=[...new Set([...(core?.keyword_restrictions||[]),...(!groups.length?applies.all_of||[]:[])])];
 let restrictions=structuredClone(groups);
 if(bearerNoteGroups[row.data.id]){
  const alternatives=bearerNoteGroups[row.data.id];assert.ok(alternatives.every(name=>raw.community_notes?.includes(name)),'Changed named bearer note: '+row.key);
  assert.equal(restrictions.length,0);restrictions=alternatives.map(name=>({keywords:[name]}));
 }
 if(applies.none_of?.length){
  assert.equal(row.data.id,'hagiomnifex-upgrade-sanctified-orators-adepta-sororitas');assert.deepEqual(applies.none_of,['PENITENT']);assert.equal(restrictions.length,0);
  restrictions=table('units').filter(u=>keywords.every(k=>[...u.keywords,...(u.faction_keywords||[])].some(x=>x.toLowerCase()===k.toLowerCase()))&&!u.keywords.some(k=>applies.none_of.some(x=>x.toLowerCase()===k.toLowerCase()))).map(u=>({unit_id:u.id}));
  assert.ok(restrictions.length,'No eligible non-Penitent Character sources');
 }
 return {keywords,restrictions,upgrade:core?.upgrade_tag===true};
}
function subject(x){
 if(typeof x==='string'){assert.ok(['event-object'].includes(x));return 'the unit receiving mortal damage';}
 if(x?.objective){assert.deepEqual(x,{objective:{controlled_by:'friendly'}});return 'a friendly-controlled objective marker';}
 throw Error('Unreviewed target origin: '+JSON.stringify(x));
}
function filter(f={}){
 assert.ok(Object.keys(f).every(k=>['owner','designated','any_of','none_of','has_ability','within'].includes(k)),'Unreviewed target filter: '+JSON.stringify(f));
 const parts=[f.owner,f.designated?'designated '+f.designated:'',f.any_of?.length?'('+f.any_of.join(' or ')+')':'',f.none_of?.length?'excluding '+f.none_of.join(' or '):'',f.has_ability?.length?'with '+f.has_ability.join(' + '):''].filter(Boolean);
 if(f.within){const w=f.within;assert.ok(Object.keys(w).every(k=>['of','range'].includes(k)));parts.push(w.range==='objective-control'?'within control range of '+subject(w.of):'within '+w.range.inches+'″ of '+subject(w.of));}
 return parts.join('; ');
}
function eligibility(x){
 if(!x)return '';
 if(x.operator){assert.ok(['not','and','or'].includes(x.operator));return x.operator==='not'?'not ('+x.operands.map(eligibility).join('; ')+')':'('+x.operands.map(eligibility).join(x.operator==='and'?' AND ':' OR ')+')';}
 const p=x.parameters||{};
 if(x.type==='matches')return filter(p.filter);
 if(x.type==='in-region'){assert.deepEqual(p,{subject:'this-unit',region:{terrain_area:{footprint:'terrain area'}}});return 'within a terrain area';}
 if(x.type==='happened'){
  if(p.event==='selected'){assert.ok(['shoot','fight'].includes(p.filter?.to));assert.equal(p.window,'phase');return 'selected to '+p.filter.to+' this phase';}
  if(p.event==='disembarked'){assert.deepEqual(p,{event:'disembarked',window:'turn'});return 'disembarked this turn';}
  if(p.event==='model-destroyed'){assert.deepEqual(p,{event:'model-destroyed',object:'model-in-this-unit',filter:{by:'event-subject'},window:'event'});return 'a model in this unit destroyed by the triggering enemy in that event';}
 }
 throw Error('Unreviewed target eligibility: '+JSON.stringify(x));
}
function target(row,core){
 const d=row.data;
 if(d.category==='stratagem'&&core?.target_restrictions){const all=[].concat(core.target_restrictions);
  return all.map(t=>{
   assert.ok(Object.keys(t).every(k=>['required_keywords','count','name','mode','side','selects','bound_to','eligibility'].includes(k)),'Unreviewed core target: '+JSON.stringify(t));
   assert.ok(!t.side||t.side==='your-army');assert.equal(t.count,'one');assert.ok(!t.bound_to||['attacked-unit','triggering-unit'].includes(t.bound_to));assert.ok(!t.mode||['a','b'].includes(t.mode));
   return [(t.mode?'Mode '+t.mode.toUpperCase()+': ':'')+'One friendly '+(t.required_keywords||[]).join(' + ')+' '+t.selects,t.bound_to==='attacked-unit'?'the attacked unit':t.bound_to==='triggering-unit'?'the triggering unit':'',eligibility(t.eligibility)].filter(Boolean).join('; ');
  }).join(all.some(t=>t.mode)?' OR ':' AND ')+'. Apply the summary’s bearer, secondary-recipient, enemy-target, range and event restrictions.';
 }
 if(d.category==='enhancement'){
  const allowed=bearerEligibility(row,core),names=allowed.restrictions.map(g=>g.unit_id?table('units').find(u=>u.id===g.unit_id)?.name||g.unit_id:(g.keywords||[]).join(' + '));
  return 'Eligible '+allowed.keywords.join(' + ')+(allowed.upgrade?' upgrade unit':' bearer')+(names.length?'; restricted to '+names.join(' or '):'')+'. Apply only to the model or unit specified in the summary.';
 }
 if(d.units.length)return d.units.join(' / ')+'. Apply the summary’s bearer, recipient, enemy-target, equipment and range restrictions.';
 return 'Eligible Adepta Sororitas units specified in the summary; apply its detachment, keyword, range and event restrictions.';
}
function audit(records){
 const native=records.filter(r=>r.faction===faction||r.kind==='faction'&&r.name===faction);
 assert.equal(native.length,baseline.length,'Adepta Sororitas catalog changed; rebuild audit.');
 for(const expected of baseline){const row=native.find(r=>r.key===expected.key);assert.ok(row,'Missing entry: '+expected.key);assert.equal(stable(row),stable(expected),'Entry changed; rebuild audit: '+expected.key);}
 const rules=baseline.filter(r=>r.kind==='rule'),units=baseline.filter(r=>r.kind==='unit'),dets=baseline.filter(r=>r.kind==='detachment');
 assert.equal(rules.length,148);assert.equal(units.length,37);assert.equal(dets.length,9);assert.equal(notes.length,148);assert.equal(new Set(notes.map(n=>n.id)).size,148);
 const imported=new Set(rules.map(r=>r.data.importSource.sourceId));assert.deepEqual([...imported].sort(),sources['enrichment-abilities.json'].map(r=>r.ability_id).sort());
 for(const [kind,items] of [['units',units],['detachments',dets]])assert.deepEqual(items.map(r=>r.data.importSource.sourceId).sort(),table(kind).map(r=>r.id).sort());
 for(const u of units){const id=u.data.importSource.sourceId,source=table('units').find(s=>s.id===id);assert.equal(u.data.id,id==='ministorum-priest'?'ministorum-priest-adepta-sororitas':id);assert.equal(stable(u.data.importSource.record),stable(source));assert.ok(P.read(u.data).length,'Missing unit stats: '+u.name);P.validate(P.read(u.data));assert.deepEqual(P.read(u.data),P.read({profiles:source.profiles}),'Stats differ from pinned source: '+u.name);
  for(const ref of u.data.abilities||[])assert.ok(imported.has(ref.id)||['leader','feel-no-pain','deep-strike','deadly-demise','damaged','fights-first','lone-operative','support','scouts','infiltrators','firing-deck'].includes(ref.id),'Missing unit ability: '+u.name+' / '+ref.id);
  for(const id of u.data.bodyguardIds||[])assert.ok(units.some(b=>b.data.id===id),'Missing bodyguard: '+id);
  assert.deepEqual(u.data.bodyguardIds||[],table('leader-attachments').find(a=>a.leader_id===id)?.eligible_bodyguard_ids||[],'Attachment differs from pin: '+u.name);
 }
 for(const d of dets){const source=table('detachments').find(s=>s.id===d.data.id);assert.equal(stable(d.data.importSource.record),stable(source));for(const [key,ids] of [['rules',source.detachment_rule_ids||[source.detachment_rule_id]],['stratagems',source.stratagem_ids],['enhancements',source.enhancement_ids]]){assert.deepEqual(d.data[key],ids);for(const id of ids)assert.ok(imported.has(id),'Missing detachment rule: '+id);}}
 const factionRow=baseline.find(r=>r.kind==='faction');assert.equal(stable(factionRow.data.importSource.record),stable(table('factions')[0]));for(const id of table('factions')[0].faction_rule_ids)assert.ok(imported.has(id),'Missing faction rule: '+id);
 const index=new Map(notes.map(n=>[n.id,n])),changes=[];
 for(const original of rules){const row=structuredClone(original),d=row.data,raw=d.importSource.record,note=index.get(d.id),pinned=sources['enrichment-abilities.json'].find(r=>r.ability_id===d.importSource.sourceId);
  assert.ok(note);assert.equal(raw.faction_id,'adepta-sororitas');assert.equal(raw.ability_id,note.id);assert.ok(M.isPlaceholder(original.data.summary),'Refusing to replace saved wording: '+original.key);
  for(const key of ['effect','trigger','scope','usage','community_notes','applies_to']){
   if(reviewedDifferences[d.id]?.[key]){const pair=reviewedDifferences[d.id][key];assert.equal(digest(raw[key]),pair.imported,'Unreviewed imported '+key+': '+d.id);assert.equal(digest(pinned[key]),pair.pinned,'Pinned '+key+' changed: '+d.id);}
   else assert.equal(stable(raw[key]),stable(pinned[key]),'Mechanics differ from pin: '+d.id+' / '+key);
  }
  const core=[...table('stratagems'),...table('enhancements')].find(r=>r.ability_id===raw.ability_id||r.id===raw.ability_id);if(['stratagem','enhancement'].includes(d.category))assert.ok(core,'Missing core eligibility: '+d.id);
  Object.assign(d,{summary:note.summary,targetText:target(row,core),phase:structuredClone(note.phase),turn:note.turn,window:note.window,sourceRuleId:d.sourceRuleId||d.id,timingOverride:true,mechanicsPresentation:note.state,mechanicsDetails:M.describe(raw).details});
  if(d.category==='stratagem'){d.phase=core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p));assert.ok(d.phase.every(p=>p>=0));d.turn=core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either';}
  d.conditions=[...new Set([...(d.conditions||[]),'Source-derived study summary; check the current official wording before use.',...(core?.cp_cost!==undefined?['Stratagem cost: '+core.cp_cost+'CP. '+(core.timing==='once-per-phase'?'Once per phase.':'')]:[]),...(note.state!=='structured'?['Needs source review: '+note.summary]:[]),...(raw.game_version?.dataslate?.includes('provisional')?['Source marked pre-launch provisional.']:[])])];
  if(d.category==='enhancement'){const allowed=bearerEligibility(row,core);d.bearerKeywords=allowed.keywords;d.bearerRestrictions=allowed.restrictions;d.enhancementUpgrade=allowed.upgrade;}
  d.summaryAudit={id:'adepta-sororitas-2026-11-15',sourceHash:digest(raw),summaryHash:digest(note.summary),coreSource:core||null,coreCommit:core?pin:null};
  const gear=units.flatMap(u=>(u.data.abilities||[]).filter(a=>a.id===d.importSource.sourceId&&a.wargear).map(a=>u.name+': '+a.wargear));if(gear.length)d.conditions.push('Equipment gate: '+gear.join('; ')+'.');
  if(d.category==='enhancement')d.summaryAudit.bearerSource={appliesTo:raw.applies_to||null,namedNote:bearerNoteGroups[d.id]?raw.community_notes:null};
  C.validate(row);changes.push(row);
 }
 return {changes,counts:Object.fromEntries(['structured','needs-summary','missing'].map(s=>[s,notes.filter(n=>n.state===s).length]))};
}
module.exports={audit,notes,digest,target,eligibility,reviewedDifferences,bearerEligibility};
if(require.main===module){const [file,out]=process.argv.slice(2);if(!out)throw Error('Provide catalog snapshot and output prefix.');const records=JSON.parse(fs.readFileSync(file)),result=audit(records),changed=new Map(result.changes.map(r=>[r.key,r])),payload=result.changes.map(({revision,...r})=>({...r,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>changed.get(r.key)||r)));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($sororitas_audit$${JSON.stringify(payload)}$sororitas_audit$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:148,changed:result.changes.length,units:37,detachments:9,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts}));}
