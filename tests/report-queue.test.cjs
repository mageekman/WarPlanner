const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(require.resolve('../dist/report-ui.js'),'utf8'),flush=()=>new Promise(resolve=>setImmediate(resolve));
const report=(id,status='pending')=>({id,status,entity_name:'Report '+id,issue_type:'summary',faction:'Aeldari',created_at:'2026-11-14T12:00:00Z',context:{},change_text:'Replacement '+id});
function harness(reports){
 const listeners={},calls=[],saved={entry:{key:'rule:example',revision:2}},service={isAdmin:true,records:[],async listReports(status){calls.push(['list',status]);return structuredClone(reports);},async reload(){calls.push(['reload']);},async reviewReport(r,decision,proposal,mode){calls.push(['review',r.id,decision,mode]);r=reports.find(x=>x.id===r.id);r.status=decision==='approve'?'approved':'rejected';return {...saved,report:structuredClone(r)};}};
 const document={hidden:false,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(name,handler)=>(listeners[name]??=[]).push(handler)};
 const window={WarPlannerRuleReports:{types:{summary:'Rules Summary'},windows:{},directReviewReason:()=>'',proposal:()=>({key:'rule:example'})},WarPlannerContent:{apply:()=>calls.push(['apply'])},WarPlannerAdminPage:{openReport:()=>true,discardReport(){}},refreshWarPlannerContent(){},addEventListener(){}};
 vm.runInNewContext(code,{window,document,setInterval:()=>1,clearInterval(){},structuredClone,Date,Map,WeakMap});
 const ui=window.WarPlannerReports;ui.setService(service);
 async function click(action,id){for(const handler of listeners.click||[])await handler({target:{closest:()=>({dataset:{reportAction:action,reportId:id}})}});}
 return {ui,service,calls,click};
}
test('the workshop displays only pending reports and never offers a reviewed-history view',async()=>{
 const h=harness([report('pending'),report('accepted','approved'),report('rejected','rejected')]);await flush();assert.equal(h.ui.count(),1);assert.match(h.ui.queueHTML(),/Report pending/);assert.doesNotMatch(h.ui.queueHTML(),/Report accepted|Report rejected|data-report-queue-mode|report-resolution/);assert.deepEqual(h.calls.filter(c=>c[0]==='list'),[['list','pending']]);
});
test('approval and rejection remove reports immediately and keep them absent after reloading',async()=>{
 const rows=[report('approve'),report('reject')],h=harness(rows);await flush();await h.click('approve','approve');assert.equal(h.ui.count(),1);assert.doesNotMatch(h.ui.queueHTML(),/Report approve</);await h.click('reject','reject');assert.equal(h.ui.count(),0);assert.match(h.ui.queueHTML(),/No pending reports/);assert.deepEqual(rows.map(r=>r.status),['approved','rejected']);assert.equal(rows.length,2);await h.ui.reload();assert.equal(h.ui.count(),0);assert.doesNotMatch(h.ui.queueHTML(),/report-card/);
});
test('approving an edited proposal also removes the report and clears its review banner',async()=>{
 const rows=[report('edited')],h=harness(rows);await flush();await h.click('edit','edited');assert.equal(h.ui.editing.id,'edited');await h.ui.approveEdited({key:'rule:edited'});assert.equal(h.ui.count(),0);assert.equal(h.ui.editing,null);assert.equal(h.ui.reviewBanner(),'');assert.ok(h.calls.some(c=>c[0]==='review'&&c[3]==='edited'));
});
test('a failed review keeps the pending report available for retry',async()=>{
 const h=harness([report('retry')]);await flush();h.service.reviewReport=async()=>{throw Error('Save failed');};await h.click('approve','retry');assert.equal(h.ui.count(),1);assert.match(h.ui.queueHTML(),/Report retry/);assert.match(h.ui.queueHTML(),/Save failed/);
});
test('a successful approval stays removed even when refreshing the catalog fails',async()=>{
 const rows=[report('saved')],h=harness(rows);await flush();h.service.reload=async()=>{throw Error('Offline');};await h.click('approve','saved');assert.equal(rows[0].status,'approved');assert.equal(h.ui.count(),0);assert.match(h.ui.queueHTML(),/Report approved, but the rules could not refresh/);await h.ui.reload();assert.equal(h.ui.count(),0);
});
test('stale polling cannot put a resolved report back and no new poll starts during review',async()=>{
 const rows=[report('raced')],h=harness(rows);await flush();let finishPoll,finishReview,polls=0;
 h.service.listReports=()=>{polls++;return new Promise(resolve=>finishPoll=resolve);};const poll=h.ui.reload();
 h.service.reviewReport=()=>new Promise(resolve=>finishReview=()=>{rows[0].status='approved';resolve({report:structuredClone(rows[0]),entry:{key:'rule:x'}});});const review=h.click('approve','raced');await flush();await h.ui.reload();assert.equal(polls,1);finishReview();await review;assert.equal(h.ui.count(),0);finishPoll([report('raced')]);await poll;assert.equal(h.ui.count(),0);
});
