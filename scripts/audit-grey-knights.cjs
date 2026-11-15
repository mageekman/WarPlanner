/* Grey Knights source-bound study audit, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-grey-knights.cjs BEFORE_JSON OUTPUT_PREFIX
 * Generates a revision-checked repair; never connects to or writes a database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js');
const baseline=require('../tests/fixtures/grey-knights-audit-before.json'),sources=require('../tests/fixtures/grey-knights-audit-sources.json'),notes=require('./grey-knights-study-notes.json');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b',faction='Grey Knights';
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex'),table=name=>sources['core-'+name+'.json'];
// Fixed imported/pinned variants reviewed in the study notes; never auto-accept source drift.
const reviewedDifferences={"armoured-aegis-sanctic-spearhead-grey-knights":{"effect":{"imported":"0af3b90171550470578cdd79a9c3559e8015361642415d1864c166250e2ec1dd","pinned":"de7acf93cc00cab832579a75f73a278ba67a9a813ee6d0148d6b0f9dda9b5aa9"}},"dauntless-champions-grey-knights":{"scope":{"imported":"98356552296454a365163232d34ae9032ce12dab42767c8afd257b37ee319d24","pinned":"ea1d1e5a725a984099e0659895d2306c5bac3d3ae13a78250334c0095b4fcf5c"}},"purifying-force-crowes-sanctifiers-grey-knights":{"scope":{"imported":"98356552296454a365163232d34ae9032ce12dab42767c8afd257b37ee319d24","pinned":"ea1d1e5a725a984099e0659895d2306c5bac3d3ae13a78250334c0095b4fcf5c"}},"radiant-champion-warpbane-task-force-grey-knights":{"effect":{"imported":"9e808eaf77e001a0afe6b927a85018b04948362019a16acb29d81fee1395dce8","pinned":"a6e51cc95cd53540a6516ea136b33bdb4fe6a68ffb2756dddaea22ea94872b69"}}};
function subject(value){assert.ok(['this-model','this-unit','event-subject'].includes(value),'Unreviewed range origin');return value==='this-model'?'the bearer':value==='this-unit'?'the selected unit':'the triggering enemy';}
function filter(f={}){
 assert.ok(Object.keys(f).every(k=>['owner','state','all_of','any_of','none_of','has_ability','within'].includes(k)),'Unreviewed filter '+JSON.stringify(f));
 const out=[f.owner,...(f.all_of||[]),f.any_of?.length?'('+f.any_of.join(' or ')+')':'',f.none_of?.length?'excluding '+f.none_of.join(' or '):'',f.state,f.has_ability?.length?'with '+f.has_ability.join(' + '):''].filter(Boolean);
 if(f.within){assert.deepEqual(Object.keys(f.within).sort(),['of','range']);assert.ok(Number.isFinite(f.within.range.inches));out.push('within '+f.within.range.inches+'″ of '+subject(f.within.of));}return out.join('; ');
}
function eligibility(x){
 if(!x)return '';
 if(x.operator){assert.ok(['and','or','not'].includes(x.operator));return x.operator==='not'?'not ('+x.operands.map(eligibility).join('; ')+')':'('+x.operands.map(eligibility).join(x.operator==='and'?' AND ':' OR ')+')';}
 const p=x.parameters||{};
 if(x.type==='matches')return filter(p.filter);
 if(x.type==='in-region'){assert.deepEqual(p,{subject:'this-unit',region:{rule_region:{region_id:'hallowed-ground',owner_faction:'grey-knights'}},wholly:true});return 'the whole unit is within Hallowed Ground';}
 if(x.type==='unit-state'){assert.deepEqual(p,{state:'engaged',with:'event-subject',at:'phase-start'});return 'was engaged with the triggering enemy at phase start';}
 if(x.type==='happened'){
  assert.ok(['phase','turn'].includes(p.window));
  if(p.event==='selected'){assert.ok(['shoot','fight','move'].includes(p.filter.to));return 'selected to '+p.filter.to+' this '+p.window;}
  if(p.event==='targets-selected'){assert.deepEqual(p.filter,{kind:'charge'});return 'selected charge targets this phase';}
  if(p.event==='set-up'){assert.ok(!p.filter);return 'set up this '+p.window;}
  if(p.event==='used'){assert.deepEqual(p.filter,{kind:'ability',id:'deep-strike'});return 'used Deep Strike this '+p.window;}
 }
 throw Error('Unreviewed eligibility '+JSON.stringify(x));
}
function target(row,core){
 const d=row.data;
 if(d.category==='stratagem'&&core?.target_restrictions)return [].concat(core.target_restrictions).map(t=>{
  assert.ok(Object.keys(t).every(k=>['required_keywords','excluded_keywords','count','selects','bound_to','side','eligibility'].includes(k)));assert.equal(t.count,'one');assert.ok(!t.side||t.side==='your-army');assert.ok(!t.bound_to||['attacked-unit','triggering-unit'].includes(t.bound_to));
  return ['One friendly '+(t.required_keywords||[]).join(' + ')+' '+t.selects,t.excluded_keywords?.length?'excluding '+t.excluded_keywords.join(' or '):'',t.bound_to==='attacked-unit'?'the attacked unit':t.bound_to==='triggering-unit'?'the triggering unit':'',eligibility(t.eligibility)].filter(Boolean).join('; ');
 }).join(' AND ')+'. Apply the summary’s timing, event, range and secondary-recipient restrictions.';
 if(d.category==='enhancement'){const groups=core?.datasheet_restriction_groups||[],names=groups.map(g=>{assert.ok(g.unit_id);return table('units').find(u=>u.id===g.unit_id)?.name||g.unit_id;});return 'Eligible '+(core.keyword_restrictions||[]).join(' + ')+(core.upgrade_tag?' upgrade unit':' bearer')+(names.length?'; restricted to '+names.join(' or '):'')+'. Apply the effect only to the model or unit named in the summary.';}
 return d.units.length?d.units.join(' / ')+'. Apply the summary’s leading, recipient, equipment, range and event restrictions.':'Eligible Grey Knights units specified in the summary; apply its detachment, keyword, range and event restrictions.';
}
function leading(raw){return raw.effect?.type==='conditional'&&JSON.stringify(raw.effect.condition).includes('"type":"attachment"')&&JSON.stringify(raw.effect.condition).includes('"role":"leading"');}
function modelCounts(composition){assert.ok(composition?.tiers?.length,'Missing composition tiers');const counts=new Set();for(const tier of composition.tiers){const min=tier.models.reduce((n,m)=>n+m.min,0),max=tier.models.reduce((n,m)=>n+m.max,0);assert.ok(Number.isInteger(min)&&Number.isInteger(max)&&min>0&&max>=min&&max<=500);for(let n=min;n<=max;n++)counts.add(n);}return [...counts].sort((a,b)=>a-b);}
function audit(records){
 const native=records.filter(r=>r.faction===faction||r.kind==='faction'&&r.name===faction);assert.equal(native.length,baseline.length,'Grey Knights catalog changed; rebuild audit.');
 for(const expected of baseline){const row=native.find(r=>r.key===expected.key);assert.ok(row,'Missing '+expected.key);assert.equal(stable(row),stable(expected),'Entry changed; rebuild audit: '+expected.key);}
 const rules=native.filter(r=>r.kind==='rule'),units=native.filter(r=>r.kind==='unit'),dets=native.filter(r=>r.kind==='detachment');assert.equal(rules.length,134);assert.equal(units.length,30);assert.equal(dets.length,10);assert.equal(notes.length,134);assert.equal(new Set(notes.map(n=>n.id)).size,134);
 const imported=new Set(rules.map(r=>r.data.importSource.sourceId));assert.deepEqual([...imported].sort(),sources['enrichment-abilities.json'].map(r=>r.ability_id).sort());
 for(const [kind,items] of [['units',units],['detachments',dets]])assert.deepEqual(items.map(r=>r.data.importSource.sourceId).sort(),table(kind).map(r=>r.id).sort());
 const unitIds=new Set(units.map(u=>u.data.id));for(const link of table('leader-attachments')){assert.ok(unitIds.has(link.leader_id));for(const id of link.eligible_bodyguard_ids)assert.ok(unitIds.has(id),'Missing attachment unit '+id);}
 for(const u of units){const raw=table('units').find(s=>s.id===u.data.importSource.sourceId);assert.equal(stable(u.data.importSource.record),stable(raw));assert.ok(P.read(u.data).length);P.validate(P.read(u.data));assert.deepEqual(P.read(u.data),P.read({profiles:raw.profiles}));assert.deepEqual(u.data.bodyguardIds||[],table('leader-attachments').find(a=>a.leader_id===raw.id)?.eligible_bodyguard_ids||[]);
  for(const ref of u.data.abilities||[])assert.ok(imported.has(ref.id)||['leader','deep-strike','deadly-demise','damaged','hover','firing-deck','scouts'].includes(ref.id),'Missing unit ability '+u.name+' / '+ref.id);
 }
 for(const d of dets){const raw=table('detachments').find(s=>s.id===d.data.importSource.sourceId);assert.equal(stable(d.data.importSource.record),stable(raw));for(const [key,ids] of [['rules',raw.detachment_rule_ids||[raw.detachment_rule_id].filter(Boolean)],['stratagems',raw.stratagem_ids||[]],['enhancements',raw.enhancement_ids||[]]]){assert.deepEqual(d.data[key],ids);for(const id of ids)assert.ok(imported.has(id),'Missing detachment link '+id);}}
 const factionRow=native.find(r=>r.kind==='faction');assert.equal(stable(factionRow.data.importSource.record),stable(table('factions')[0]));for(const id of table('factions')[0].faction_rule_ids)assert.ok(imported.has(id));
 const index=new Map(notes.map(n=>[n.id,n])),changes=[];
 for(const original of rules){const row=structuredClone(original),d=row.data,raw=d.importSource.record,note=index.get(d.id),pinned=sources['enrichment-abilities.json'].find(r=>r.ability_id===d.importSource.sourceId);assert.ok(note);assert.equal(raw.faction_id,'grey-knights');assert.equal(raw.ability_id,note.id);
  for(const key of ['effect','trigger','scope','usage','community_notes','applies_to','interactions']){if(reviewedDifferences[d.id]?.[key]){const pair=reviewedDifferences[d.id][key];assert.equal(digest(raw[key]),pair.imported);assert.equal(digest(pinned[key]),pair.pinned);}else assert.equal(stable(raw[key]),stable(pinned[key]),'Mechanics differ from pin: '+d.id+' / '+key);}
  const core=[...table('stratagems'),...table('enhancements')].find(r=>(r.ability_id||r.id)===raw.ability_id);if(['stratagem','enhancement'].includes(d.category))assert.ok(core,'Missing core eligibility '+d.id);
  Object.assign(d,{summary:note.summary,targetText:target(row,core),phase:structuredClone(note.phase),turn:note.turn,window:note.window,sourceRuleId:d.sourceRuleId||d.id,timingOverride:true,mechanicsPresentation:note.state,mechanicsDetails:M.describe(raw).details});
  if(note.timings){d.timings=structuredClone(note.timings);d.phase=[...new Set(d.timings.flatMap(t=>t.phase))].sort();d.turn=d.timings.every(t=>t.turn===d.timings[0].turn)?d.timings[0].turn:'either';d.window=d.timings[0].window;}else delete d.timings;
  if(d.category==='stratagem'&&note.state!=='missing'){assert.deepEqual([...d.phase].sort(),core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)).sort(),'Stratagem phases '+d.id);assert.equal(d.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either','Stratagem turn '+d.id);}
  d.conditions=[...new Set([...(d.conditions||[]),'Source-derived study summary; check the current official wording before use.',...(core?.cp_cost!==undefined?['Stratagem cost: '+core.cp_cost+'CP. '+(core.timing==='once-per-phase'?'Once per phase.':'')]:[]),...(note.state!=='structured'?['Needs source review: '+note.summary]:[]),...(raw.game_version?.dataslate?.includes('provisional')?['Source marked pre-launch provisional.']:[])])];
  if(d.category==='enhancement'){d.bearerKeywords=structuredClone(core.keyword_restrictions||[]);d.bearerRestrictions=structuredClone(core.datasheet_restriction_groups||[]);d.enhancementUpgrade=core.upgrade_tag===true;}
  if(leading(raw))d.leadingUnitRequired=true;
  if(['fire-focus-grey-knights','guidance-of-the-ancients-grey-knights','guidance-of-the-ancients-crowes-sanctifiers-venerable-dreadnought-grey-knights','righteous-persecution-grey-knights'].includes(d.id)&&!d.guide)d.guide={order:'early',rank:15,phases:[2],turn:'you',label:'Early',note:'Consider resolving this unit before other attacks or charges that benefit from its target effect.',flags:[]};
  d.summaryAudit={id:'grey-knights-2026-11-15',sourceHash:digest(raw),summaryHash:digest(note.summary),coreSource:core||null,coreCommit:core?pin:null,pinnedDifferences:reviewedDifferences[d.id]||null};
  const gear=units.flatMap(u=>(u.data.abilities||[]).filter(a=>a.id===d.importSource.sourceId&&a.wargear).map(a=>u.name+': '+a.wargear));if(gear.length)d.conditions.push('Equipment gate: '+gear.join('; ')+'.');
  C.validate(row);changes.push(row);
 }
 for(const unit of units){const counts=modelCounts(table('unit-compositions').find(c=>c.unit_id===unit.data.importSource.sourceId));assert.ok(unit.data.modelCounts.every(n=>counts.includes(n)),'Unreviewed invalid unit size '+unit.key);if(stable(counts)!==stable(unit.data.modelCounts)){const row=structuredClone(unit);row.data.modelCounts=counts;C.validate(row);changes.push(row);}}
 return {changes,counts:Object.fromEntries(['structured','needs-summary','missing'].map(s=>[s,notes.filter(n=>n.state===s).length]))};
}
module.exports={audit,notes,digest,target,eligibility,reviewedDifferences,modelCounts};
if(require.main===module){const [file,out]=process.argv.slice(2);if(!out)throw Error('Provide catalog snapshot and output prefix.');const records=JSON.parse(fs.readFileSync(file)),result=audit(records),changed=new Map(result.changes.map(r=>[r.key,r])),payload=result.changes.map(({revision,...r})=>({...r,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>changed.get(r.key)||r)));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($grey_audit$${JSON.stringify(payload)}$grey_audit$::jsonb);\ncommit;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:134,changed:result.changes.length,units:30,detachments:10,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts}));}
