const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/cloud-lists.js');
const army=name=>({name,faction:'Aeldari',detachment:'Warhost',units:[{id:'one',name:'Farseer',details:[]}],originalExport:name});
const list=(id,name)=>({id,army:army(name),warnings:[],renames:{}});
function backend(seed=[]){
 const tombstones=new Map(),rows=new Map(seed.map(r=>[r.user_id+':'+r.list_id,structuredClone(r)]));let writes=0,fail=false,hook=null;
 function client(owner){return {from(name){const storage=name==='deleted_army_lists'?tombstones:rows;let operation='read',values,filters=[],range=null;
 const query={select(){return query;},eq(k,v){filters.push([k,v]);return query;},order(){return query;},range(from,to){range=[from,to];return query;},insert(v){operation='insert';values=v;return query;},update(v){operation='update';values=v;return query;},delete(){operation='delete';return query;},single:()=>run(true),maybeSingle:()=>run(true),then:(resolve,reject)=>run(false).then(resolve,reject)};
 async function run(single){
  if(operation!=='read'){writes++;if(fail){fail=false;return {error:{message:'Offline'}};}if(hook){const h=hook;hook=null;await h();}}
  if(operation==='insert'){
   if(values.user_id!==owner)return {error:{code:'42501'}};const key=owner+':'+values.list_id;
   if(tombstones.has(key))return {error:{code:'P0001',message:'saved_list_deleted'}};
   if(rows.has(key))return {error:{code:'23505'}};rows.set(key,structuredClone(values));return {data:structuredClone(values)};
  }
  let matches=[...storage.values()].filter(r=>r.user_id===owner&&filters.every(([k,v])=>r[k]===v));
  if(operation==='read'&&range)matches=matches.slice(range[0],range[1]+1);
  if(operation==='delete')for(const row of matches){rows.delete(owner+':'+row.list_id);tombstones.set(owner+':'+row.list_id,{user_id:owner,list_id:row.list_id});}
  if(operation==='update')for(const row of matches)Object.assign(row,structuredClone(values));
  return {data:structuredClone(single?(matches[0]||null):matches)};
 }
 return query;}};}
 return {rows,tombstones,client,get writes(){return writes;},failNext(){fail=true;},beforeWrite(fn){hook=fn;}};
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

test('deleting a list removes its account row and returns an empty library on another device',async()=>{
 const b=backend([row('a','Aspects')]),deleted=[],service=C.create(b.client('owner'),'owner',{deleted:id=>deleted.push(id)});await service.load();assert.equal(await service.remove('a'),'a');assert.equal(b.rows.size,0);assert.deepEqual(deleted,['a']);assert.ok(b.tombstones.has('owner:a'));assert.equal((await C.create(b.client('owner'),'owner').load()).lists.length,0);
});
test('old clean and dirty caches cannot recreate a deleted list, but a new import ID is allowed',async()=>{
 const b=backend([row('a','Aspects')]),s=C.create(b.client('owner'),'owner'),cached=(await s.load()).lists[0];await s.remove('a');
 const dirty=structuredClone(cached);dirty.army.name='Edited offline';for(const cache of [cached,dirty,list('a','Legacy cache')])assert.equal((await C.create(b.client('owner'),'owner').load([cache])).lists.length,0);
 const imported=await C.create(b.client('owner'),'owner').load([list('new-id','Aspects')]);assert.equal(imported.lists.length,1);assert.equal(imported.lists[0].id,'new-id');
});
test('a stale tab save notices deletion and does not create a recovered copy',async()=>{
 const b=backend([row('a','Aspects')]),removed=[],old=C.create(b.client('owner'),'owner',{deleted:id=>removed.push(id)}),cached=(await old.load()).lists[0];const second=C.create(b.client('owner'),'owner');await second.load();await second.remove('a');cached.renames.one='Stale edit';old.schedule([cached]);await old.flush();assert.equal(b.rows.size,0);assert.deepEqual(removed,['a']);assert.equal(old.dirty,false);
});
test('failed deletes keep the saved list available and can be retried',async()=>{
 const b=backend([row('a','Aspects')]),service=C.create(b.client('owner'),'owner');await service.load();b.failNext();await assert.rejects(()=>service.remove('a'));assert.ok(b.rows.has('owner:a'));assert.equal(b.tombstones.size,0);await service.remove('a');assert.equal(b.rows.size,0);
});
test('account deletion is owner scoped and cannot delete another account’s list',async()=>{
 const b=backend([row('a','Aspects')]),other=C.create(b.client('other'),'other');await other.load();await assert.rejects(()=>other.remove('a'),/confirm deletion/);assert.ok(b.rows.has('owner:a'));assert.equal(b.tombstones.size,0);
});
test('pending saves finish before deletion and navigation cannot reinsert the removed entry',async()=>{
 const b=backend([row('a','Aspects')]),service=C.create(b.client('owner'),'owner'),draft=(await service.load()).lists[0];draft.renames.one='New label';service.schedule([draft]);await service.remove('a');service.schedule([draft]);await service.flush();assert.equal(b.rows.size,0);assert.equal(service.dirty,false);
});
