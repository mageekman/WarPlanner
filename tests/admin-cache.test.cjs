const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../dist/content.js'),W=require('../dist/workshop-browser.js'),L=require('../dist/lessons.js');
function harness(){
 const handlers={},window={WarPlannerContent:{...C,apply(){},reset(){}},WarPlannerWorkshopBrowser:W,WarPlanLessons:L,WarPlanActivations:require('../dist/activations.js'),WarPlannerUnitProfiles:require('../dist/unit-profiles.js'),WarPlannerMechanics:require('../dist/mechanics.js')};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/admin.js'),'utf8'),{window,structuredClone,queueMicrotask:()=>{},document:{addEventListener:(type,fn)=>handlers[type]=fn,querySelector:()=>null}});
 let reads=0,rows=C.seed();const service={isAdmin:true,version:1,get records(){reads++;return structuredClone(rows)},dispose(){this.isAdmin=false;this.version++;}};
 return {replaceRows(next){rows=next;service.version++;},api:window.WarPlannerAdminPage,service,get reads(){return reads},input(target){handlers.input({target})},update(){rows[0].name='Changed faction';service.version++;},click:dataset=>handlers.click({target:{closest:()=>({dataset})}})};
}
test('Workshop navigation reuses a snapshot and reflects saved catalog revisions',async()=>{
 const h=harness();h.api.setService(h.service);h.api.render();await h.click({adminScope:'Aeldari'});h.api.render();await h.click({adminFolder:'rule'});h.api.render();h.api.render();assert.equal(h.reads,1);
 h.update();assert.match(h.api.render(),/Changed faction/);assert.equal(h.reads,2);
 h.api.setService(null);assert.match(h.api.render(),/Administrator access required/);
 const next={isAdmin:true,version:1,records:[],dispose(){}};h.api.setService(next);assert.doesNotMatch(h.api.render(),/Changed faction/);
});
test('services without version metadata keep reading fresh Workshop data',()=>{
 const h=harness();delete h.service.version;h.api.setService(h.service);const before=h.reads;h.api.render();h.api.render();assert.ok(h.reads>before+1);
});

test('late input events from a discarded Workshop form cannot leave the page falsely dirty',()=>{const h=harness();h.api.setService(h.service);h.api.discardReport();h.input({id:'',name:'summary',closest:()=>({})});assert.equal(h.api.hasDraft,false);assert.equal(h.api.canLeave(),true);});

test('guide editor resolves canonical rules, deduplicates choices and enforces admin access',async()=>{
 const h=harness();h.api.setService(h.service);
 const rows=h.service.records.filter(r=>r.kind==='rule'),one=rows[0],two=rows.find(r=>r.key!==one.key);
 assert.equal(h.api.openGuideRules([{id:one.data.id},{sourceCatalogKey:one.key}]),true);
 assert.match(h.api.renderGuideEditor(),/id="admin-content-form"/);assert.match(h.api.renderGuideEditor(),/Save to Workshop/);
 await h.click({adminAction:'cancel'});assert.equal(h.api.guideEditorActive,false);
 h.api.openGuideRules([{id:one.data.id},{id:two.data.id}]);assert.match(h.api.renderGuideEditor(),/Choose a rule to edit/);
 await h.click({guideRuleChoice:two.key});assert.match(h.api.renderGuideEditor(),/id="admin-content-form"/);
 h.service.isAdmin=false;assert.equal(h.api.openGuideRules([{id:one.data.id}]),false);assert.equal(h.api.renderGuideEditor(),'');
 h.api.setService(null);assert.equal(h.api.guideEditorActive,false);
});

test('guide edits follow shared aliases and allied source keys to their canonical Workshop entry',()=>{
 const h=harness(),rows=h.service.records,canonical=rows.find(r=>r.kind==='rule');
 const alias=structuredClone(canonical);alias.key='rule:legacy-alias';alias.name='Legacy copy';alias.enabled=false;alias.data.id='legacy-alias';alias.data.sharedRuleId=canonical.data.id;
 h.replaceRows([...rows,alias]);h.api.setService(h.service);
 h.api.openGuideRules([{id:'legacy-alias'}]);assert.match(h.api.renderGuideEditor(),new RegExp('value="'+canonical.data.id+'"'));
 h.api.leave();h.api.openGuideRules([{id:'projected-allied-rule',sourceCatalogKey:canonical.key}]);assert.match(h.api.renderGuideEditor(),new RegExp('value="'+canonical.data.id+'"'));
});
