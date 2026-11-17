/* Keep editing-only modules out of gameplay startup. */
(function(root){
 'use strict';
 const scripts=['workshop-browser.js','rules-import.js','import-ui.js','timeline.js','admin.js'];
 const loaded=new Map();let service=null,pending=null,error='';
 function script(src){
  if(!loaded.has(src))loaded.set(src,new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=src;node.onload=resolve;node.onerror=()=>{node.remove();loaded.delete(src);reject(Error('Could not load the Workshop. Please retry.'));};document.head.append(node);}));
  return loaded.get(src);
 }
 async function load(){
  if(!pending)pending=(async()=>{
   for(const src of scripts)await script(src);
   const page=root.WarPlannerAdminPage;page.setService(service,{apply:false});error='';return page;
  })().catch(e=>{error=e.message;pending=null;throw e;});
  return pending;
 }
 const facade={
  get canAccess(){return !!service?.isAdmin;},get guideEditorActive(){return false;},get hasDraft(){return false;},canLeave:()=>true,leave:()=>true,discardReport(){},
  setService(next){if(service!==next)service?.dispose();service=next;root.WarPlannerReports?.setService(next);if(next?.applyToLibrary)next.applyToLibrary();else if(next)root.WarPlannerContent.apply(next.records);else root.WarPlannerContent.reset();},
  render(){if(!service?.isAdmin)return '<section class="empty-card"><h1>Administrator access required</h1></section>';if(!error)void load().then(()=>root.refreshWarPlannerContent?.(),()=>root.refreshWarPlannerContent?.());return `<section class="empty-card"><h1>Rules workshop</h1><p role="status">${error?'Could not load the Workshop. Please retry.':'Opening the Workshop…'}</p>${error?'<button type="button" data-load-workshop>Retry</button>':''}</section>`;},
  renderGuideEditor:()=>'',
  openGuideRules(rules){if(!service?.isAdmin)return false;void load().then(page=>page.openGuideRules(rules)).catch(()=>root.alert?.('Could not load the rule editor. Please retry.'));return true;},
  openReport(report){if(!service?.isAdmin)return false;void load().then(page=>{page.openReport(report);root.refreshWarPlannerContent?.();}).catch(()=>root.alert?.('Could not load the Workshop. Please retry.'));return true;}
 };
 document.addEventListener('click',event=>{if(event.target.closest?.('[data-load-workshop]')){error='';root.refreshWarPlannerContent?.();}});
 root.WarPlannerAdminPage=facade;
})(window);
