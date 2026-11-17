from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import json,time,statistics
root=Path('/workspace/warplanner-work/docs');rows=json.load(open('/tmp/perf-catalog.json'));results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for scenario in ['catalog-marines']:
  page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   path=urlparse(r.request.url).path.lstrip('/') or 'index.html'
   if path in ['config.js','auth.js','vendor/supabase.js']:r.fulfill(body='',content_type='application/javascript');return
   file=root/path
   if not file.is_file():r.abort();return
   data=file.read_bytes()
   if path=='index.html':data=data.replace(b'id="app" hidden',b'id="app"').replace(b'id="auth-screen"',b'style="display:none" id="auth-screen"')
   r.fulfill(body=data,content_type='text/html' if path.endswith('.html') else 'text/css' if path.endswith('.css') else 'application/javascript' if path.endswith('.js') else 'image/png')
  page.route('**/*',route)
  page.add_init_script("window.auditLongTasks=[];new PerformanceObserver(l=>window.auditLongTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});")
  cdp=page.context.new_cdp_session(page);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
  start=time.monotonic();page.goto('http://warplanner.local/');page.wait_for_selector('#guide-start-form');load=(time.monotonic()-start)*1000
  applied=0
  if scenario!='seed-aeldari':applied=page.evaluate('(rows)=>{const t=performance.now();WarPlannerContent.apply(rows);guideSession.reset();guidePrepared=null;render();return performance.now()-t;}',rows)
  if scenario=='catalog-marines':
   page.evaluate("""()=>{const names=['Captain','Intercessor Squad','Assault Intercessor Squad','Infiltrator Squad','Incursor Squad','Terminator Squad','Bladeguard Veteran Squad','Aggressor Squad','Eradicator Squad','Hellblaster Squad','Infernus Squad','Sternguard Veteran Squad','Scout Squad','Jump Pack Intercessors','Land Raider','Repulsor','Gladiator Lancer','Redemptor Dreadnought','Ballistus Dreadnought','Storm Speeder Thunderstrike'];state.army={...state.army,name:'Audit Marines',faction:'Space Marines',detachment:'Gladius Task Force',points:2000,units:names.map((name,i)=>({id:'audit-'+i,name,points:100,role:'',group:'',details:[]}))};guideSession.reset();guidePrepared=null;render();}""")
  page.evaluate("""()=>{window.auditCosts={};for(const name of ['save','guidePreparationContext','buildGuidePageHTML']){const fn=window[name];window[name]=function(...args){const t=performance.now();try{return fn.apply(this,args)}finally{const x=window.auditCosts[name]??={calls:0,ms:0};x.calls++;x.ms+=performance.now()-t;}};}window.auditLongTasks=[];}""")
  start=time.monotonic();page.locator('#guide-start-form button[type=submit]').click();page.wait_for_selector('.guide-fixed-header',timeout=120000);preload=(time.monotonic()-start)*1000
  prep=page.evaluate('({pages:guidePrepared.pages.size,templateChars:[...guidePrepared.pages.values()].reduce((s,x)=>s+x.length,0),units:state.army.units.length,costs:structuredClone(window.auditCosts),longTasks:structuredClone(window.auditLongTasks)})')
  nav=page.evaluate("""async()=>{window.auditLongTasks=[];window.auditCosts={};let calls=[],settles=[];for(let i=0;i<20;i++){const t=performance.now();navigateGuide(1);calls.push(performance.now()-t);await new Promise(resolve=>{function check(){if(!guideMotion)requestAnimationFrame(resolve);else requestAnimationFrame(check)}check()});settles.push(performance.now()-t);}return {calls,settles,costs:window.auditCosts,longTasks:window.auditLongTasks,domNodes:document.querySelectorAll('*').length};}""")
  rapid=page.evaluate("""async()=>{finishGuideMotion();let expected={...state};for(let i=0;i<8;i++){if(expected.open<WarPlanActivations.steps(expected).length-1)expected.open++;else expected={...expected,...WarPlan.next(expected),open:0};}const t=performance.now();for(let i=0;i<8;i++)navigateGuide(1);await new Promise(resolve=>{function check(){if(!guideMotion)requestAnimationFrame(resolve);else requestAnimationFrame(check)}check()});return {ms:performance.now()-t,expected:[expected.round,expected.turn,expected.phase,expected.open],actual:[state.round,state.turn,state.phase,state.open]};}""")
  assert rapid['expected']==rapid['actual'],rapid
  stress={}
  memory=cdp.send('Runtime.getHeapUsage')
  results.append({'scenario':scenario,'cpuThrottle':4,'localLoadMs':load,'catalogApplyAndRenderMs':applied,'guidePreloadMs':preload,'preparation':prep,'navigation':nav,'rapid8':rapid,'heapUsedBytes':memory['usedSize'],'errors':errors})
  print(scenario,'load',round(load),'apply',round(applied),'preload',round(preload),'nav95',round(sorted(nav['calls'])[18],1),'settle95',round(sorted(nav['settles'])[18],1),'errors',errors,flush=True)
  page.close()
 browser.close()
Path('/workspace/warplanner-work/audits/performance-2026-11-16').mkdir(exist_ok=True)
Path('/workspace/warplanner-work/audits/performance-2026-11-16/rapid-results-after.json').write_text(json.dumps(results,indent=2))
