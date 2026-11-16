'use strict';
// Read-only consistency audit of an exported catalog. Does not connect to Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),B=require('../dist/list-builder.js');
function audit(rows){
 C.apply(rows);const catalog=L.catalog,chapters=catalog.factions.filter(f=>f.group==='Space Marines').map(f=>f.name),issues=[];
 const note=(ok,message)=>{if(!ok)issues.push(message);};
 for(const faction of [...chapters,'Imperial Agents','Genestealer Cults']){
  const units=catalog.units.filter(u=>L.factionMatches(u.faction,faction)&&!u.allied),names=new Set();
  for(const u of units){note(!names.has(u.name),faction+': duplicate '+u.name);names.add(u.name);}
 }
 const reviewed=catalog.units.filter(u=>u.unitMemberships||u.allied||L.factionMatches(u.faction,'Imperial Agents')||L.factionMatches(u.faction,'Genestealer Cults'));
 for(const u of reviewed){
  for(const id of u.bodyguardIds)note(catalog.units.some(b=>b.id===id&&L.factionMatches(b.faction,u.faction)),u.faction+': '+u.name+' has missing bodyguard '+id);
  for(const ref of u.abilities)note(L.abilities.some(r=>(r.id===ref.id||r.sourceRuleId===ref.id||r.id===L.aliases[ref.id])&&(r.faction==='*'||L.factionMatches(r.faction,u.faction))),u.faction+': '+u.name+' has missing ability '+ref.id);
  if(u.allied)note(rows.some(r=>r.kind==='unit'&&r.data.id===u.sourceUnitId&&r.enabled),'Missing editable source for '+u.id);
 }
 const enhancementCases=[],sourceReview=[];
 for(const e of catalog.enhancements.filter(e=>chapters.includes(e.faction)&&e.restrictions.some(r=>r.unit_id))){
  const army={faction:e.faction,detachment:catalog.detachments.find(d=>d.id===e.detachmentId&&d.faction===e.faction)?.name,units:[]};
  const bearers=catalog.units.filter(u=>u.faction===e.faction&&!u.allied&&e.restrictions.some(r=>[u.id,u.canonicalUnitId].includes(r.unit_id)));
  for(const u of bearers){if(!e.keywords.every(k=>u.keywords.some(v=>v.toLowerCase()===k.toLowerCase()))){sourceReview.push(e.faction+': '+e.name+' names '+u.name+' but its keyword restrictions exclude that bearer');continue;}const entry={id:'qa',name:u.name,catalogUnitId:u.id,catalogFaction:u.faction,details:[]};note(B.enhancements(army,entry).some(x=>x.id===e.id),e.faction+': missing enhancement '+e.name+' for '+u.name);enhancementCases.push([e.faction,e.name,u.name]);}
 }
 const gsc={};for(const detachment of ['Brood Brothers Auxilia','Final Day']){const army={faction:'Genestealer Cults',detachment,units:[]},units=B.search('',army.faction,army).filter(u=>u.allied);gsc[detachment]=units.length;for(const u of units)note(!u.abilities.some(a=>['voice-of-command-astra-militarum','synapse-tyranids','shadow-in-the-warp-tyranids'].includes(a.id)),u.name+': forbidden army rule');}
 const report={records:rows.length,chapters:chapters.length,sharedDatasheets:rows.filter(r=>r.enabled&&r.data.unitMemberships).length,sharedViews:catalog.units.filter(u=>u.unitMemberships&&!u.allied).length,agentsHosts:catalog.factions.filter(f=>catalog.units.some(u=>u.faction===f.name&&u.allied&&!u.alliedKind)).length,gsc,enhancementCases:enhancementCases.length,sourceReview,issues};
 return report;
}
if(require.main===module){const report=audit(JSON.parse(fs.readFileSync(process.argv[2])));console.log(JSON.stringify(report,null,2));assert.deepEqual(report.issues,[]);}
module.exports={audit};
