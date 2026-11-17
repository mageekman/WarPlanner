const test=require('node:test'),assert=require('node:assert/strict'),C=require('../dist/content.js'),A=require('../dist/activations.js');
const base=C.seed().find(r=>r.kind==='rule'&&r.data.category==='ability');
function rule(id,phase,window,turn='either'){return {...structuredClone(base),key:'rule:'+id,name:id,faction:'Aeldari',data:{...structuredClone(base.data),id,name:id,faction:'Aeldari',units:['Falcon'],category:'ability',phase,window,turn,conditions:[],sourceIds:[],summary:'Check the rule trigger and conditions.',expanded:true,sourceRuleId:id,guideShared:true}};}
test.beforeEach(()=>{global.WarPlannerContent=C;});test.afterEach(()=>{C.reset();delete global.WarPlannerContent;});
const rows=[rule('any-phase-rule',[0,1,2,3,4],'act'),rule('shooting-reaction',[2],'react','opponent'),rule('selected-to-shoot',[2],'select'),rule('shooting-action',[2],'act')];
function state(turn='you',phase=2){return {army:{faction:'Aeldari',units:[{id:'falcon',name:'Falcon',details:[]}]},phase,turn,round:1};}
const ids=deck=>[...deck.shared,...deck.unitCards.flatMap(c=>c.items)].map(c=>c.id);
test.afterEach(()=>C.reset());
test('phase-wide rules move into Any time without moving selection or phase-specific actions',()=>{
 C.apply(rows);const s=state(),session=A.createSession();
 assert.deepEqual(ids(session.anyTime(s)).filter(id=>rows.some(r=>r.data.id===id)),['any-phase-rule']);
 assert.ok(!ids(session.stepDeck(s,{id:'act',window:'act'})).includes('any-phase-rule'));
 assert.ok(ids(session.stepDeck(s,{id:'act',window:'act'})).includes('shooting-action'));
 assert.ok(ids(session.stepDeck(s,{id:'select',window:'select'})).includes('selected-to-shoot'));
});
test('Any time honors reaction phase, turn, army membership and type filters',()=>{
 C.apply(rows);const session=A.createSession(),s=state('opponent');
 assert.ok(ids(session.anyTime(s)).includes('shooting-reaction'));assert.ok(!ids(session.stepDeck(s,{id:'act',window:'act'})).includes('shooting-reaction'));
 assert.ok(!ids(session.anyTime(state('you'))).includes('shooting-reaction'));
 assert.ok(!ids(session.anyTime(state('opponent',1))).includes('shooting-reaction'));
 assert.ok(!ids(session.anyTime({...s,guideRuleTypes:{ability:false}})).includes('shooting-reaction'));
 assert.ok(!ids(session.anyTime({...s,army:{faction:'Orks',units:[{id:'boyz',name:'Boyz',details:[]}]}})).includes('any-phase-rule'));
});
test('phase drawers are reused between steps and invalidate when the catalog changes',()=>{
 C.apply(rows);const session=A.createSession(),s=state(),first=session.anyTime(s);session.stepDeck(s,{id:'select',window:'select'});assert.equal(session.anyTime(s),first);
 C.apply(rows.map(r=>({...r,data:{...r.data,summary:'Updated condition'}})));assert.notEqual(session.anyTime(s),first);
});
