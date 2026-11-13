const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../dist/activations.js');
const {sample,parseArmy}=require('../dist/core.js');
const state=(army=sample,phase=2,turn='you')=>({army,phase,turn,round:1,firstPlayer:'you'});
const ids=stages=>stages.flatMap(s=>s.cards.map(a=>a.id));
test('action phases use complete unit walkthroughs without flattening Fight steps',()=>{
 assert.deepEqual(A.steps(state()).map(s=>s.id),['shooting-start','shooting-activations','shooting-end']);
 assert.deepEqual(A.steps(state(sample,1)).map(s=>s.id),['movement-start','movement-activations','movement-end']);
 assert.deepEqual(A.steps(state(sample,3)).map(s=>s.id),['charge-start','charge-activations','charge-end']);
 const fight=A.steps(state(sample,4));assert.deepEqual(fight.slice(0,5).map(s=>s.activationMode||s.id),['fight-start','pile','fight','consolidate','fight-end']);
});
test('leaders and bodyguards share one activation; duplicate squads remain distinct',()=>{
 const units=A.units(sample);assert.equal(units.length,15);
 const asurmen=units.find(u=>A.has(u,'Asurmen'));assert.ok(asurmen.attached);assert.equal(asurmen.body.name,'Dire Avengers');
 assert.equal(units.filter(u=>A.has(u,'Fire Dragons')).length,2);
 assert.equal(new Set(units.map(u=>u.id)).size,15);
});
test('War Walkers are suggested early and resolve their effect within that activation',()=>{
 const s=state(),ordered=A.orderedUnits(s);assert.ok(A.has(ordered[0],'War Walkers'));assert.ok(A.has(ordered[1],'Falcon'));
 const stages=A.stages(s,ordered[0],'shooting');assert.ok(stages.find(s=>s.id==='after').cards.some(a=>a.id==='walker'));
 assert.ok(!stages.find(s=>s.id==='before').cards.some(a=>a.id==='walker'));
 assert.ok(!stages.flatMap(s=>s.cards).some(a=>a.id==='path-warrior'));
});
test('Fire Dragons collect their detachment, attack and token abilities together',()=>{
 const s=state(),dragons=A.units(sample).find(u=>A.has(u,'Fire Dragons'));
 const stages=A.stages(s,dragons,'shooting');
 for(const id of ['path-warrior','dragons','token'])assert.ok(ids(stages).includes(id));
 assert.ok(!ids(stages).includes('asurmen-hand'));assert.ok(!ids(stages).includes('fuegan-burning-lance'));
 const support=stages.flatMap(s=>s.cards).find(a=>a.id==='walker');assert.ok(support.borrowedEffect);assert.match(support.summary,/already hit and selected this enemy/);
 const falcon=stages.flatMap(s=>s.cards).find(a=>a.id==='falcon');assert.match(falcon.conditions.join(' '),/confirm which Falcon/);
 const stratagem=stages.flatMap(s=>s.cards).find(a=>a.id==='preternatural-precision-stratagem');assert.doesNotMatch(stratagem.summary,/Doom Inescapable/);
});
test('Fuegan range bonus binds to only his actual leader/bodyguard group',()=>{
 const text=`Pilot (350 points)\nAeldari\nAspect Host (3 Detachment Points)\nAttached Units\nAttached Unit 1\nFuegan (130 points)\n• Attached as: Leader (Character)\nFire Dragons (110 points)\n• Attached as: Bodyguard\n• 1x Aspect Shrine Token\nOTHER DATASHEETS\nFire Dragons (110 points)\n• 1x Aspect Shrine Token`;
 const army=parseArmy(text).army,s=state(army),units=A.units(army);
 assert.equal(units.length,2);
 const attached=A.stages(s,units[0],'shooting').flatMap(s=>s.cards).find(a=>a.id==='fuegan-burning-lance');
 assert.ok(attached);assert.match(attached.summary,/Melta weapons/);assert.match(attached.summary,/6 inches/);
 assert.ok(!ids(A.stages(s,units[1],'shooting')).includes('fuegan-burning-lance'));
 const detached={...army,units:army.units.map(u=>({...u,group:''}))};
 for(const unit of A.units(detached))assert.equal(A.rangeBonus(unit),null);
 const supportRole={...army,units:army.units.map(u=>u.name==='Fuegan'?{...u,role:'support'}:u)};
 assert.equal(A.rangeBonus(A.units(supportRole)[0]),null);
});
test('a missing token, enhancement or leading relationship does not become an ability',()=>{
 const army={...sample,units:[{id:'custom',name:'Fire Dragons',points:110,role:'',group:'',details:['1x Firepike']}]};
 const unit=A.units(army)[0];assert.ok(!ids(A.stages(state(army),unit,'shooting')).includes('token'));
 const other={...sample,detachment:'Warhost'};
 assert.ok(!ids(A.stages(state(other),A.units(other).find(u=>A.has(u,'Fire Dragons')),'shooting')).includes('path-warrior'));
 const alone={...sample,units:sample.units.filter(u=>u.name==='Asurmen').map(u=>({...u,group:''}))};
 assert.ok(!ids(A.stages(state(alone),A.units(alone)[0],'shooting')).includes('asurmen-move'));
});
test('opponent shooting presents responses rather than invented friendly shooting',()=>{
 const s=state(sample,2,'opponent'),steps=A.steps(s);assert.equal(steps[1].activationMode,'response');
 const avatar=A.units(sample).find(u=>A.has(u,'Avatar of Khaine'));
 const cards=ids(A.stages(s,avatar,'response'));assert.ok(cards.includes('avatar-defence'));assert.ok(cards.includes('fade'));assert.ok(!cards.includes('path-warrior'));
});
test('movement board lists shared options once, then relevant unit cards',()=>{
 const s=state(sample,1),step=A.steps(s)[1],deck=A.flashcards(s,step);
 assert.deepEqual(deck.shared.slice(0,2).map(a=>a.id),['swift','flitting']);
 assert.equal(deck.shared.filter(a=>a.id==='swift').length,1);
 assert.ok(deck.unitCards.some(c=>A.has(c.unit,'Avatar of Khaine')));
 const hawks=deck.unitCards.filter(c=>A.has(c.unit,'Swooping Hawks'));assert.equal(hawks.length,1);assert.equal(hawks[0].instances.length,2);
 assert.ok(hawks[0].items.some(a=>a.id==='hawks'));
 assert.ok(!deck.unitCards.some(c=>A.has(c.unit,'Dire Avengers'))); // No unit-specific Movement rule.
 assert.ok(!deck.unitCards.flatMap(c=>c.items).some(a=>a.borrowedEffect&&a.id==='avatar-aura'));
});
test('flashcards preserve setup-shooter order and keep differing attachments separate',()=>{
 const s=state(),deck=A.flashcards(s,A.steps(s)[1]);
 assert.ok(A.has(deck.unitCards[0].unit,'War Walkers'));assert.ok(A.has(deck.unitCards[1].unit,'Falcon'));
 const text=`Pilot (350 points)\nAeldari\nAspect Host (3 Detachment Points)\nAttached Units\nAttached Unit 1\nFuegan (130 points)\n• Attached as: Leader\nFire Dragons (110 points)\n• Attached as: Bodyguard\n• 1x Aspect Shrine Token\nOTHER DATASHEETS\nFire Dragons (110 points)\n• 1x Aspect Shrine Token`;
 const a=parseArmy(text).army,custom=state(a),cards=A.flashcards(custom,A.steps(custom)[1]).unitCards;
 assert.equal(cards.length,2);
 assert.equal(cards.filter(c=>c.items.some(a=>a.id==='fuegan-burning-lance')).length,1);
 assert.ok(cards.every(c=>c.instances.length===1));
});
test('shared-ability threshold counts three actual units before visual merging',()=>{
 const makeArmy=n=>({...sample,units:Array.from({length:n},(_,i)=>({id:'dragon-'+i,name:'Fire Dragons',points:110,group:'',role:'',details:['1x Aspect Shrine Token']}))});
 const two=state(makeArmy(2)),deckTwo=A.flashcards(two,A.steps(two)[1]);
 assert.ok(!deckTwo.shared.some(a=>a.id==='token'));
 assert.ok(deckTwo.unitCards[0].items.some(a=>a.id==='token'));
 const three=state(makeArmy(3)),deckThree=A.flashcards(three,A.steps(three)[1]);
 const token=deckThree.shared.find(a=>a.id==='token');assert.ok(token.promoted);assert.equal(token.appliesTo.length,3);
 assert.equal(new Set(token.appliesTo.map(u=>u.id)).size,3);
 assert.equal(deckThree.unitCards.length,0); // Both unit rules are now shared.
});
test('units with only shared Shooting rules disappear without losing their shared eligibility',()=>{
 const s=state(),deck=A.flashcards(s,A.steps(s)[1]);
 assert.ok(!deck.unitCards.some(c=>A.has(c.unit,'Swooping Hawks')||A.has(c.unit,'Warp Spiders')));
 const token=deck.shared.find(a=>a.id==='token');
 assert.equal(token.appliesTo.filter(u=>A.has(u,'Swooping Hawks')).length,2);
 assert.ok(token.appliesTo.some(u=>A.has(u,'Warp Spiders')));
 assert.ok(deck.unitCards.some(c=>A.has(c.unit,'War Walkers')));
 assert.ok(deck.unitCards.some(c=>A.has(c.unit,'Fire Dragons')));
 const move=state(sample,1),movement=A.flashcards(move,A.steps(move)[1]);
 assert.ok(movement.unitCards.some(c=>A.has(c.unit,'Swooping Hawks')));
 assert.ok(movement.unitCards.some(c=>A.has(c.unit,'Warp Spiders')));
});
test('a leader and bodyguard do not count as two users of a shared ability',()=>{
 const army={...sample,units:[
  {id:'asurmen',name:'Asurmen',points:135,group:'a',role:'leader',details:[]},
  {id:'avengers',name:'Dire Avengers',points:70,group:'a',role:'bodyguard',details:['1x Aspect Shrine Token']},
  {id:'dragons',name:'Fire Dragons',points:110,group:'',role:'',details:['1x Aspect Shrine Token']}
 ]};
 const s=state(army);assert.ok(!A.flashcards(s,A.steps(s)[1]).shared.some(a=>a.id==='token'));
});
test('Fights First badge requires every model, including the attached leader, to qualify',()=>{
 const s=state(sample,4),units=A.units(sample);
 assert.ok(A.fightsFirst(s,units.find(u=>A.has(u,'Jain Zar'))));
 assert.ok(A.fightsFirst(s,units.find(u=>A.has(u,'Autarch'))));
 assert.equal(A.fightsFirst(s,units.find(u=>A.has(u,'Asurmen'))),false);
 const autarch={...sample,units:sample.units.filter(u=>u.name==='Autarch').map(u=>({...u,group:''}))};
 assert.equal(A.fightsFirst(state(autarch,4),A.units(autarch)[0]),false);
 const wrongLeader={...sample,units:sample.units.filter(u=>u.group==='3').map(u=>u.name==='Autarch'?{...u,name:'Asurmen'}:u)};
 assert.equal(A.fightsFirst(state(wrongLeader,4),A.units(wrongLeader)[0]),false);
 assert.equal(A.fightsFirst(state(sample,2),units.find(u=>A.has(u,'Jain Zar'))),false);
});
test('shared army rules and separate stratagems expose target restrictions',()=>{
 for(const phase of [0,1,2,3,4])for(const turn of ['you','opponent']){
  const s=state(sample,phase,turn);
  for(const step of A.steps(s))for(const rule of A.flashcards(s,step).shared){
   const target=A.targeting(rule,s);
   if(['army','stratagem'].includes(rule.category)){assert.ok(target);assert.doesNotMatch(target.text,/Check this rule’s conditions for eligible targets/);}
   else assert.equal(target,null);
  }
 }
 const s=state(),rules=A.flashcards(s,A.steps(s)[1]).shared;
 const precision=rules.find(a=>a.id==='preternatural-precision-stratagem');
 assert.match(A.targeting(precision,s).text,/Aspect Warriors unit not yet selected to shoot/);
 const doom=rules.find(a=>a.id==='doom-inescapable-stratagem');
 assert.match(A.targeting(doom,s).text,/Avatar of Khaine model/);
});
