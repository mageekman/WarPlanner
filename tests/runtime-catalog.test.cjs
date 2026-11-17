const test=require('node:test'),assert=require('node:assert/strict'),C=require('../dist/content.js');
const base=C.seed().find(r=>r.kind==='rule'&&r.enabled),make=(id='runtime-test')=>({...structuredClone(base),key:'rule:'+id,revision:1,data:{...structuredClone(base.data),id}});
function setup({admin=false,cache=new Map(),id='one'}={}){
 let revision='v1',rows=[make()],full=rows.map(r=>({...structuredClone(r),data:{...r.data,importSource:{text:'original provenance'}}})),pageError=null;
 const calls=[];const client={supabaseUrl:'https://test.invalid',from(table){return {select(){return this},eq(){return this},order(){return this},maybeSingle:async()=>({data:admin?{user_id:id}:null}),range:async()=>{calls.push('full');return {data:structuredClone(full),count:full.length}}}},async rpc(name,args){calls.push(name);if(name==='runtime_catalog_manifest')return {data:{format:1,version:revision,count:rows.length,excludedKeys:['rule:'+base.data.id]}};if(pageError)return {error:pageError};return {data:{version:revision,rows:structuredClone(rows.slice(args.page_start,args.page_start+args.page_size))}};}};
 const storage={get:async k=>structuredClone(cache.get(k)),put:async(k,v)=>{cache.set(k,structuredClone(v))},remove:async k=>{cache.delete(k)}};
 return {client,calls,storage,cache,service:C.create(client,id,{runtime:true,cache:storage}),change(){revision='v2';rows=[make('new-rule')];},fail(error){pageError=error},set rows(value){rows=value},set full(value){full=value}};
}
test('runtime load avoids full Workshop reads; excluded bundled records cannot reappear',async()=>{
 const h=setup();await h.service.load();assert.equal(h.service.workshopReady,false);assert.ok(!h.calls.includes('full'));h.service.applyToLibrary();const L=require('../dist/lessons.js');assert.ok(!L.abilities.some(a=>a.id===base.data.id));assert.ok(L.abilities.some(a=>a.id==='runtime-test'));C.reset();
 await assert.rejects(h.service.ensureWorkshop(),/Administrator/);h.service.dispose();
});
test('warm loads verify the current version before using an account-scoped cache',async()=>{
 const cache=new Map(),a=setup({cache});await a.service.load();await new Promise(r=>setImmediate(r));
 const b=setup({cache});await b.service.load();assert.deepEqual(b.calls,['runtime_catalog_manifest']);
 const c=setup({cache,id:'other'});await c.service.load();assert.ok(c.calls.includes('runtime_catalog_page'));
 b.change();await b.service.load();assert.equal(b.service.records[0].data.id,'new-rule');assert.ok(b.calls.includes('runtime_catalog_page'));
});
test('corrupt and unavailable caches are replaced without blocking a fresh load',async()=>{
 const h=setup();await h.service.load();await new Promise(r=>setImmediate(r));const key=[...h.cache.keys()][0];h.cache.get(key).rows[0].enabled=false;h.calls.length=0;await h.service.load();assert.ok(h.calls.includes('runtime_catalog_page'));
 const failure=async()=>{throw Error('storage blocked')};const service=C.create(h.client,'blocked',{runtime:true,cache:{get:failure,put:failure,remove:failure}});await service.load();assert.equal(service.records.length,1);await new Promise(r=>setImmediate(r));
});
test('failed reload never publishes a partial new catalog',async()=>{
 const h=setup();await h.service.load();const before=h.service.records;h.change();h.fail({code:'XX001',message:'network failed'});await assert.rejects(h.service.load(),/network failed/);assert.deepEqual(h.service.records,before);
});
test('a revision change during paging restarts against one consistent manifest',async()=>{
 const h=setup();let page=0;const original=h.client.rpc;h.client.rpc=async(name,args)=>{if(name==='runtime_catalog_page'&&++page===1){h.change();return {error:{code:'40001',message:'changed'}};}return original(name,args)};await h.service.load();assert.equal(h.service.records[0].data.id,'new-rule');assert.equal(page,2);
});
test('admin editing waits for full records and retains source provenance',async()=>{
 const h=setup({admin:true});await h.service.load();await assert.rejects(h.service.save(h.service.records[0]),/Load the Workshop/);
 await Promise.all([h.service.ensureWorkshop(),h.service.ensureWorkshop()]);assert.equal(h.calls.filter(x=>x==='full').length,1);assert.equal(h.service.records[0].data.importSource.text,'original provenance');assert.equal(h.service.workshopReady,true);
});
test('disposed accounts cannot publish a catalog finishing in the background',async()=>{
 const h=setup();const rpc=h.client.rpc;let finish;h.client.rpc=async(name,args)=>{if(name==='runtime_catalog_page')await new Promise(r=>finish=r);return rpc(name,args)};const loading=h.service.load();while(!finish)await new Promise(r=>setImmediate(r));h.service.dispose();finish();await assert.rejects(loading,/session has ended/);assert.deepEqual(h.service.records,[]);
});
