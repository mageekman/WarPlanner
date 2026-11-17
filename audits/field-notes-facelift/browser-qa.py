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
 target=Path('/workspace/warplanner-work/audits/field-notes-facelift');target.mkdir(exist_ok=True)
 page.screenshot(path=str(target/'setup-mobile.png'),full_page=True)
 page.locator('#guide-start-form button[type=submit]').click();page.wait_for_selector('.guide-fixed-header')
 page.evaluate("state.phase=1;state.open=1;render()")
 page.screenshot(path=str(target/'guide-mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 first=page.locator('.reminder-review input').first;first.check();key=first.get_attribute('data-review-reminder')
 assert page.evaluate('(key)=>state.reviewedReminders[key]===true',key)
 page.locator('.reminder-item details > summary').first.click()
 assert page.locator('.reminder-item details').first.get_attribute('open') is not None
 page.locator('.guide-settings > summary').click()
 assert page.locator('.guide-settings-menu').is_visible()
 box=page.locator('.guide-settings-menu').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390
 page.locator('.guide-settings > summary').click()
 page.evaluate('for(let i=0;i<8;i++)navigateGuide(1);finishGuideMotion()')
 
 page.evaluate("state.view='army';render()")
 page.screenshot(path=str(target/'army-mobile.png'),full_page=True)
 page.evaluate("state.view='practice';render()")
 page.screenshot(path=str(target/'practice-mobile.png'),full_page=True)
 page.set_viewport_size({'width':1280,'height':900});page.evaluate("state.view='guide';render()")
 page.screenshot(path=str(target/'guide-desktop.png'),full_page=True)
 assert not errors,errors
 print(json.dumps({'errors':errors,'mobileOverflow':False}))
 browser.close()
