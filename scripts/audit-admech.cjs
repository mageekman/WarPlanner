/* Adeptus Mechanicus source-bound audit. CC BY 4.0 sources: see CREDITS.md.
 * node scripts/audit-admech.cjs BEFORE_JSON OUTPUT_PREFIX
 * Produces a revision-checked import; never connects to a database. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js');
const baseline=require('../tests/fixtures/admech-audit-before.json'),sources=require('../tests/fixtures/admech-audit-sources.json'),notes=require('./admech-study-notes.json'),reviewedDifferences=require('./admech-reviewed-variants.json');
const faction='Adeptus Mechanicus',pin='6ea813f7706bc9a492026d8b4403af99a965162b',official=sources['official-supplement'];
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)??'undefined').digest('hex'),table=n=>sources['core-'+n+'.json'];
function origin(x){
 if(typeof x==='string'){assert.ok(['this-model','this-unit','event-subject'].includes(x));return {'this-model':'the bearer','this-unit':'the selected unit','event-subject':'the triggering enemy'}[x];}
 if(x?.stratagem_target){assert.ok(['first','second','third'].includes(x.stratagem_target));return 'the '+x.stratagem_target+' target';}
 if(x?.objective){assert.ok(Object.keys(x.objective).every(k=>k==='controlled_by'));return x.objective.controlled_by==='friendly'?'an objective you control':'an objective';}
 assert.deepEqual(x,{owner:'enemy'});return 'an enemy unit';
}
function filter(f){
 assert.ok(Object.keys(f).every(k=>['owner','all_of','any_of','state','not_states','within'].includes(k)),'Unreviewed filter '+JSON.stringify(f));
 const result=[f.owner,...(f.all_of||[]),f.any_of?.length?'('+f.any_of.join(' or ')+')':'',f.state,f.not_states?.length?'not '+f.not_states.join(' or '):''].filter(Boolean);
 if(f.within){assert.deepEqual(Object.keys(f.within).sort(),['of','range']);const range=f.within.range;assert.ok(range==='objective-control'||Number.isFinite(range.inches));result.push(range==='objective-control'?'within control range of '+origin(f.within.of):'within '+range.inches+'″ of '+origin(f.within.of));}
 return result.join('; ');
}
function eligibility(x){
 if(!x)return '';
 if(x.operator){assert.ok(['and','or','not'].includes(x.operator));return x.operator==='not'?'not ('+x.operands.map(eligibility).join('; ')+')':'('+x.operands.map(eligibility).join(x.operator==='and'?' AND ':' OR ')+')';}
 const p=x.parameters||{};
 if(x.type==='matches')return (p.subject?origin(p.subject)+' is ':'')+filter(p.filter);
 if(x.type==='same-unit')return 'the same unit as '+origin(p.as);
 if(x.type==='strength'){assert.deepEqual(p,{below:'starting'});return 'below Starting Strength';}
 if(x.type==='happened'){
  if(p.event==='selected'){assert.ok(['shoot','fight','move'].includes(p.filter?.to));assert.equal(p.window,'phase');return 'selected to '+p.filter.to+' this phase';}
  if(p.event==='model-destroyed'){assert.deepEqual(p,{event:'model-destroyed',object:'model-in-this-unit',filter:{by:'event-subject'},window:'event'});return 'lost a model to the triggering enemy’s attacks';}
  if(p.event==='disembarked'){assert.equal(p.window,'turn');return 'disembarked this turn';}
 }
 throw Error('Unreviewed target eligibility '+JSON.stringify(x));
}
function target(row,core,note){
 if(note.targetText)return note.targetText;
 const d=row.data;
 if(d.category==='stratagem'&&core?.target_restrictions)return [].concat(core.target_restrictions).map(t=>{
  assert.ok(Object.keys(t).every(k=>['required_keywords','excluded_keywords','count','count_max','name','side','selects','bound_to','eligibility','mode'].includes(k)),'Unreviewed target fields');
  assert.ok(!t.side||['your-army','enemy'].includes(t.side));assert.ok(['one','up-to'].includes(t.count));
  return [(t.mode?'Mode '+t.mode.toUpperCase()+': ':t.name?t.name+' target: ':'')+(t.count==='up-to'?'Up to '+t.count_max:'One')+(t.side==='enemy'?' enemy ':' friendly ')+(t.required_keywords||[]).join(' + ')+' '+(t.selects||'unit'),t.excluded_keywords?.length?'excluding '+t.excluded_keywords.join(' or '):'',t.bound_to==='attacked-unit'?'the attacked unit':t.bound_to==='triggering-unit'?'the triggering unit':'',eligibility(t.eligibility)].filter(Boolean).join('; ');
 }).join([].concat(core.target_restrictions).some(t=>t.mode)?' OR ':' AND ')+'. Apply the summary’s range, event, recipient and optional-target restrictions.';
 if(d.category==='enhancement')return 'Eligible '+(core.keyword_restrictions||[]).join(' + ')+(core.upgrade_tag?' upgrade unit':' bearer')+(core.datasheet_restriction_groups?.length?'; restricted to '+core.datasheet_restriction_groups.map(g=>table('units').find(u=>u.id===g.unit_id)?.name||(g.keywords||[]).join(' + ')).join(' or '):'')+(note.excludeDatasmith?'; excluding CYBERNETICA DATASMITH':'')+'. Apply only to the model or unit named in the summary.';
 return d.units.length?d.units.join(' / ')+'. Apply the summary’s attachment, equipment, model, range and recipient restrictions.':'Eligible Adeptus Mechanicus units specified in the summary; apply its detachment, keyword, range and event restrictions.';
}
function modelCounts(composition){const counts=new Set();assert.ok(composition?.tiers?.length);for(const tier of composition.tiers){const min=tier.models.reduce((n,m)=>n+m.min,0),max=tier.models.reduce((n,m)=>n+m.max,0);assert.ok(Number.isInteger(min)&&Number.isInteger(max)&&min>0&&max>=min&&max<=500);for(let n=min;n<=max;n++)counts.add(n);}return [...counts].sort((a,b)=>a-b);}
function leading(x){
 if(!x||typeof x!=='object')return false;
 if(x.operator==='not')return false;
 if(x.type==='attachment')return x.parameters?.role==='leading'&&(!x.parameters?.subject||x.parameters.subject==='this-model');
 return Object.values(x).some(v=>v&&typeof v==='object'&&(Array.isArray(v)?v.some(leading):leading(v)));
}
function audit(records){
 const native=records.filter(r=>r.faction===faction||r.kind==='faction'&&r.name===faction);assert.equal(native.length,baseline.length,'Adeptus Mechanicus catalog changed; rebuild audit.');
 for(const expected of baseline){const actual=native.find(r=>r.key===expected.key);assert.ok(actual,'Missing '+expected.key);assert.equal(stable(actual),stable(expected),'Entry changed; rebuild audit: '+expected.key);}
 const rules=native.filter(r=>r.kind==='rule'),units=native.filter(r=>r.kind==='unit'),dets=native.filter(r=>r.kind==='detachment');assert.equal(rules.length,167);assert.equal(units.length,38);assert.equal(dets.length,11);assert.equal(notes.length,167);assert.equal(new Set(notes.map(n=>n.id)).size,167);
 assert.deepEqual(rules.map(r=>r.data.importSource.sourceId).sort(),sources['enrichment-abilities.json'].map(r=>r.ability_id).sort());
 for(const [name,rows] of [['units',units],['detachments',dets]])assert.deepEqual(rows.map(r=>r.data.importSource.sourceId).sort(),table(name).map(r=>r.id).sort());
 const ids=new Set(rules.map(r=>r.data.id)),unitIds=new Set(units.map(r=>r.data.id)),weaponIds=new Set(table('weapons').map(w=>w.id));
 for(const u of units){const raw=table('units').find(p=>p.id===u.data.importSource.sourceId);assert.equal(stable(raw),stable(u.data.importSource.record));assert.ok(P.read(u.data).length);P.validate(P.read(u.data));assert.deepEqual(P.read(u.data),P.read({profiles:raw.profiles}));for(const weapon of raw.weapon_ids||[])assert.ok(weaponIds.has(weapon),'Missing weapon '+weapon);for(const a of u.data.abilities)assert.ok(ids.has(a.id)||['leader','support','deep-strike','deadly-demise','infiltrators','scouts','stealth','firing-deck','damaged','hover','feel-no-pain','lone-operative'].includes(a.id),'Missing ability '+u.name+' / '+a.id);assert.deepEqual(u.data.bodyguardIds||[],table('leader-attachments').find(a=>a.leader_id===raw.id)?.eligible_bodyguard_ids||[]);}
 for(const link of table('leader-attachments')){assert.ok(unitIds.has(link.leader_id));for(const id of link.eligible_bodyguard_ids)assert.ok(unitIds.has(id));}
 for(const d of dets){const raw=table('detachments').find(s=>s.id===d.data.id);if(d.data.id==='data-psalm-conclave'){assert.deepEqual(raw.game_version,{edition:'11th',dataslate:'pre-launch-provisional'});assert.deepEqual(d.data.importSource.record.game_version,{edition:'11th',dataslate:'2026-10-14'});assert.equal(stable(raw),stable({...d.data.importSource.record,game_version:raw.game_version}));}else assert.equal(stable(raw),stable(d.data.importSource.record));for(const [key,refs] of [['rules',raw.detachment_rule_ids||[raw.detachment_rule_id].filter(Boolean)],['stratagems',raw.stratagem_ids||[]],['enhancements',raw.enhancement_ids||[]]]){assert.deepEqual(d.data[key],refs);for(const id of refs)assert.ok(ids.has(id),'Missing detachment link '+id);}}
 const factionRow=native.find(r=>r.kind==='faction');assert.equal(stable(factionRow.data.importSource.record),stable(table('factions')[0]));for(const id of table('factions')[0].faction_rule_ids)assert.ok(ids.has(id));
 const changes=[];
 for(const original of rules){
  const row=structuredClone(original),d=row.data,raw=d.importSource.record,note=notes.find(n=>n.id===d.id),pinned=sources['enrichment-abilities.json'].find(r=>r.ability_id===d.id),core=[...table('stratagems'),...table('enhancements')].find(r=>(r.ability_id||r.id)===d.id)||null;
  assert.ok(note&&pinned);assert.ok(M.isPlaceholder(d.summary),'Refusing saved wording '+row.key);assert.equal(note.sourceHash,digest(raw));assert.equal(note.pinnedHash,digest(pinned));assert.equal(note.coreHash,digest(core));
  for(const k of ['effect','scope','trigger','usage','condition','optional','community_notes','applies_to','interactions','supersedes','unit_ids']){const reviewed=reviewedDifferences[d.id]?.[k];if(reviewed){assert.equal(digest(raw[k]),reviewed.imported);assert.equal(digest(pinned[k]),reviewed.pinned);}else assert.equal(stable(raw[k]),stable(pinned[k]),'Source drift '+d.id+' / '+k);}
  if(d.category==='enhancement'){assert.ok(core);assert.deepEqual(raw.keyword_restrictions||[],core.keyword_restrictions||[]);assert.equal(raw.upgrade_tag===true,core.upgrade_tag===true);}
  Object.assign(d,{summary:note.summary,targetText:target(row,core,note),phase:structuredClone(note.phase),turn:note.turn,window:note.window,timingOverride:true,mechanicsPresentation:note.state,sourceRuleId:d.sourceRuleId||d.id,mechanicsDetails:(note.officialPage?'Historical import; the checked official supplement supports the corrected study summary above.\n':'')+M.describe(raw).details});
  if(note.timings)d.timings=structuredClone(note.timings);else delete d.timings;
  if(d.category==='stratagem'&&note.state!=='missing'){assert.deepEqual([...d.phase].sort(),core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)).sort());assert.equal(d.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');}
  d.conditions=[...new Set([...(d.conditions||[]),'Source-bound study audit; use the named current rule and all of its restrictions.',...(core?.cp_cost!==undefined?['Stratagem cost: '+core.cp_cost+'CP. '+(core.timing==='once-per-phase'?'Once per phase.':'Source usage: '+core.timing+'.')]:[]),...(note.state!=='structured'?['Needs source review: '+note.summary]:[]),...(!note.officialPage&&raw.game_version.dataslate.includes('provisional')?['Imported mechanics marked pre-launch provisional.']:[]),...(note.officialPage?['Checked official Adeptus Mechanicus faction pack v'+official.version+', page '+note.officialPage+'. This summary supersedes the historical imported effect where they conflict.']:[])])];
  if(d.category==='enhancement'){d.bearerKeywords=structuredClone(core.keyword_restrictions||[]);d.bearerRestrictions=structuredClone(core.datasheet_restriction_groups||[]);d.enhancementUpgrade=core.upgrade_tag===true;if(note.excludeDatasmith)d.bearerRestrictions=units.filter(u=>u.data.id!=='cybernetica-datasmith'&&u.data.keywords.some(k=>k.toLowerCase()==='character')).map(u=>({unit_id:u.data.id}));}
  if(d.units.length&&leading(raw.effect)){d.leadingUnitRequired=true;if(d.id==='battle-protocols-adeptus-mechanicus')d.leadingBodyguard='Kastelan Robots';}
  const gear=units.flatMap(u=>u.data.abilities.filter(a=>a.id===d.id&&a.wargear).map(a=>u.name+': '+a.wargear));if(gear.length)d.conditions.push('Equipment gate: '+gear.join('; ')+'.');
  if(['fire-support-adeptus-mechanicus','electro-shock-adeptus-mechanicus','pinning-fire-adeptus-mechanicus','dread-snipers-adeptus-mechanicus'].includes(d.id)&&!d.guide)d.guide={order:'early',rank:15,phases:[2],turn:'you',label:'Early',note:'Consider this unit before attacks or charges that can benefit from its target effect; resolve the effect only after its actual shooting trigger.',flags:[]};
  d.summaryAudit={id:'adeptus-mechanicus-2026-11-16',sourceHash:digest(raw),summaryHash:digest(note.summary),coreSource:core,coreCommit:core?pin:null,pinnedDifferences:reviewedDifferences[d.id]||null,officialSource:note.officialPage?{...official,page:note.officialPage}:null};
  if(note.officialPage){d.sourceLabel='Official Adeptus Mechanicus faction pack v'+official.version+' — checked study summary';d.sourceUrl=official.url+'#page='+note.officialPage;}
  C.validate(row);changes.push(row);
 }
 for(const original of units){const row=structuredClone(original),d=row.data,counts=modelCounts(table('unit-compositions').find(c=>c.unit_id===d.id)),corrections=[];
  assert.ok(d.modelCounts.every(n=>counts.includes(n)),'Unexpected existing model count '+row.key);
  if(stable(d.modelCounts)!==stable(counts)){d.modelCounts=counts;corrections.push('Expanded model-count choices from the pinned composition tiers; points and army legality are not certified.');}
  if(['archaeopter-fusilave','archaeopter-stratoraptor','archaeopter-transvector'].includes(d.id)){
   d.profiles=P.read(d);for(const profile of d.profiles){profile.M=d.id==='archaeopter-transvector'?14:'-';if(d.id!=='archaeopter-transvector')profile.OC='-';}
   if(d.id!=='archaeopter-transvector')d.abilities=d.abilities.filter(a=>a.id!=='hover');else d.keywords=d.keywords.filter(k=>k.toLowerCase()!=='aircraft');
   d.sourceUrl=official.url+'#page=17';d.sourceLabel='Official Adeptus Mechanicus faction pack v1.4 — profile update';corrections.push('Applied the explicit official v1.4 Archaeopter Movement/OC and Aircraft/Hover update; original import retained.');
  }
  if(corrections.length){d.unitAudit={id:'adeptus-mechanicus-2026-11-16',sourceHash:digest(original.data.importSource.record),coreCommit:pin,corrections,officialSource:d.profiles?{...official,page:17}:null};C.validate(row);changes.push(row);}
 }
 return {changes,counts:Object.fromEntries(['structured','needs-summary','missing'].map(state=>[state,notes.filter(n=>n.state===state).length]))};
}
module.exports={audit,notes,digest,modelCounts,eligibility,target,reviewedDifferences};
if(require.main===module){const [file,out]=process.argv.slice(2);assert.ok(file&&out,'Provide snapshot and output prefix.');const records=JSON.parse(fs.readFileSync(file)),result=audit(records),map=new Map(result.changes.map(r=>[r.key,r])),payload=result.changes.map(({revision,...r})=>({...r,expectedRevision:revision}));fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>map.get(r.key)||r)));fs.writeFileSync(out+'-payload.json',JSON.stringify(payload));fs.writeFileSync(out+'-manifest.json',JSON.stringify({rules:167,units:38,profiles:39,detachments:11,changed:result.changes.length,changedUnits:result.changes.filter(r=>r.kind==='unit').length,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,counts:result.counts}));}
