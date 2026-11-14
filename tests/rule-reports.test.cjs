const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../dist/rule-reports.js'),C=require('../dist/content.js'),A=require('../dist/activations.js'),{sample}=require('../dist/core.js');
const records=C.seed().map(r=>({...r,revision:1})),report=(overrides={})=>({id:'11111111-1111-4111-8111-111111111111',entity_key:'rule:walker',base_revision:1,issue_type:'summary',change_text:'Replacement study summary',status:'pending',faction:'Aeldari',context:{turn:'you'},...overrides});
test.afterEach(()=>C.reset());
test('guide report choices match the current displayed cards, deduplicate units and include the core page',()=>{
 C.apply(records);const state={army:sample,phase:2,turn:'you',firstPlayer:'you'},active=A.steps(state)[1],deck=A.flashcards(state,active),page=R.pageContext(state,active,deck,records);
 assert.ok(page.options.some(o=>o.key==='rule:walker'));assert.ok(page.options.some(o=>o.name==='War Walkers'&&o.group==='Units'));assert.ok(page.options.some(o=>o.key==='step:'+active.id));assert.equal(new Set(page.options.map(o=>o.key)).size,page.options.length);
 assert.ok(!('army' in page.context));assert.ok(!('originalExport' in page.context));assert.equal(page.context.faction,'Aeldari');
 const empty=R.pageContext(state,active,{unitCards:[],shared:[]},records);assert.equal(empty.options.length,1);
});
test('summary approval changes one field and keeps the original immutable',()=>{const before=JSON.stringify(records),p=R.proposal(report(),records);assert.equal(p.data.summary,'Replacement study summary');assert.equal(p.data.window,'after');assert.equal(p.data.adminManaged,true);assert.equal(JSON.stringify(records),before);assert.equal(R.directReviewReason(report(),records),'');C.validate(p);});
test('target and timing proposals retain rule mechanics and map to exact editable fields',()=>{
 const target=R.proposal(report({issue_type:'targets',change_text:'One enemy unit hit by this unit'}),records);assert.equal(target.data.targetText,'One enemy unit hit by this unit');assert.notEqual(target.data.summary,'One enemy unit hit by this unit');
 const timing={window:'select',phase:[1,2],turn:'either'},p=R.proposal(report({issue_type:'timing',timing}),records);assert.deepEqual(p.data.phase,[1,2]);assert.equal(p.data.window,'select');assert.equal(p.data.turn,'either');assert.notEqual(p.data.summary,'Replacement study summary');
});
test('core summary reports update page instructions, never their stable identity',()=>{const r=report({entity_key:'step:turn-start'}),p=R.proposal(r,records);assert.equal(p.data.body,r.change_text);assert.equal(p.data.id,'turn-start');assert.equal(R.directReviewReason(r,records),'');assert.match(R.directReviewReason({...r,issue_type:'targets'},records),/Edit/);});
test('ambiguous, missing and stale reports require editor review',()=>{
 assert.match(R.directReviewReason(report({issue_type:'other'}),records),/Edit/);assert.match(R.directReviewReason(report({entity_key:records.find(r=>r.kind==='unit').key}),records),/Edit/);
 assert.match(R.directReviewReason(report({base_revision:2}),records),/changed/);assert.match(R.directReviewReason(report({status:'approved'}),records),/Already/);
 const r=report({entity_key:null,base_revision:null,issue_type:'missing',missing_name:'Missing rule'}),p=R.proposal(r,records);assert.match(R.directReviewReason(r,records),/Edit/);assert.equal(p.revision,0);assert.equal(p.data.referenceOnly,true);assert.deepEqual(p.data.phase,[]);assert.deepEqual(p.data.units,[]);assert.equal(p.data.summary,r.change_text);C.validate(p);
});
test('report validation rejects missing selections, oversized or empty text and malformed timing',()=>{
 assert.throws(()=>R.validateSubmission(report({change_text:' '})));assert.throws(()=>R.validateSubmission(report({change_text:'x'.repeat(5001)})));assert.throws(()=>R.validateSubmission(report({base_revision:0})));assert.throws(()=>R.validateSubmission(report({issue_type:'missing',missing_name:''})));assert.throws(()=>R.validateSubmission(report({issue_type:'timing',timing:{window:'after',turn:'you',phase:[5]}})));
 R.validateSubmission(report({issue_type:'timing',timing:{window:'after',turn:'you',phase:[2]}}));
});
function client(admin){const calls=[];return {calls,from(table){return {select(){return this;},eq(){return this;},neq(){return this;},order(){return this;},maybeSingle(){return Promise.resolve({data:admin?{user_id:'owner'}:null});},range(){return Promise.resolve({data:table==='rules_catalog'?records:[]});}};},async rpc(name,args){calls.push({name,args});return {data:{id:args.payload.id}};}};}
test('reports service exposes submission to players but gates admin queue and review',async()=>{const cl=client(false),service=await C.create(cl,'player').load();await service.submitReport(report());assert.equal(cl.calls[0].name,'submit_rule_report');await assert.rejects(()=>service.listReports(),/Administrator/);await assert.rejects(()=>service.reviewReport(report(),'reject'),/Administrator/);service.dispose();await assert.rejects(()=>service.submitReport(report()),/ended/);});
test('admin review RPC passes expected revision and explicit edit mode',async()=>{const cl=client(true),service=await C.create(cl,'owner').load(),p=R.proposal(report(),records);await service.reviewReport(report(),'approve',p,'edited');const call=cl.calls[0];assert.equal(call.name,'review_rule_report');assert.equal(call.args.payload.expected_revision,1);assert.equal(call.args.payload.mode,'edited');assert.equal(call.args.payload.proposal.data.summary,'Replacement study summary');assert.deepEqual(await service.listReports(),[]);});

test('untrusted timing reports cannot inject unrelated rule fields or crash review checks',()=>{
 const timing={window:'after',phase:[2],turn:'you',summary:'Injected summary',units:['Other unit']};const p=R.proposal(report({issue_type:'timing',timing}),records);assert.notEqual(p.data.summary,'Injected summary');assert.deepEqual(p.data.units,['War Walkers']);assert.match(R.directReviewReason(report({issue_type:'timing',timing:{window:'after',phase:1,turn:'you'}}),records),/Invalid report/);assert.throws(()=>R.proposal(report({issue_type:'toString'}),records));
});
