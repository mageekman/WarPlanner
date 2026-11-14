/* Persist the prior Aeldari audit against the currently imported source records.
 * node scripts/refresh-aeldari.cjs BEFORE_CATALOG_JSON OUTPUT_PREFIX
 * Source-bound, revision-checked data operation; no network or automatic application.
 * Imported effects must still exactly match the pinned mechanics. Added core metadata
 * is retained and validated separately. Workshop edits are preserved as complete rows.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),A=require('../dist/activations.js');
const baseline=require('../tests/fixtures/aeldari-refresh-before.json'),prior=require('../tests/fixtures/aeldari-catalog-before-audit.json'),targets=require('./aeldari-refresh-targets.json'),pinnedRecords=require('../tests/fixtures/aeldari-abilities.json'),core=require('./aeldari-refresh-core.json');
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const unitName=id=>baseline.find(r=>r.kind==='unit'&&(r.data.id===id||r.data.importSource?.sourceId===id))?.name||String(id).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const metadata=['player_turn','upgrade_tag','datasheet_restriction_groups','keyword_restrictions'];
const mechanics=r=>Object.fromEntries(Object.entries(r||{}).filter(([k])=>!metadata.includes(k)));
function validateSource(source){
 const expected=structuredClone(pinnedRecords.find(r=>r.ability_id===source.ability_id));assert.ok(expected,'Unknown pinned source: '+source.ability_id);
 // These two imported adjustments already agree with the prior reviewed study notes:
 // Crystal Matrix grants individual re-rolls for its shooting phase; Tears of Isha
 // heals one model, rather than every model in the selected unit.
 if(expected.ability_id==='crystal-matrix-aeldari')expected.scope.duration='phase';
 if(expected.ability_id==='tears-of-isha-aeldari')expected.effect.effect.effect.steps[1].effect.modifier.per='one-model';
 assert.equal(stable(mechanics(source)),stable(mechanics(expected)),'Source mechanics changed: '+source.ability_id);
 for(const k of metadata)if(Object.hasOwn(source,k))assert.equal(stable(source[k]),stable(core[source.ability_id]?.[k]),'Core metadata changed: '+source.ability_id+' / '+k);
}
function refresh(records){
 const changes=[],preserved=[];
 for(const expected of baseline.filter(r=>r.kind==='rule')){
  const row=records.find(r=>r.key===expected.key);assert.ok(row,'Missing catalog entry: '+expected.key);
  for(const k of ['kind','faction','name','enabled','revision','data'])assert.equal(stable(row[k]),stable(expected[k]),'Entry changed; rebuild the refresh: '+row.key+' / '+k);
  const old=prior.find(r=>r.key===row.key);assert.ok(old,'No previous audit for '+row.key);
  const withoutSource=d=>Object.fromEntries(Object.entries(d).filter(([k])=>k!=='importSource'));
  if(stable(withoutSource(row.data))!==stable(withoutSource(old.data))){preserved.push(row.key);continue;}
  const view=M.enrich(old.data),source=row.data.importSource?.record;
  if(source)validateSource(source);
  const next=structuredClone(row),d=next.data,state=M.summaryState(old.data);
  for(const k of ['summary','conditions','referenceOnly','status'])if(Object.hasOwn(view,k))d[k]=structuredClone(view[k]);
  if(state==='missing')d.summary='The imported source names '+row.name+' but provides no effect mechanics. Add its current rule before using it as a study answer.';
  d.mechanicsPresentation=state==='available'?'structured':state;
  d.mechanicsDetails=source?M.describe(source).details:view.mechanicsDetails||'';
  if(targets[d.id])d.targetText=targets[d.id];
  else if(['army','stratagem'].includes(d.category)&&(!d.targetText||/^Check/.test(d.targetText))){
   const target=A.targeting({...view,expanded:false,targetText:''},{phase:d.phase[0]||0,turn:d.turn==='opponent'?'opponent':'you'});
   assert.ok(target&&!/^Check/.test(target.text),'An eligible-target description is required: '+row.key);d.targetText=target.text;
  }
  // Enrichment imports add bearer and turn metadata from the core index. Keep it
  // alongside the text instead of discarding it to make an older note match.
  if(source?.keyword_restrictions?.length)d.conditions.push('Eligible bearer keywords: '+source.keyword_restrictions.join(', ')+'.');
  if(source?.datasheet_restriction_groups?.length)d.conditions.push('Eligible upgrade/bearer datasheets: '+source.datasheet_restriction_groups.map(g=>unitName(g.unit_id)+(g.keywords?.length?' ('+g.keywords.join(', ')+')':'')).join('; ')+'.');
  if(source?.player_turn)d.conditions.push('Imported turn restriction: '+source.player_turn.replace(/-/g,' ')+'.');
  d.conditions=[...new Set(d.conditions)];
  d.question=state==='available'?'What does '+row.name+' do?':'What needs checking before using '+row.name+'?';d.answer=d.summary;
  d.summaryAudit={id:'aeldari-refresh-2026-11-14',sourceHash:source?digest(source):null,summaryHash:digest(d.summary),previousAuditId:old.data.id,coreSource:core[source?.ability_id||view.importSource?.sourceId]||null};
  C.validate(next);changes.push(next);
 }
 assert.equal(preserved.length,11);assert.equal(changes.length,301);
 const byKey=new Map(changes.map(r=>[r.key,r])),after=records.map(r=>byKey.get(r.key)||r),counts={};
 for(const r of after.filter(r=>r.kind==='rule')){const state=M.summaryState(r.data);counts[state]=(counts[state]||0)+1;assert.ok(!M.isPlaceholder(M.enrich(r.data).summary),'Generic description remains: '+r.key);}
 return {changes,preserved,counts,after};
}
module.exports={refresh,digest,validateSource};
if(require.main===module){
 const [snapshot,out]=process.argv.slice(2);if(!out)throw Error('Provide a catalog snapshot and output prefix.');
 const result=refresh(JSON.parse(fs.readFileSync(snapshot))),payload=result.changes.map(({key,kind,faction,name,data,enabled,revision})=>({key,kind,faction,name,data,enabled,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(result.after));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as refreshed_entries from public.import_rules_catalog($aeldari_refresh$${JSON.stringify(payload)}$aeldari_refresh$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({changed:result.changes.length,preserved:result.preserved,counts:result.counts},null,2));console.log(JSON.stringify({changed:result.changes.length,preserved:result.preserved.length,counts:result.counts}));
}
