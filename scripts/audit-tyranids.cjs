/* Tyranids source audit: original study summaries, CC BY 4.0; see CREDITS.md.
 * node scripts/audit-tyranids.cjs BEFORE_CATALOG_JSON OUTPUT_PREFIX
 * Generates a reviewed update and revision-checked SQL; never connects/applies itself.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js');
const baseline=require('../tests/fixtures/tyranids-audit-before.json'),notes=require('./tyranids-study-notes.json');
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
const pin='6ea813f7706bc9a492026d8b4403af99a965162b';
const early={
 'symbiotic-targeting-tyranids':{rank:10,note:'Consider shooting early if later TYRANIDS shooters will attack the same marked enemy.'},
 'burning-spray-tyranids':{rank:15,note:'Consider shooting early to remove cover before other units attack the chosen enemy.'},
 'death-scream-tyranids':{rank:20,note:'Consider shooting early when Battle-shock would enable later units’ target-dependent bonuses.'}
};
function audit(records){
 const changes=[],index=new Map(notes.map(n=>[n.id,n]));
 for(const expected of baseline.filter(r=>r.kind==='rule'&&r.enabled)){
  const row=records.find(r=>r.key===expected.key);assert.ok(row,'Missing catalog entry: '+expected.key);
  for(const key of ['kind','faction','name','enabled','revision','data'])assert.equal(stable(row[key]),stable(expected[key]),'Entry changed; rebuild the audit: '+row.key+' / '+key);
  const next=structuredClone(row),d=next.data,source=d.importSource.record,note=index.get(d.id);
  assert.equal(row.faction,'Tyranids');assert.equal(source.faction_id,'tyranids');assert.equal(source.ability_id,note?.sourceId);
  d.summary=note.summary;d.targetText=note.targetText;d.mechanicsPresentation=note.state;d.mechanicsDetails=M.describe(source).details;
  d.conditions=['Source-derived study note; confirm against the current rules.'];
  for(const key of ['phase','turn','window'])if(Object.hasOwn(note,key))d[key]=structuredClone(note[key]);
  if(note.coreSource)d.conditions.push(note.coreSource.cp_cost!==undefined?'Stratagem cost: '+note.coreSource.cp_cost+'CP. '+(note.coreSource.timing==='once-per-phase'?'Once per phase.':''):'Use only on the eligible enhancement bearer or upgrade unit.');
  d.summaryAudit={id:'tyranids-2026-11-14',sourceHash:digest(source),summaryHash:digest(note.summary),coreSource:note.coreSource||null,coreCommit:note.coreSource?pin:null};
  if(early[source.ability_id]&&!d.guide)d.guide={order:'early',...early[source.ability_id],phases:[2],turn:'you',label:'Early',flags:[]};
  if(source.ability_id==='instinctive-defence-assimilation-swarm-tyranids'&&!d.guide)d.guide={order:'normal',rank:20,phases:[3,4],turn:'either',label:'',note:'Check the bearer’s distance to a friendly HARVESTER.',flags:['Fights First within 6″ of a HARVESTER']};
  C.validate(next);changes.push(next);
 }
 assert.equal(changes.length,186);return {changes,counts:Object.fromEntries(['structured','needs-summary','missing'].map(state=>[state,notes.filter(n=>n.state===state).length]))};
}
module.exports={audit,notes,digest};
if(require.main===module){
 const [snapshot,out]=process.argv.slice(2);if(!out)throw Error('Provide a catalog snapshot and output prefix.');
 const records=JSON.parse(fs.readFileSync(snapshot)),result=audit(records),byKey=new Map(result.changes.map(r=>[r.key,r]));
 const payload=result.changes.map(({key,kind,faction,name,data,enabled,revision})=>({key,kind,faction,name,data,enabled,expectedRevision:revision}));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>byKey.get(r.key)||r)));
 fs.writeFileSync(out+'-repair.sql',`begin;\nselect set_config('request.jwt.claim.sub','37b487e0-c183-48de-99ff-a622d2b6e6a8',true);\nset local role authenticated;\nselect count(*) as audited_entries from public.import_rules_catalog($tyranids_audit$${JSON.stringify(payload)}$tyranids_audit$::jsonb);\nCOMMIT;\n`);
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({audited:notes.length,counts:result.counts,changed:result.changes.length},null,2));
 console.log(JSON.stringify({audited:notes.length,counts:result.counts,changed:result.changes.length}));
}
