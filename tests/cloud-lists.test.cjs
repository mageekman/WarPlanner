const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/cloud-lists.js');
const army=name=>({name,faction:'Aeldari',detachment:'Warhost',units:[{id:'one',name:'Farseer',details:[]}],originalExport:name});
const list=(id,name)=>({id,army:army(name),warnings:[],renames:{}});
function backend(seed=[]){
 const rows=new Map(seed.map(r=>[r.user_id+':'+r.list_id,structuredClone(r)]));let writes=0,fail=false,hook=null;
 function client(owner){return {from(){let operation='read',values,filters=[],range=null;
 const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},order(){return query;},range(from,to){range=[from,to];return query;},insert(v){operation='insert';values=v;return query;},update(v){operation='update';values=v;return query;},single:()=>run(true),maybeSingle:()=>run(true),then:(resolve,reject)=>run(false).then(resolve,reject)};
 async function run(single){
  if(operation!=='read'){writes++;if(fail){fail=false;return {error:{message:'Offline'}};}if(hook){const h=hook;hook=null;await h();}}
  if(operation==='insert'){
   if(values.user_id!==owner)return {error:{code:'42501'}};const key=owner+':'+values.list_id;
   if(rows.has(key))return {error:{code:'23505'}};rows.set(key,structuredClone(values));return {data:structuredClone(values)};
  }
  let matches=[...rows.values()].filter(r=>r.user_id===owner&&filters.every(([k,v])=>r[k]===v));
  if(operation==='read'&&range)matches=matches.slice(range[0],range[1]+1);
  if(operation==='update')for(const row of matches)Object.assign(row,structuredClone(values));
  return {data:structuredClone(single?(matches[0]||null):matches)};
 }
 return query;}};}
 return {rows,client,get writes(){return writes;},failNext(){fail=true;},beforeWrite(fn){hook=fn;}};
}
const row=(id,name,revision=1)=>({user_id:'owner',list_id:id,...C.payload(list(id,name)),revision});
test('fresh devices load the same account library without creating writes',async()=>{
 const b=backend([row('a','Aspects'),row('b','Wraiths')]);
 const first=await C.create(b.client('owner'),'owner').load();const second=await C.create(b.client('owner'),'owner').load();
 assert.deepEqual(first.lists.map(l=>l.army.name),['Aspects','Wraiths']);assert.deepEqual(first.lists,second.lists);assert.equal(b.writes,0);
 assert.equal((await C.create(b.client('other'),'other').load()).lists.length,0);
});
test('device migration deduplicates identical lists and adds all unique local imports idempotently',async()=>{
 const b=backend([row('list-1','Aspects')]);const drafts=[list('list-1','Aspects'),list('local-two','Bikes')];
 const first=await C.create(b.client('owner'),'owner').load(drafts);assert.equal(first.lists.length,2);
 const second=await C.create(b.client('owner'),'owner').load(drafts);assert.equal(second.lists.length,2);assert.equal(b.writes,1);
});
test('stale clean caches use the server version while unsaved conflicts are recovered separately',async()=>{
 const b=backend([row('a','Old')]);const old=(await C.create(b.client('owner'),'owner').load()).lists[0];
 b.rows.set('owner:a',row('a','New server',2));
 const clean=await C.create(b.client('owner'),'owner').load([old]);assert.equal(clean.lists.length,1);assert.equal(clean.lists[0].army.name,'New server');
 old.army.name='Local edit';const recovered=await C.create(b.client('owner'),'owner').load([old]);
 assert.equal(recovered.lists.length,2);assert.equal(b.rows.get('owner:a').army.name,'New server');assert.ok(recovered.lists.some(l=>l.army.name==='Local edit (Recovered copy)'));
});
test('imports save to the account and navigation does not produce repeated writes',async()=>{
 const b=backend(),service=C.create(b.client('owner'),'owner');await service.load();const draft=list('a','Aspect Host');
 service.schedule([draft]);await service.flush();assert.equal(b.rows.get('owner:a').army.name,'Aspect Host');
 for(let i=0;i<10;i++)service.schedule([draft]);await service.flush();assert.equal(b.writes,1);
});
test('a change reverted during an in-flight save still finishes with the latest content',async()=>{
 const b=backend([row('a','Aspects')]),service=C.create(b.client('owner'),'owner');const original=(await service.load()).lists[0];
 let release;const waiting=new Promise(r=>release=r);b.beforeWrite(()=>waiting);
 const changed=structuredClone(original);changed.renames.one='Renamed';service.schedule([changed]);
 service.schedule([original]);release();await service.flush();assert.deepEqual(b.rows.get('owner:a').renames,{});assert.equal(b.rows.get('owner:a').revision,3);
});
test('failed writes remain pending and Retry saves the draft without duplicates',async()=>{
 const b=backend(),statuses=[],service=C.create(b.client('owner'),'owner',{status:s=>statuses.push(s)});await service.load();
 b.failNext();service.schedule([list('a','Aspects')]);await assert.rejects(service.flush());assert.equal(service.dirty,true);assert.equal(statuses.at(-1),'error');assert.equal(b.rows.size,0);
 await service.flush();assert.equal(b.rows.size,1);assert.equal(service.dirty,false);assert.equal(statuses.at(-1),'saved');
});
test('concurrent device changes preserve the server row and save a recovered copy',async()=>{
 const b=backend([row('a','Aspects')]),saved=[],service=C.create(b.client('owner'),'owner',{saved:r=>saved.push(r)});const local=(await service.load()).lists[0];
 b.rows.set('owner:a',row('a','Other device',2));local.renames.one='Local label';service.schedule([local]);await service.flush();
 assert.equal(b.rows.get('owner:a').army.name,'Other device');assert.equal(b.rows.size,2);assert.equal(saved[0].remote.army.name,'Other device');assert.equal(saved[0].list.renames.one,'Local label');
});
test('disposing a session prevents pending account callbacks after switching users',async()=>{
 const b=backend(),notifications=[],service=C.create(b.client('owner'),'owner',{saved:r=>notifications.push(r)});await service.load();
 let release;const gate=new Promise(r=>release=r);b.beforeWrite(()=>gate);service.schedule([list('a','Aspects')]);const done=service.flush();service.dispose();release();await done;assert.equal(notifications.length,0);
 assert.equal((await C.create(b.client('other'),'other').load()).lists.length,0);
});

test('account libraries page beyond the first API batch without truncating lists',async()=>{
 const b=backend(Array.from({length:250},(_,i)=>row('list-'+i,'Roster '+i)));const loaded=await C.create(b.client('owner'),'owner').load();
 assert.equal(loaded.lists.length,250);assert.equal(b.writes,0);
});
