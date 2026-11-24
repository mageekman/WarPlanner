const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),S=require('../scripts/split-ynnari.cjs'),C=require('../dist/content.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),P=require('../dist/practice.js'),Print=require('../dist/guide-print.js');
const before=require('./fixtures/ynnari-split-before.json'),hash='a'.repeat(64),plan=()=>S.split(before,{sourceHash:hash});
const army=detachment=>({name:'Ynnari test',faction:'Aeldari',detachment:detachment||'Devoted of Ynnead',units:[{id:'avengers',name:'Dire Avengers',details:[],role:'',group:''},{id:'spiders',name:'Warp Spiders',details:[],role:'',group:''}]});
const state=(phase,turn,detachment)=>({army:army(detachment),phase,turn,firstPlayer:'you',round:1});
test.afterEach(()=>C.reset());
function names(deck){return [...deck.shared,...deck.unitCards.flatMap(u=>u.items)].map(r=>r.name);}
test('split retains the parent reference, imported mechanics and mustering conditions without mutating its input',()=>{
 const old=JSON.stringify(before),rows=plan(),parent=rows.find(r=>r.key===S.parentKey),original=before.find(r=>r.key===S.parentKey);
 assert.equal(rows.length,5);rows.forEach(C.validate);assert.equal(JSON.stringify(before),old);assert.deepEqual(parent.data.importSource,original.data.importSource);assert.deepEqual(parent.data.conditions,original.data.conditions);assert.equal(parent.enabled,true);assert.equal(parent.data.referenceOnly,true);assert.deepEqual(parent.data.phase,[]);assert.equal(parent.data.window,'prebattle');
 assert.equal(parent.data.summaryAudit.summaryHash,crypto.createHash('sha256').update(parent.data.summary).digest('hex'));
 const det=rows.find(r=>r.key===S.detachmentKey);assert.ok(det.data.rules.includes('strength-from-death-aeldari'));for(const row of rows.slice(2))assert.ok(det.data.rules.includes(row.data.sourceRuleId));
});
test('each option appears only at its source trigger in both Quick and Learn modes',()=>{
 C.apply(plan());for(const guideMode of ['quick','learn'])for(const turn of ['you','opponent'])for(let phase=0;phase<5;phase++){
  const s={...state(phase,turn),guideMode},session=A.createSession();assert.ok(!names(session.anyTime(s)).includes('Strength from Death'));
  const found=[];for(const step of A.steps(s)){const deck=session.stepDeck(s,step),all=names(deck);assert.ok(!all.includes('Strength from Death'));for(const r of deck.shared.filter(r=>r.name.startsWith('Lethal '))){found.push(r.name);if(r.name==='Lethal Intent')assert.equal(step.window,'end');if(r.name==='Lethal Reprisal')assert.equal(step.window,'start');if(r.name==='Lethal Surge')assert.ok(step.activationMode);}}
  assert.equal(found.includes('Lethal Intent'),phase===2&&turn==='opponent');assert.equal(found.includes('Lethal Surge'),phase===2&&turn==='opponent');assert.equal(found.includes('Lethal Reprisal'),phase===4);
 }
});
test('other detachments and army-rule filters cannot inherit the split reminders',()=>{
 C.apply(plan());for(const s of [state(2,'opponent','Aspect Host'),{...state(2,'opponent'),guideRuleTypes:{army:false}}]){const session=A.createSession();for(const step of A.steps(s))assert.ok(!names(session.stepDeck(s,step)).some(n=>n.startsWith('Lethal ')));}
});
test('distinct target restrictions and the Fade Back replacement are preserved',()=>{
 const [intent,surge,reprisal]=plan().slice(2).map(r=>r.data);assert.match(intent.targetText,/INFANTRY or MOUNTED/);assert.equal(intent.targeting.range,null);assert.deepEqual(intent.targeting.requiredKeywords,['Ynnari']);assert.match(intent.targeting.conditions.join(' '),/6 inches/);
 assert.match(surge.summary,/Once per turn/);assert.match(surge.summary,/replace.*Normal move.*surge move/);assert.match(surge.conditions.join(' '),/does not independently grant a move/);assert.match(surge.conditions.join(' '),/token cost/);assert.match(reprisal.summary,/below Starting Strength/);assert.deepEqual(reprisal.targeting.excludedKeywords,['Titanic']);
 for(const r of [intent,surge,reprisal])assert.equal(r.targeting.reviewKey,C.targetingReviewKey(r));
});
test('parent remains in the army reference and the PDF prints separate option names',()=>{
 C.apply(plan());const reference=L.catalog.rules.find(r=>r.id==='strength-from-death-aeldari');assert.ok(reference);assert.equal(reference.referenceOnly,true);
 const html=Print.build(state(2,'opponent'));for(const name of ['Lethal Intent','Lethal Surge','Lethal Reprisal'])assert.ok(html.includes(name));assert.ok(!html.includes('<h4>Strength from Death</h4>'));
});
test('timing quiz metadata excludes the composite parent and contextual Fade Back modifier',()=>{
 C.apply(plan());const r=L.abilities.filter(r=>r.splitAudit);assert.equal(r.find(r=>r.name==='Lethal Surge').timingAudit.quizEligible,false);
 for(const build of [P.buildBank,P.buildOpponentBank]){const bank=build({faction:'Aeldari',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(!bank.questions.some(q=>q.mode==='timing'&&['Strength from Death','Lethal Surge'].includes(q.review.rule.name)));}
});
