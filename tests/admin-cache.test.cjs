const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../dist/content.js'),W=require('../dist/workshop-browser.js'),L=require('../dist/lessons.js');
function harness(){
 const handlers={},window={WarPlannerContent:{...C,apply(){},reset(){}},WarPlannerWorkshopBrowser:W,WarPlanLessons:L,WarPlannerMechanics:require('../dist/mechanics.js')};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/admin.js'),'utf8'),{window,structuredClone,document:{addEventListener:(type,fn)=>handlers[type]=fn,querySelector:()=>null}});
 let reads=0,rows=C.seed();const service={isAdmin:true,version:1,get records(){reads++;return structuredClone(rows)},dispose(){this.isAdmin=false;this.version++;}};
 return {api:window.WarPlannerAdminPage,service,get reads(){return reads},update(){rows[0].name='Changed faction';service.version++;},click:dataset=>handlers.click({target:{closest:()=>({dataset})}})};
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
