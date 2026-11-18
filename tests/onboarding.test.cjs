const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(blockStorage=false,store=new Map()){
 const events={},dialog={open:false,innerHTML:'',setAttribute(){},querySelector(){return {focus(){}};},addEventListener(name,fn){events[name]=fn;},showModal(){this.open=true;},close(){this.open=false;}};
 const window={},document={body:{append(){}},createElement(){return dialog;},addEventListener(name,fn){events[name]=fn;}};
 vm.runInNewContext(fs.readFileSync('dist/onboarding.js','utf8'),{window,document,localStorage:{getItem(key){if(blockStorage)throw Error();return store.get(key);},setItem(key,value){if(blockStorage)throw Error();store.set(key,value);}}});
 return {api:window.WarPlannerOnboarding,dialog,store,click(action){events.click({target:{closest(){return {dataset:{onboarding:action}};}}});},escape(){events.cancel({preventDefault(){}});}};
}
test('first visit introduces the workflow, moves back and forward, and finishes once per account',()=>{
 const h=setup();h.api.setAccount('alice');assert.ok(h.dialog.open);assert.match(h.dialog.innerHTML,/Welcome to WarPlanner/);
 h.click('next');assert.match(h.dialog.innerHTML,/1. Bring your army/);h.click('back');assert.match(h.dialog.innerHTML,/Welcome to WarPlanner/);
 for(let i=0;i<3;i++)h.click('next');assert.match(h.dialog.innerHTML,/3. Take your list/);h.click('next');assert.equal(h.dialog.open,false);
 h.api.setAccount('alice');assert.equal(h.dialog.open,false);h.api.setAccount('bob');assert.ok(h.dialog.open);
});
test('skip and Escape persist dismissal, replay remains available and sign out closes without dismissing another account',()=>{
 const h=setup();h.api.setAccount('alice');h.escape();assert.equal(h.dialog.open,false);assert.equal(h.store.get('warplanner.onboarding.alice.v1'),'done');h.api.open();assert.ok(h.dialog.open);h.api.clear();assert.equal(h.dialog.open,false);h.api.setAccount('bob');assert.ok(h.dialog.open);h.click('close');assert.equal(h.dialog.open,false);
});
test('launch controls use existing app destinations and dismiss the walkthrough',()=>{
 const h=setup();h.api.setAccount('alice');h.click('next');assert.match(h.dialog.innerHTML,/data-action="import"/);assert.match(h.dialog.innerHTML,/data-action="create-list"/);h.click('next');assert.match(h.dialog.innerHTML,/data-view="practice"/);h.click('next');assert.match(h.dialog.innerHTML,/data-view="guide"/);h.click('launch');assert.equal(h.dialog.open,false);
});
test('unavailable storage does not break onboarding or repeat it during the same session',()=>{
 const h=setup(true);h.api.setAccount('alice');h.click('close');h.api.setAccount('alice');assert.equal(h.dialog.open,false);h.api.setAccount('bob');assert.ok(h.dialog.open);
});

test('dismissal survives a fresh session for every exit path and manual replay still works',()=>{
 for(const exit of ['close','escape','finish','launch']){
  const first=setup();first.api.setAccount('returning');
  if(exit==='escape')first.escape();else if(exit==='finish'){for(let i=0;i<4;i++)first.click('next');}else first.click(exit);
  first.api.clear();const returning=setup(false,first.store);returning.api.setAccount('returning');assert.equal(returning.dialog.open,false,exit);
  returning.api.open();assert.equal(returning.dialog.open,true);returning.click('close');returning.api.clear();returning.api.setAccount('returning');assert.equal(returning.dialog.open,false);
  returning.api.setAccount('different');assert.equal(returning.dialog.open,true);
 }
});
test('leaving without dismissing or completing onboarding keeps it available next session',()=>{
 const first=setup();first.api.setAccount('unfinished');first.click('next');first.api.clear();const next=setup(false,first.store);next.api.setAccount('unfinished');assert.equal(next.dialog.open,true);
});
