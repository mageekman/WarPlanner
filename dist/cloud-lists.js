/* Account-owned list storage. Local copies are recovery drafts, never the source of truth. */
(function(root){
 'use strict';
 const fields='list_id,army,warnings,renames,revision';
 function stable(value){
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
 }
 function payload(list){return JSON.parse(JSON.stringify({army:list.army,warnings:list.warnings||[],renames:list.renames||{}}));}
 const fingerprint=list=>stable(payload(list));
 const fromRow=row=>({id:row.list_id,army:row.army,warnings:row.warnings,renames:row.renames,cloudRevision:row.revision,cloudBase:fingerprint(row)});
 function hash(text){let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return (a>>>0).toString(16)+(b>>>0).toString(16);}
 function create(client,userId,callbacks={}){
  const known=new Map(),pending=new Map(),deleted=new Set(),deleting=new Set(),aliases=new Map();let activeWrite=null,running=null,closed=false,failed=false,loaded=false;
  const notify=state=>{if(!closed)callbacks.status?.(state);};
  function table(){return client.from('saved_army_lists');}
  async function read(id){const {data,error}=await table().select(fields).eq('user_id',userId).eq('list_id',id).maybeSingle();if(error)throw error;return data?fromRow(data):null;}
  async function isDeleted(id){
   if(deleted.has(id))return true;
   const {data,error}=await client.from('deleted_army_lists').select('list_id').eq('user_id',userId).eq('list_id',id).maybeSingle();
   if(error)throw error;if(data)deleted.add(id);return !!data;
  }
  async function insert(list){
   const {data,error}=await table().insert({user_id:userId,list_id:list.id,...payload(list),revision:1}).select(fields).single();
   if(!error)return fromRow(data);
   if(error.code==='23505'){const existing=await read(list.id);if(existing&&fingerprint(existing)===fingerprint(list))return existing;}
   throw error;
  }
  async function recover(list,remote){
   if(await isDeleted(list.id))return {deletedId:list.id};
   const copy={...list,id:String(list.id).slice(0,100)+'-recovered-'+hash(fingerprint(list)),army:{...list.army,name:list.army.name+' (Recovered copy)'}};
   const saved=await insert(copy);return {list:saved,remote,previousId:list.id};
  }
  async function writeCurrent(list){
   const old=known.get(list.id);
   if(!old){
    try{return {list:await insert(list),previousId:list.id};}
    catch(error){if(error.code!=='23505')throw error;return recover(list,await read(list.id));}
   }
   const {data,error}=await table().update({...payload(list),revision:old.cloudRevision+1,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('list_id',list.id).eq('revision',old.cloudRevision).select(fields).maybeSingle();
   if(error)throw error;
   if(data)return {list:fromRow(data),previousId:list.id};
   const remote=await read(list.id);
   if(remote&&fingerprint(remote)===fingerprint(list))return {list:remote,previousId:list.id};
   return recover(list,remote);
  }
  async function write(list){
   if(deleted.has(list.id))return {deletedId:list.id};
   try{return await writeCurrent(list);}catch(error){if(error.message?.includes('saved_list_deleted')&&await isDeleted(list.id))return {deletedId:list.id};throw error;}
  }
  function forget(id){deleted.add(id);known.delete(id);pending.delete(id);if(!closed)callbacks.deleted?.(id);}
  async function load(local=[]){
   for(let offset=0;;offset+=200){
    const {data,error}=await client.from('deleted_army_lists').select('list_id').eq('user_id',userId).order('list_id').range(offset,offset+199);if(error)throw error;if(closed)throw new Error('Account changed');
    for(const row of data||[])deleted.add(row.list_id);if((data||[]).length<200)break;
   }
   for(let offset=0;;offset+=200){
    const {data,error}=await table().select(fields).eq('user_id',userId).order('list_id').range(offset,offset+199);if(error)throw error;if(closed)throw new Error('Account changed');
    for(const row of data||[]){const list=fromRow(row);if(!deleted.has(list.id))known.set(list.id,list);}
    if((data||[]).length<200)break;
   }
   const idMap={};
   for(const draft of local){
    if(closed)throw new Error('Account changed');
    if(!draft?.id||!Array.isArray(draft.army?.units)||deleted.has(draft.id))continue;
    if(!known.has(draft.id)&&await isDeleted(draft.id))continue;
    const same=[...known.values()].find(list=>fingerprint(list)===fingerprint(draft));
    if(same){idMap[draft.id]=same.id;continue;}
    // A clean cache never overwrites a newer server version.
    if(draft.cloudBase===fingerprint(draft))continue;
    const remote=known.get(draft.id);let result;
    if(remote&&(!draft.cloudRevision||draft.cloudRevision!==remote.cloudRevision))result=await recover(draft,remote);
    else result=await write(draft);
    if(result.deletedId){deleted.add(result.deletedId);known.delete(result.deletedId);continue;}
    known.set(result.list.id,result.list);if(result.remote)known.set(result.remote.id,result.remote);idMap[draft.id]=result.list.id;
   }
   if(closed)throw new Error('Account changed');loaded=true;notify('saved');return {lists:structuredClone([...known.values()]),idMap};
  }
  function schedule(lists){
   if(closed||!loaded)return;
   for(const list of lists){if(deleted.has(list.id)||deleting.has(list.id))continue;const old=known.get(list.id);const baseline=activeWrite?.id===list.id?activeWrite:old;if(!baseline||fingerprint(baseline)!==fingerprint(list))pending.set(list.id,structuredClone(list));else pending.delete(list.id);}
   if(pending.size&&!failed)void flush().catch(()=>{});
  }
  function flush(){
   if(closed)return Promise.reject(new Error('Account changed'));
   if(running)return running;
   failed=false;
   running=(async()=>{
    while(pending.size&&!closed){
     notify('saving');const [id,list]=pending.entries().next().value;pending.delete(id);activeWrite=list;
     try{
      const result=await write(list);activeWrite=null;if(closed)return;
      if(result.deletedId){forget(result.deletedId);continue;}
      known.set(result.list.id,result.list);if(result.remote)known.set(result.remote.id,result.remote);
      if(result.list.id!==id){aliases.set(id,result.list.id);const next=pending.get(id);pending.delete(id);if(next)pending.set(result.list.id,{...next,id:result.list.id,army:{...next.army,name:result.list.army.name}});}
      callbacks.saved?.(structuredClone(result));
      const queued=pending.get(result.list.id);if(queued&&fingerprint(queued)===fingerprint(result.list))pending.delete(result.list.id);
     }catch(error){activeWrite=null;if(!pending.has(id))pending.set(id,list);failed=true;notify('error');throw error;}
    }
    if(!closed)notify('saved');
   })().finally(()=>{running=null;});
   return running;
  }
  async function remove(id){
   if(closed)throw new Error('Account changed');
   await flush();if(closed)throw new Error('Account changed');
   while(aliases.has(id))id=aliases.get(id);
   if(deleted.has(id)){forget(id);return id;}
   deleting.add(id);pending.delete(id);notify('saving');
   try{
    const {data,error}=await table().delete().eq('user_id',userId).eq('list_id',id).select('list_id');if(error)throw error;
    if(!data?.length&&!await isDeleted(id))throw new Error('Could not confirm deletion. Reload and try again.');
    if(closed)throw new Error('Account changed');forget(id);notify(pending.size?'saving':'saved');return id;
   }finally{deleting.delete(id);if(!closed&&!pending.size)notify(failed?'error':'saved');}
  }
  return {load,schedule,flush,remove,dispose(){closed=true;pending.clear();},get dirty(){return pending.size>0||!!running||deleting.size>0;},get failed(){return failed;}};
 }
 const api={create,fingerprint,payload};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerCloudLists=api;
})(typeof window!=='undefined'?window:globalThis);
