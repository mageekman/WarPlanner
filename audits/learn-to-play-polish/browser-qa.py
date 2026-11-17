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
 target=Path('/workspace/warplanner-work/audits/learn-to-play-polish');target.mkdir(exist_ok=True)
 page.locator('input[data-guide-mode][value=learn]').check()
 page.screenshot(path=str(target/'setup-mobile.png'),full_page=True)
 page.locator('#guide-start-form button[type=submit]').click();page.wait_for_selector('.guide-fixed-header')
 assert page.evaluate("state.guideMode==='learn' && guidePrepared.ready && guidePrepared.pages.size===52")
 page.locator('.phase-nav [data-phase="2"]').click()
 page.evaluate("()=>{state.open=1;render();window.learningPageBuilder=buildGuidePageHTML;buildGuidePageHTML=()=>{throw Error('Page rebuilt during learning navigation')}}")
 page.wait_for_selector('#guide-panel .learn-core');assert page.locator('#guide-panel #lesson-title').inner_text()=='Unit Shooting'
 page.screenshot(path=str(target/'shooting-mobile.png'),full_page=True)
 page.locator('#guide-panel .learn-navigation [data-action=page-next]').click();page.wait_for_function('!guideMotion')
 assert page.locator('#guide-panel #lesson-title').inner_text()=='Attacks'
 page.locator('#guide-panel .learn-check > summary').click();page.locator('#guide-panel .learn-check details > summary').click()
 assert page.locator('#guide-panel .learn-check details').get_attribute('open') is not None
 page.locator('#guide-panel .learn-navigation [data-action=page-next]').click();page.wait_for_function('!guideMotion')
 assert page.locator('#guide-panel #lesson-title').inner_text()=='After Shooting'
 page.locator('#guide-panel [data-learning-repeat=shooting-select]').click();assert page.locator('#guide-panel #lesson-title').inner_text()=='Unit Shooting'
 page.evaluate('()=>{buildGuidePageHTML=window.learningPageBuilder}')
 page.locator('.guide-settings > summary').click();page.locator('#guide-mode').select_option('quick')
 assert page.evaluate("state.guideMode==='learn'")
 page.locator('[data-action=reload-guide]').click();page.wait_for_selector('.guide-fixed-header')
 assert page.evaluate("state.guideMode==='quick' && state.phase===2")
 assert page.locator('#guide-panel .learn-core').count()==0
 page.evaluate("()=>{state.savedLists=[];state.army={name:'No army imported',faction:'',units:[]};state.activeListId=undefined;state.setupListId=undefined;state.setupGuideMode='learn';state.guideStarted=false;guidePrepared=null;render()}")
 page.locator('#guide-start-form button[type=submit]').click();page.wait_for_selector('#guide-panel .learn-core')
 assert page.evaluate("state.guideMode==='learn'&&state.army.units.length===0")
 page.reload();page.wait_for_selector('#guide-panel .learn-core')
 assert page.evaluate("state.guideStarted&&state.army.units.length===0")
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 result={'learningTemplates':52,'questionAndAnswer':True,'unitRepeat':True,'deferredModeSwitch':True,'quickGuidePreserved':True,'coreOnlyReload':True,'navigationRebuilds':0,'mobileOverflow':False,'errors':errors}
 (target/'browser-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));browser.close()
