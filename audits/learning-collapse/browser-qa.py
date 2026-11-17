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
 target=Path('/workspace/warplanner-work/audits/learning-collapse');target.mkdir(exist_ok=True);results=[]
 def check(page,label,limit):
  page.locator('input[data-guide-mode][value=learn]').check();page.locator('#guide-start-form button[type=submit]').click();page.wait_for_selector('#guide-panel .learn-core')
  lesson=page.locator('#guide-panel .learn-core');assert lesson.evaluate('(el)=>el.tagName')=='DETAILS';assert lesson.get_attribute('open') is not None
  lesson.locator(':scope > summary').click();assert not lesson.locator('.learn-core-content').is_visible();assert lesson.bounding_box()['height']<=52
  lesson.locator(':scope > summary').click();assert lesson.locator('.learn-core-content').is_visible()
  heights={}
  for cls in ['learn-check','learn-glossary']:
   detail=lesson.locator('.'+cls);assert detail.get_attribute('open') is None
   heights[cls]=round(detail.bounding_box()['height'],1);assert heights[cls]<=limit,(label,cls,heights)
   detail.locator(':scope > summary').click();assert detail.get_attribute('open') is not None
   detail.locator(':scope > summary').click()
  page.screenshot(path=str(target/(label+'.png')),full_page=True)
  lesson.locator(':scope > summary').click();page.locator('.guide-frame > .next-page').click();page.wait_for_function('!guideMotion')
  assert page.locator('#guide-panel .learn-core').get_attribute('open') is not None
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  return {'viewport':label,'defaultOpen':True,'toggleWorks':True,'nextLessonOpen':True,'collapsedHeights':heights}
 results.append(check(page,'desktop',36));page.close()
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',route);page.goto('http://warplanner.local/');page.wait_for_selector('#guide-start-form')
 results.append(check(page,'mobile',46));assert not errors,errors
 (target/'browser-results.json').write_text(json.dumps({'results':results,'errors':errors},indent=2));print(json.dumps(results));browser.close()
