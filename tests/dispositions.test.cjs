const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../dist/dispositions.js'),A=require('../dist/activations.js');
const pairs=require('./fixtures/disposition-matchups.json');
const state=(own='Priority Assets',opponent='Disruption',extra={})=>({army:{faction:'Aeldari',disposition:own,units:[]},guideDisposition:{enabled:true,opponent},round:2,phase:2,turn:'you',firstPlayer:'you',...extra});
const step=(s,id)=>A.steps(s).find(step=>step.id===id);
const at=(s,id)=>D.reminders(s,step(s,id));
test('all 25 directional pairings match the supplied mission deck',()=>{
 assert.equal(pairs.length,25);assert.equal(new Set(pairs.map(p=>p.you+'|'+p.opponent)).size,25);
 for(const p of pairs)assert.equal(D.matchup(p.you,p.opponent).name.toUpperCase(),p.mission);
 assert.notEqual(D.matchup('Priority Assets','Disruption'),D.matchup('Disruption','Priority Assets'));
 assert.equal(D.resolve('priority-assets'),'Priority Assets');assert.equal(D.resolve('Unknown'),null);
});
test('mission actions respect round, turn, phase, completion timing and core eligibility',()=>{
 const s=state(),cards=at(s,'shooting-activations');assert.equal(cards.length,1);
 assert.match(cards[0].text,/central objective/);assert.match(cards[0].text,/Once per turn/);assert.match(cards[0].text,/only one operation marker/);assert.match(cards[0].text,/core action eligibility/);
 assert.equal(at({...s,turn:'opponent'},'shooting-activations').length,0);
 assert.equal(at(s,'shooting-start').length,0);
 const end=state(undefined,undefined,{phase:4});assert.match(at(end,'turn-end')[0].title,/Complete Sensor Sweep/);assert.equal(at(end,'fight-end').length,0);
 for(const [own,opp] of [['Reconnaissance','Purge the Foe'],['Reconnaissance','Reconnaissance']]){
  assert.equal(at(state(own,opp,{round:1}),'shooting-activations').length,0);
  assert.ok(at(state(own,opp),'shooting-activations').length>0);
 }
});
test('Command scoring moves to turn end in round five and respects special round ranges',()=>{
 for(const p of pairs){
  const s=state(p.you,p.opponent,{phase:0});assert.equal(at({...s,round:1},'command-end').length,0);
  assert.equal(at(s,'command-end').length,1);
  assert.equal(at({...s,round:5},'command-end').length,0);
  const end=at({...s,phase:4,round:5},'turn-end');
  assert.equal(end.some(r=>r.title==='Round 5 primary scoring'),!(p.you==='Disruption'&&p.opponent==='Disruption'));
 }
 const out=state('Disruption','Disruption',{round:4,phase:0});assert.equal(at(out,'command-end').length,0);
 const battlefield=state('Take and Hold','Take and Hold',{round:3,phase:4});assert.ok(!at(battlefield,'turn-end').some(r=>r.title==='Primary scoring · End of your turn'));
});
test('pre-battle, turn-start, event and end-of-battle reminders use their separate windows',()=>{
 const locate=state('Disruption','Priority Assets',{round:1,phase:0});assert.equal(at(locate,'round-start').length,1);assert.equal(at(locate,'command-start').length,0);
 const punish=state('Purge the Foe','Disruption',{phase:0});assert.equal(at(punish,'turn-start').length,1);assert.equal(at(punish,'command-start').length,0);
 assert.ok(at({...punish,phase:4,turn:'opponent'},'turn-end').some(r=>/opponent/.test(r.title)));
 for(const firstPlayer of ['you','opponent']){
  const end=state('Priority Assets','Purge the Foe',{phase:4,round:5,turn:firstPlayer==='you'?'opponent':'you',firstPlayer});
  assert.ok(at(end,'round-end').some(r=>r.title==='End-of-battle primary scoring'));
 }
});
test('disabled, incomplete and unsupported matchups never invent mission instructions',()=>{
 const s=state();assert.deepEqual(D.reminders({...s,guideDisposition:{enabled:false,opponent:'Disruption'}},{activationMode:'shooting'}),[]);
 assert.deepEqual(D.reminders({...s,guideRuleTypes:{disposition:false}},{activationMode:'shooting'}),[]);
 assert.equal(D.matchup('', 'Disruption'),null);assert.equal(D.matchup('Priority Assets',''),null);
 assert.deepEqual(at({...s,round:6},'shooting-activations'),[]);
});
