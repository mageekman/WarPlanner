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
 cdp=page.context.new_cdp_session(page);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
 results=page.evaluate("""()=>{state.savedLists=Array.from({length:100},(_,i)=>({id:'stress-'+i,army:structuredClone(state.army),renames:{},warnings:[]}));for(let i=0;i<2000;i++)state.reviewedReminders['stress-'+i]=true;save();const results={};for(const mode of ['legacy','split']){const times=[],bytes=[];for(let i=0;i<30;i++){state.open=i;const t=performance.now();if(mode==='legacy'){JSON.stringify([KEY,state.activeListId,state.army,state.renames,state.warnings]);const text=JSON.stringify(state);localStorage.setItem('benchmark-old',text);JSON.stringify(state.savedLists);bytes.push(text.length);}else{save();bytes.push(localStorage.getItem(KEY+'.progress.v1').length);}times.push(performance.now()-t);}results[mode]={medianMs:times.sort((a,b)=>a-b)[15],writtenChars:bytes[0]};}return results;}""")
 page.reload();page.wait_for_selector('#guide-start-form')
 restored=page.evaluate("({lists:state.savedLists.length,marks:Object.keys(state.reviewedReminders).length,open:state.open})")
 assert restored['lists']==100 and restored['marks']==2000 and restored['open']==29,restored
 assert not errors,errors
 results['restored']=restored;results['errors']=errors;print(json.dumps(results))
 Path('/workspace/warplanner-work/audits/progress-saving').mkdir(exist_ok=True)
 Path('/workspace/warplanner-work/audits/progress-saving/browser-results.json').write_text(json.dumps(results,indent=2))
 browser.close()
