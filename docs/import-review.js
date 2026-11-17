/* Explain catalog matching without changing an imported roster. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports,L=node?require('./lessons.js'):root.WarPlanLessons,M=node?require('./mechanics.js'):root.WarPlannerMechanics;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function assess(army,{library=L,mechanics=M}={}){
  const catalog=library.catalog,factions=catalog.factions?.length?catalog.factions:[...new Set([...catalog.units,...catalog.detachments].map(r=>r.faction).filter(Boolean).concat(library.isAeldari?.(army)?['Aeldari']:[]))].map(name=>({name})),faction=factions.find(f=>[f.name,...(f.aliases||[])].some(name=>norm(name)===norm(army.faction)));
  const chosen=library.armyDetachments(army),known=(catalog.detachments||[]).filter(d=>d.enabled!==false&&d.siteExcluded!=='combat-patrol'&&library.factionMatches(d.faction,army.faction));
  const imported=Array.isArray(army.detachments)?army.detachments:[army.detachment].filter(Boolean);
  const detachmentMissing=!imported.length||imported.every(d=>!d||['customroster','unknown'].includes(norm(d)));
  const unmatchedDetachments=detachmentMissing?[]:imported.filter(name=>!known.some(d=>norm(d.name)===norm(name))&&!chosen.some(name2=>norm(name2)===norm(name)&&known.some(d=>norm(d.name)===norm(name2))));
  const ruleIndex=new Map();
  for(const r of library.abilities)for(const id of new Set([r.id,r.sourceRuleId].filter(Boolean))){if(!ruleIndex.has(id))ruleIndex.set(id,[]);ruleIndex.get(id).push(r);}
  const units=army.units.map(entry=>{
   const info=library.unitInfo(entry,army.faction);
   if(!info){const choices=catalog.units.filter(u=>norm(u.name)===norm(entry.name)&&library.factionMatches(u.faction,army.faction));return {name:entry.name,matched:false,ambiguous:choices.length>1};}
   const refs=info.abilities||[],gaps=[];
   for(const ref of refs){const id=typeof ref==='string'?ref:ref.id,candidates=[...(ruleIndex.get(id)||[]),...(ruleIndex.get(library.aliases?.[id])||[])].filter(r=>r.enabled!==false&&(!library.ruleInFaction||library.ruleInFaction(r,info.faction||army.faction)));
    const available=candidates.some(r=>!r.sourceReview&&!r.referenceOnly&&(mechanics?mechanics.summaryState(r)==='available':!!r.summary));
    if(!available)gaps.push(candidates[0]?.name||ref.name||'An ability on this datasheet');
   }
   return {name:entry.name,matched:true,refs:refs.length,available:refs.length-gaps.length,gaps:[...new Set(gaps)],incomplete:!refs.length||gaps.length>0};
  });
  return {faction:faction?.name||army.faction,factionMatched:!!faction,detachmentMissing,unmatchedDetachments,units,matched:units.filter(u=>u.matched).length,incomplete:units.filter(u=>u.incomplete).length};
 }
 function render(imported){
  const review=assess(imported.army),issue=!review.factionMatched||review.detachmentMissing||review.unmatchedDetachments.length||review.matched<review.units.length||review.incomplete;
  return `<section class="import-review" aria-label="Import review"><h3>${issue?'Review a few details':'Your list is ready to review'}</h3><p class="import-review-count" role="status">${review.matched} of ${review.units.length} units matched to a datasheet${review.incomplete?' · '+review.incomplete+' with incomplete rule summaries':''}</p><dl><dt>Faction</dt><dd>${e(review.faction)}${review.factionMatched?' · Matched':' · Not recognised. Check the faction in your export or the list editor.'}</dd><dt>Detachment</dt><dd>${review.detachmentMissing?'Not found. Add your detachment in the list editor so its rules can appear.':e(imported.army.detachments?.join(' · ')||imported.army.detachment)}${review.unmatchedDetachments.length?`<p>Not recognised: ${review.unmatchedDetachments.map(e).join(' · ')}. Check these names in the list editor; their detachment rules may be missing from the guide.</p>`:''}</dd></dl><div class="import-unit-review">${review.units.map(u=>`<article class="import-unit-status ${!u.matched||u.incomplete?'import-needs-review':''}"><strong>${e(u.name)}</strong><p>${!u.matched?u.ambiguous?'Multiple datasheets match this name. Choose the datasheet source under Unit options in the list editor.':'No matching datasheet found. Check the spelling in your export or replace the entry in the list editor. Unit-specific reminders may be missing.':u.refs?`${u.available} of ${u.refs} referenced rules have usable summaries.`:'Datasheet matched, but no ability references are available to check.'}</p>${u.gaps?.length?`<details><summary>Rules to check (${u.gaps.length})</summary><ul>${u.gaps.map(name=>`<li>${e(name)}</li>`).join('')}</ul><p>These summaries are missing, need review, or are reference-only. Check the current source rules before playing.</p></details>`:''}</article>`).join('')}</div>${imported.warnings.length?`<details class="import-parser-notes"><summary>Import notes (${imported.warnings.length})</summary><ul>${imported.warnings.map(w=>`<li>${e(w)}</li>`).join('')}</ul></details>`:''}<p class="import-review-help">You can save this list with unresolved items and edit it afterward. This checks saved datasheet references; it does not verify every army rule, equipment choice, attachment, or army’s legality.</p><button type="button" class="text-button" data-action="revise-import">Edit pasted export</button></section>`;
 }
 const api={assess,render};if(node)module.exports=api;else root.WarPlannerImportReview=api;
})(typeof window!=='undefined'?window:globalThis);
