const test=require('node:test'),assert=require('node:assert/strict'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),C=require('../dist/content.js'),{sample}=require('../dist/core.js');
const state=(phase,turn='you',guideMode='learn')=>({army:structuredClone(sample),phase,turn,round:1,firstPlayer:'you',guideMode});
const ruleIds=deck=>[...deck.shared,...deck.unitCards.flatMap(c=>c.items)].map(a=>a.id);
test.afterEach(()=>C.reset());
test('learning retains each reviewed core step instead of merging phase activations',()=>{
 for(let phase=0;phase<5;phase++)for(const turn of ['you','opponent']){
  const s=state(phase,turn);assert.deepEqual(A.steps(s).map(x=>x.id),L.getSteps(s).map(x=>x.id));
  for(const step of A.steps(s)){const lesson=L.learningStep(step,s);assert.ok(lesson.actions.length>=2,step.id);assert.ok(step.body&&step.why&&step.question&&step.answer);assert.ok(lesson.glossary.length);}
 }
 assert.equal(A.steps(state(2,'you','quick')).length,3);assert.equal(A.steps(state(2)).length,5);
});
test('learning does not lose eligible army reminders while splitting the core sequence',()=>{
 for(let phase=0;phase<5;phase++)for(const turn of ['you','opponent']){
  const quick=state(phase,turn,'quick'),learn=state(phase,turn),session=A.createSession();
  const quickIds=new Set(A.steps(quick).flatMap(step=>ruleIds(session.stepDeck(quick,step))).concat(ruleIds(session.anyTime(quick))));
  const learningIds=new Set(A.steps(learn).flatMap(step=>ruleIds(session.stepDeck(learn,step))).concat(ruleIds(session.anyTime(learn))));
  for(const id of quickIds)assert.ok(learningIds.has(id),`${phase} ${turn}: lost ${id}`);
 }
});
test('learning respects edited core instructions and both players turn boundaries',()=>{
 const s=state(2);L.stepOverrides.set('shooting-attacks',{body:'Maintained core instructions',why:'Maintained explanation'});
 assert.equal(A.steps(s).find(x=>x.id==='shooting-attacks').body,'Maintained core instructions');
 assert.equal(A.steps(state(0)).filter(x=>x.id==='round-start').length,1);assert.equal(A.steps(state(0,'opponent')).filter(x=>x.id==='round-start').length,0);
 assert.ok(A.steps(state(4,'opponent')).some(x=>x.id==='round-end'));
});
test('unit-repeat shortcuts preserve the separate Fight steps and explain opponents actions',()=>{
 assert.equal(L.learningStep(A.steps(state(2)).find(x=>x.id==='shooting-after'),state(2)).repeat.id,'shooting-select');
 for(const step of A.steps(state(4)))assert.equal(L.learningStep(step,state(4)).repeat,null);
 const s=state(2,'opponent');for(const step of A.steps(s)){const lesson=L.learningStep(step,s);assert.equal(lesson.repeat,null);assert.match(lesson.perspective,/opponent/);}
});

test('beginner instructions include the core actions rather than only pointing to another rule',()=>{
 const lesson=(phase,id)=>{const s=state(phase);return L.learningStep(A.steps(s).find(step=>step.id===id),s);};
 assert.match(lesson(0,'command-cp').actions.join(' '),/1 CP.*each player/);
 assert.match(lesson(0,'command-shock').actions.join(' '),/at or below half-strength.*2D6.*Leadership/s);
 assert.match(lesson(1,'movement-select').actions.join(' '),/one D6.*add it to M.*Fall Back.*normally cannot shoot/s);
 assert.match(lesson(2,'shooting-attacks').actions.join(' '),/Ballistic Skill.*Strength.*Toughness.*allocation groups.*lowest to highest/s);
 assert.match(lesson(3,'charge-declare').actions.join(' '),/within 12″.*2D6/s);
 assert.match(lesson(4,'fight-resolve').actions[0],/player whose turn it is.*Fights First/);
 assert.match(lesson(4,'fight-pile').actions.join(' '),/up to 3″.*only once/s);
 assert.match(lesson(1,'movement-select').example,/M 6″.*roll of 4.*10″/);
 assert.notDeepEqual(lesson(1,'movement-select').glossary,lesson(2,'shooting-select').glossary);
});
test('maintained step edits take priority over built-in friendly rewrites and worked examples',()=>{
 const s=state(2);L.stepOverrides.set('shooting-attacks',{body:'Administrator updated these attack instructions.',why:'Updated reasoning.'});
 const step=A.steps(s).find(x=>x.id==='shooting-attacks'),lesson=L.learningStep(step,s);
 assert.equal(lesson.intro,step.body);assert.equal(lesson.why,step.why);assert.equal(lesson.example,'');assert.ok(!lesson.actions.some(a=>a.includes('Ballistic Skill')));
});
