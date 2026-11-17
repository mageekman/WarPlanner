from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import json
root=Path('/workspace/warplanner-work/docs')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=urlparse(r.request.url).path.lstrip('/') or 'index.html';requests.append(path)
  if path in ['config.js','auth.js','vendor/supabase.js']:r.fulfill(body='',content_type='application/javascript');return
  file=root/path
  if not file.is_file():r.abort();return
  data=file.read_bytes()
  if path=='index.html':data=data.replace(b'id="app" hidden',b'id="app"').replace(b'id="auth-screen"',b'style="display:none" id="auth-screen"')
  r.fulfill(body=data,content_type='text/html' if path.endswith('.html') else 'text/css' if path.endswith('.css') else 'application/javascript')
 page.route('**/*',route);page.goto('http://warplanner.local/');page.wait_for_selector('#guide-start-form')
 target=Path('/workspace/warplanner-work/audits/anytime-guide');target.mkdir(exist_ok=True)
 page.locator('#guide-start-form button[type=submit]').click();page.wait_for_selector('.guide-fixed-header')
 assert page.evaluate("document.querySelector('[data-action=clear-phase-reviews]').nextElementSibling.id==='guide-anytime'")
 drawer=page.locator('#guide-panel #guide-anytime');assert drawer.get_attribute('open') is None
 page.screenshot(path=str(target/'collapsed-mobile.png'),full_page=True)
 drawer.locator(':scope > summary').click();page.wait_for_function('state.guideAnyTimeOpen===true')
 assert drawer.locator('.reminder-review input').count()>0
 checkbox=drawer.locator('.reminder-review input').first;checkbox.check();key=checkbox.get_attribute('data-review-reminder');assert key and 'anytime:' in key
 page.screenshot(path=str(target/'expanded-mobile.png'),full_page=True)
 page.evaluate("buildGuidePageHTML=()=>{throw Error('Page rebuilt while navigating')};navigateGuide(1);finishGuideMotion()")
 assert page.locator('#guide-panel #guide-anytime').get_attribute('open') is not None
 assert page.locator('#guide-panel #guide-anytime .reminder-review input').first.is_checked()
 page.locator('#guide-panel [data-action=clear-phase-reviews]').click()
 assert not page.locator('#guide-panel #guide-anytime .reminder-review input').first.is_checked()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 results={'drawerBelowClear':True,'collapsedByDefault':True,'openStatePersists':True,'checkboxPersistsAcrossSteps':True,'phaseClearIncludesDrawer':True,'navigationRebuilds':0,'errors':errors}
 (target/'browser-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results));browser.close()
