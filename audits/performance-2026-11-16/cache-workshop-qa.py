from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import json
root=Path('/workspace/warplanner-work/docs')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=urlparse(r.request.url).path.lstrip('/') or 'index.html';requests.append(path)
  if path in ['config.js','auth.js','vendor/supabase.js']:r.fulfill(body='',content_type='application/javascript');return
  file=root/path
  if not file.is_file():r.abort();return
  data=file.read_bytes()
  if path=='index.html':data=data.replace(b'id="app" hidden',b'id="app"').replace(b'id="auth-screen"',b'style="display:none" id="auth-screen"')
  r.fulfill(body=data,content_type='text/html' if path.endswith('.html') else 'text/css' if path.endswith('.css') else 'application/javascript')
 page.route('**/*',route);page.goto('http://warplanner.local/');page.wait_for_selector('#guide-start-form')
 assert 'admin.js' not in requests
 cache=page.evaluate("""async()=>{const c=WarPlannerRuntimeCache;await c.put('qa',{version:'v1',rows:[{key:'test'}]});const value=await c.get('qa');await c.remove('qa');const removed=await c.get('qa');return {value,removed}}""")
 assert cache['value']['version']=='v1' and cache['removed'] is None
 page.evaluate("""()=>{window.qaService={isAdmin:true,workshopReady:true,records:[],version:1,applyToLibrary(){},dispose(){}};WarPlannerAdminPage.setService(qaService);WarPlannerAdminPage.render();}""")
 page.wait_for_function("typeof WarPlannerWorkshopBrowser!=='undefined' && typeof WarPlannerAdminPage.setService==='function' && document.querySelector('script[src=\"admin.js\"]')")
 page.wait_for_timeout(200)
 assert 'admin.js' in requests and 'timeline.js' in requests
 assert not errors,errors
 print(json.dumps({'cache':cache,'lazyWorkshopLoaded':True,'errors':errors}))
 browser.close()
