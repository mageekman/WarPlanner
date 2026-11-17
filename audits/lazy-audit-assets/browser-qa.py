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
 assert 'aeldari-audit-data.js' not in requests
 rows=json.loads(Path('/workspace/warplanner-work/tests/fixtures/aeldari-catalog-before-audit.json').read_text())
 legacy=next(r for r in rows if r['data']['id']=='expanded-protect-aeldari')
 legacy.update(kind='rule',enabled=True)
 result=page.evaluate("""async row=>{const api=WarPlannerAeldariAudit;await Promise.all([api.ensure([row]),api.ensure([row])]);return api.enrich(row.data)}""",legacy)
 assert 'led by a FARSEER' in result['summary'],result['summary']
 assert requests.count('aeldari-audit-data.js')==1,requests
 assert not errors,errors
 results={'startupHistoricalAuditRequests':0,'matchingLegacyRequests':1,'correctedRule':result['name'],'errors':errors}
 print(json.dumps(results))
 target=Path('/workspace/warplanner-work/audits/lazy-audit-assets');target.mkdir(exist_ok=True)
 (target/'browser-results.json').write_text(json.dumps(results,indent=2))
 browser.close()
