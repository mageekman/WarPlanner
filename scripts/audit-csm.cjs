/* Chaos Space Marines audit: source-bound original study wording, CC BY 4.0; CREDITS.md.
 * node scripts/audit-csm.cjs BEFORE_CATALOG_JSON OUTPUT_PREFIX
 * Generates a review plan and SQL, never connects or applies changes itself.
 * Full payload comparisons reject saved edits or changed imports. SQL uses revision checks.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js');
const baseline=require('../tests/fixtures/chaos-space-marines-audit-before.json'),notes=require('./csm-study-notes.json');
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b';
function audit(records){
 const changes=[],index=new Map(notes.map(n=>[n.id,n]));
 for(const expected of baseline.filter(r=>r.kind==='rule')){
  const row=records.find(r=>r.key===expected.key);assert.ok(row,'Missing catalog entry: '+expected.key);
  for(const key of ['kind','faction','name','enabled','revision','data'])assert.equal(stable(row[key]),stable(expected[key]),'Entry changed; rebuild the audit: '+row.key+' / '+key);
  const next=structuredClone(row),d=next.data,source=d.importSource.record,note=index.get(d.id);
  if(!note){assert.match(d.importSource.file,/^(tyranids|blood-angels)\//);next.enabled=false;changes.push(next);continue;}
  assert.equal(source.faction_id,'chaos-space-marines');assert.equal(source.ability_id,note.sourceId);
  d.summary=note.summary;d.targetText=note.targetText;d.mechanicsPresentation=note.state;
  d.mechanicsDetails=M.describe(source).details;
  d.conditions=['Source-derived study note; confirm against the current rules.'];
  for(const key of ['phase','turn','window'])if(Object.hasOwn(note,key))d[key]=structuredClone(note[key]);
  if(note.coreSource){
   d.conditions.push(note.coreSource.cp_cost!==undefined?'Stratagem cost: '+note.coreSource.cp_cost+'CP. '+(note.coreSource.timing==='once-per-phase'?'Once per phase.':''):'Use only on the eligible enhancement bearer.');
  }
  d.summaryAudit={id:'csm-2026-11-14',sourceHash:digest(source),summaryHash:digest(note.summary),coreSource:note.coreSource||null,coreCommit:note.coreSource?pin:null};
  // Resolve after this shooter's attacks, before other units shoot at the marked enemy.
  if(note.sourceId==='warp-tracer-fellhammer-siege-host-chaos-space-marines'&&!d.guide)d.guide={order:'early',rank:15,phases:[2],turn:'you',label:'Early',note:'Shoot early if removing cover will help later units attack the marked enemy.',flags:[]};
  C.validate(next);changes.push(next);
 }
 assert.equal(changes.length,375);const counts=Object.fromEntries(['structured','needs-summary','missing'].map(state=>[state,notes.filter(n=>n.state===state).length]));
 return {changes,counts,disabled:changes.filter(r=>!r.enabled).map(r=>r.key)};
}
module.exports={audit,notes,digest};
if(require.main===module){
 const [snapshot,out]=process.argv.slice(2);if(!out)throw Error('Provide a catalog snapshot and output prefix.');
 const records=JSON.parse(fs.readFileSync(snapshot)),result=audit(records),byKey=new Map(result.changes.map(r=>[r.key,r]));
 const after=records.map(r=>byKey.get(r.key)||r);
 const payload=result.changes.map(({key,kind,faction,name,data,enabled,revision})=>({key,kind,faction,name,data,enabled,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(after));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($csm_audit$${JSON.stringify(payload)}$csm_audit$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:notes.length,counts:result.counts,disabled:result.disabled,changed:result.changes.length},null,2));
 console.log(JSON.stringify({audited:notes.length,counts:result.counts,disabled:result.disabled.length,changed:result.changes.length}));
}
