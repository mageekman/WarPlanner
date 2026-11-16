/* Reviewed army-rule corrections. Generates a guarded catalog import; never connects. */
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js');
const baseline=require('../tests/fixtures/army-foundations-before.json');
const notes=require('./army-foundations-notes.json');
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const digest=x=>crypto.createHash('sha256').update(stable(x)).digest('hex');
function repair(records){
 const changes=[];
 assert.equal(new Set(notes.map(n=>n.key)).size,notes.length);
 for(const note of notes){
  const expected=baseline.find(r=>r.key===note.key),original=records.find(r=>r.key===note.key);
  assert.ok(expected&&original,'Missing reviewed rule '+note.key);
  assert.equal(stable(original),stable(expected),'Entry changed; review again: '+note.key);
  const row=structuredClone(original),d=row.data;
  Object.assign(d,{summary:note.summary,targetText:note.targetText,triggerText:note.triggerText,
   phase:[...new Set(note.timings.flatMap(t=>t.phase))].sort(),
   turn:note.timings.every(t=>t.turn===note.timings[0].turn)?note.timings[0].turn:'either',window:note.timings[0].window,
   timingOverride:true,referenceOnly:false,mechanicsPresentation:'structured',status:'admin-reviewed',
   sourceUrl:note.sources[0].url,sourceLabel:note.sources[0].label});
  if(note.timings.length>1)d.timings=structuredClone(note.timings);else delete d.timings;
  // Retain original imported mechanics as evidence, not as the corrected procedure.
  d.mechanicsDetails='Historical import (superseded for this rule by the checked summary and Conditions below):\n'+M.describe(d.importSource.record).details;
  d.conditions=(d.conditions||[]).filter(c=>![/^Imported source: confirm current wording/,/^Source-derived study summary;/,/^Needs source review:/,/^Source marked pre-launch provisional\.$/].some(re=>re.test(c)));
  d.conditions=[...new Set([...d.conditions,...note.conditions,'Checked '+note.checked+' against the linked references. The original import is retained for history; use this corrected summary and its restrictions.',...note.sources.map(s=>s.label+': '+s.url)])];
  d.summaryAudit={id:'army-foundations-2026-11-15',sourceHash:digest(d.importSource.record),summaryHash:digest(d.summary),previousAudit:structuredClone(original.data.summaryAudit||null),previousSummaryHash:digest(original.data.summary),sources:structuredClone(note.sources),checked:note.checked};
  C.validate(row);changes.push(row);
 }
 return changes;
}
function payload(changes){return changes.map(({revision,...r})=>({...r,expectedRevision:revision}));}
module.exports={repair,notes,digest,payload};
if(require.main===module){
 const [file,out]=process.argv.slice(2);assert.ok(file&&out,'Provide snapshot and output prefix.');
 const records=JSON.parse(fs.readFileSync(file)),changes=repair(records),byKey=new Map(changes.map(r=>[r.key,r]));
 fs.writeFileSync(out+'-after.json',JSON.stringify(records.map(r=>byKey.get(r.key)||r)));
 fs.writeFileSync(out+'-payload.json',JSON.stringify(payload(changes)));
 fs.writeFileSync(out+'-manifest.json',JSON.stringify({changed:changes.map(r=>({key:r.key,expectedRevision:r.revision,summaryHash:digest(r.data.summary)}))},null,2));
 console.log(JSON.stringify({changed:changes.length}));
}
