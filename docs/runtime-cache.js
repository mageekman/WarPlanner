/* Account-scoped, version-checked catalog cache. Failure only disables caching. */
(function(root){
 'use strict';
 let connection;
 function open(){
  if(!root.indexedDB)return Promise.resolve(null);
  if(!connection)connection=new Promise(resolve=>{
   const request=root.indexedDB.open('warplanner-runtime-v1',1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('catalogs'))request.result.createObjectStore('catalogs');};
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
   request.onerror=request.onblocked=()=>{connection=null;resolve(null);};
  });
  return connection;
 }
 async function access(mode,key,value){
  try{const db=await open();if(!db)return null;return await new Promise(resolve=>{
   const tx=db.transaction('catalogs',mode),store=tx.objectStore('catalogs');let result=null;
   const request=mode==='readonly'?store.get(key):value===undefined?store.delete(key):store.put(value,key);
   request.onsuccess=()=>{result=request.result??null;};
   tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>resolve(null);
  });}catch{return null;}
 }
 root.WarPlannerRuntimeCache={get:key=>access('readonly',key),put:(key,value)=>access('readwrite',key,value),remove:key=>access('readwrite',key)};
})(typeof window!=='undefined'?window:globalThis);
