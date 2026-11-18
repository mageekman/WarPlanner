/* Shareable tab URLs and browser history for static hosting. */
(function(root){
 'use strict';
 const pages={overview:{slug:'overview',label:'Study home'},guide:{slug:'guide',label:'Guided play'},army:{slug:'army',label:'My army'},practice:{slug:'practice',label:'Practice'},admin:{slug:'workshop',label:'Rules workshop'},account:{slug:'account',label:'My Account'}};
 const href=view=>'#/'+(pages[view]||pages.guide).slug;
 function read(hash){return Object.keys(pages).find(view=>hash===href(view)||hash===href(view)+'/')||null;}
 function create({window:win,getView,apply,canAccess=()=>true,canLeave=()=>true}){
  const supported=!!(win.location&&win.history?.pushState&&win.history?.replaceState);
  let ready=false,index=0,restoring=false;
  const returnKey='warplanner.return-page.v1';
  function remember(){if(!supported)return;const view=read(win.location.hash);if(view)try{win.sessionStorage?.setItem(returnKey,view);}catch{}}
  function pending(){try{const view=win.sessionStorage?.getItem(returnKey);return Object.hasOwn(pages,view)?view:null;}catch{return null;}}
  function forget(){try{win.sessionStorage?.removeItem(returnKey);}catch{}}
  const meta=()=>win.history.state?.warplannerPage;
  const validIndex=value=>Number.isSafeInteger(value)&&value>=0;
  const allowed=view=>Object.hasOwn(pages,view)&&canAccess(view);
  const title=view=>{if(win.document)win.document.title='WarPlanner — '+pages[view].label;};
  function write(view,replace){
   const prior=win.history.state;
   const entry={...(prior&&typeof prior==='object'?prior:{}),warplannerPage:{view,index}};
   win.history[replace?'replaceState':'pushState'](entry,'',href(view));
  }
  function start(){
   if(!supported)return;
   ready=false;restoring=false;
   index=validIndex(meta()?.index)?meta().index:0;
   const requested=read(win.location.hash);let view=requested||(!win.location.hash.startsWith('#/')?pending():null)||getView();
   if(!allowed(view)||!requested&&win.location.hash.startsWith('#/'))view='guide';
   apply(view,{source:'initial'});write(view,true);ready=true;forget();title(view);
  }
  function pause(){remember();ready=false;restoring=false;}
  function sync(){
   if(!supported||!ready||restoring)return;
   const view=allowed(getView())?getView():'guide';
   if(read(win.location.hash)!==view){index++;write(view,false);}
   else if(meta()?.view!==view||meta()?.index!==index)write(view,true);
   title(view);
  }
  function navigate(view){
   if(restoring||!allowed(view)||!canLeave(view))return false;
   if(supported&&ready){if(read(win.location.hash)!==view){index++;write(view,false);}else write(view,true);}
   apply(view,{source:'link'});if(supported&&ready)title(view);return true;
  }
  function traverse(){
   if(!supported||!ready)return;
   const incoming=meta(),requested=read(win.location.hash),view=allowed(requested)?requested:'guide',current=getView();
   if(restoring){if(incoming?.index===index&&requested===current)restoring=false;return;}
   if(view===current&&incoming?.index===index&&incoming?.view===view&&win.location.hash===href(view))return;
   if(view!==current&&!canLeave(view)){
    restoring=true;
    if(validIndex(incoming?.index)&&incoming.index!==index)win.history.go(index-incoming.index);
    else win.history.go(-1);
    return;
   }
   index=validIndex(incoming?.index)?incoming.index:index+1;
   write(view,true);if(view!==current)apply(view,{source:'history'});title(view);
  }
  if(supported)remember();
  win.addEventListener?.('popstate',traverse);
  win.addEventListener?.('hashchange',traverse);
  return {start,pause,sync,navigate,get ready(){return ready;}};
 }
 const api={pages,href,read,create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerNavigation=api;
})(typeof window!=='undefined'?window:globalThis);
