const test=require('node:test'),assert=require('node:assert/strict'),C=require('../dist/content.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),{sample}=require('../dist/core.js');
const marine=require('./fixtures/marines-audit-before.json');
function compare(army){
 const session=A.createSession();let pages=0;
 for(const turn of ['you','opponent'])for(let phase=0;phase<5;phase++){
  const state={army,phase,turn,round:1,firstPlayer:'you',guideShowCoreStratagems:true,guideShowDeepStrike:true};
  for(const step of A.steps(state)){assert.deepEqual(session.deck(state,step),A.flashcards(state,step),`${army.faction} ${turn} ${phase} ${step.id}`);pages++;}
 }
 return pages;
}
test('army-scoped preparation preserves every card and target across a full round',()=>{
 C.apply(marine);try{
  assert.ok(compare(sample)>30);
  const army={faction:'Space Marines',detachment:'Gladius Task Force',units:['Captain','Intercessor Squad','Infiltrator Squad','Bladeguard Veteran Squad','Impulsor'].map((name,i)=>({id:'unit-'+i,name,details:[],group:'',role:''}))};assert.ok(compare(army)>30);
 }finally{C.reset();}
});
test('cached army candidates rebuild after roster or preference changes',()=>{
 const army=structuredClone(sample),s={army,phase:2,turn:'you',round:1,firstPlayer:'you'},session=A.createSession(),step=A.steps(s)[1];
 session.deck(s,step);army.units=[];assert.deepEqual(session.deck(s,step),A.flashcards(s,step));
 s.army=structuredClone(sample);s.guideRuleTypes={ability:false};assert.deepEqual(session.deck(s,step),A.flashcards(s,step));
 s.guideRuleTypes={};s.guideShowCoreStratagems=true;assert.deepEqual(session.deck(s,step),A.flashcards(s,step));
 session.reset();assert.deepEqual(session.deck(s,step),A.flashcards(s,step));
});
