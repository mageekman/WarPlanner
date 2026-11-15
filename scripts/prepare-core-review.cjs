/* Keep core source references editable without treating provisional mechanics as audited rules. */
const I=require('../dist/rules-import.js'),C=require('../dist/content.js');
function prepare(source){
 const result=I.parse([{name:'abilities.json',text:JSON.stringify(source.abilities)},{name:'stratagems.json',text:JSON.stringify(source.stratagems)}],{faction:'*',group:'Imperium'});
 return result.candidates.filter(c=>c.row.kind==='rule').map(c=>{
  const row=structuredClone(c.row),original=row.data.id,ability=source.abilities.find(a=>a.ability_id===original),strat=source.stratagems.find(s=>s.ability_id===original);
  row.data.id='core-'+original;row.key='rule:'+row.data.id;row.data.sourceRuleId=original;
  if(ability?.ability_type==='core')row.data.category='core';
  if(strat)row.data.category='core-stratagem';
  row.data.phase=[];row.data.window='prebattle';
  row.data.conditions.push('Community source reference, not an audited core rule. Some upstream entries are marked pre-launch provisional; check the current rules before use.');
  if(strat){row.data.conditions.push('Source CP cost: '+strat.cp_cost+'. Source usage: '+strat.timing+'. Source phases: '+strat.phases.join(', ')+'. Source player turn: '+strat.player_turn+'.');row.data.importSource.stratagem=structuredClone(strat);}
  row.data.importSource.file='data/enrichment/_core/abilities.json';
  if(ability?.community_notes)row.data.summary=ability.community_notes;
  row.expectedRevision=0;delete row.revision;C.validate(row);return row;
 });
}
module.exports={prepare};
