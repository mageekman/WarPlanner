# Run with Python Playwright and Chromium installed. Uses local files; no account or network writes.
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(390,844),(1280,900)]:
  page=b.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  def route(r):
   from urllib.parse import urlparse
   path=urlparse(r.request.url).path.lstrip('/') or 'index.html'
   f=root/path
   if path in ['auth.js','config.js','vendor/supabase.js']:r.fulfill(body='',content_type='text/javascript')
   elif path=='index.html':r.fulfill(body=f.read_text().replace('id="app" hidden','id="app"').replace('id="auth-screen"','id="auth-screen" hidden'),content_type='text/html')
   elif f.is_file():r.fulfill(path=str(f))
   else:r.fulfill(body='')
  page.route('**/*',route);page.goto('http://localhost/');page.locator('nav [data-view=overview]').click()
  page.evaluate('WarPlannerContent.apply(WarPlannerContent.seed());refreshWarPlannerContent()')
  page.locator('nav [data-view=guide]').click()
  page.locator('#guide-start-form button[type=submit]').click()
  page.locator('#guide-panel').wait_for()
  assert page.evaluate('guidePrepared.pages.size')==10
  for turn in ['you','opponent']:
   page.locator('[data-turn="'+turn+'"]').click()
   for phase in range(5):
    page.locator('[data-phase="'+str(phase)+'"]').click()
    assert page.locator('#lesson-title').inner_text().endswith('phase')
    expected=page.evaluate('phaseTimingEntries().filter(e=>e.visible).map(e=>e.index)')
    actual=page.locator('#guide-panel [data-guide-step]').evaluate_all('(els)=>els.map(el=>Number(el.dataset.guideStep))')
    assert actual==expected,(turn,phase,actual,expected)
    assert page.locator('#guide-panel .guide-slide').count()==0
    assert page.locator('.guide-phase-navigation').is_visible()
  page.locator('[data-turn="you"]').click();page.locator('[data-phase="1"]').click()
  assert page.locator('#lesson-title').inner_text()=='Movement phase'
  assert page.locator('#guide-panel [data-guide-step="0"]').count()==0
  assert page.locator('#guide-panel [data-guide-step="1"]').count()==1
  assert page.locator('#guide-panel [data-guide-step="2"]').count()==1
  assert page.locator('#guide-phase-overview').count()==0
  assert page.locator('#guide-panel #guide-phase-help').count()==1
  assert page.locator('#guide-panel .phase-timing .guide-more').count()==0
  timing=page.locator('#guide-panel [data-guide-step="1"]')
  assert timing.evaluate('(el)=>el.open')
  page.evaluate('window.testPrepared=guidePrepared')
  timing.locator(':scope>summary').click();page.wait_for_function('Object.keys(state.guideCollapsedTimings).length>0')
  assert not timing.evaluate('(el)=>el.open')
  assert page.evaluate('guidePrepared===window.testPrepared')
  page.locator('.next-page').click();page.wait_for_function('state.phase===2')
  page.locator('.previous-page').click();page.wait_for_function('state.phase===1')
  assert not page.locator('#guide-panel [data-guide-step="1"]').evaluate('(el)=>el.open')
  page.reload();page.locator('#guide-panel').wait_for();page.wait_for_function('guidePrepared?.ready')
  assert not page.locator('#guide-panel [data-guide-step="1"]').evaluate('(el)=>el.open')
  page.locator('#guide-panel [data-guide-step="1"]>summary').click()
  page.locator('#guide-panel').evaluate('(el)=>el.scrollTop=0')
  page.locator('#guide-anytime>summary').click()
  review=page.locator('#guide-panel [data-review-id]').first
  review.check();key=review.get_attribute('data-review-id')
  assert page.locator('#guide-panel [data-review-id="'+key+'"]').evaluate_all('(els)=>els.every(el=>el.checked)')
  page.locator('.next-page').click();page.wait_for_function('state.phase===2')
  assert page.locator('#lesson-title').inner_text()=='Shooting phase'
  page.locator('.previous-page').click();page.wait_for_function('state.phase===1')
  assert page.locator('#guide-panel [data-review-id="'+key+'"]').evaluate_all('(els)=>els.every(el=>el.checked)')
  page.locator('.guide-settings>summary').click()
  empty=page.locator('#guide-show-empty-timings');assert not empty.is_checked();empty.check()
  assert page.evaluate('state.guideShowEmptyTimings')==False
  page.locator('[data-action=reload-guide]').click();page.wait_for_function('guidePrepared?.ready')
  assert page.locator('#guide-panel [data-guide-step="0"]').count()==1
  page.locator('.guide-settings>summary').click();page.locator('#guide-show-empty-timings').uncheck();page.locator('[data-action=reload-guide]').click();page.wait_for_function('guidePrepared?.ready')
  assert page.locator('#guide-panel [data-guide-step="0"]').count()==0
  page.locator('#guide-panel').evaluate('(el)=>el.scrollTop=0')
  page.screenshot(path='/tmp/phase-guide-'+str(width)+'.png')
  page.locator('.guide-settings>summary').click();page.locator('#guide-mode').select_option('learn');page.locator('[data-action=reload-guide]').click();page.wait_for_function('guidePrepared?.ready')
  assert page.evaluate('guidePrepared.pages.size')==10
  assert page.locator('#guide-panel .learn-core').count()==page.evaluate('Activations.steps(state).length')
  assert page.locator('#guide-panel .learn-core').evaluate_all('(els)=>els.every(el=>el.open)')
  page.locator('.next-page').click();page.wait_for_function('state.phase===2')
  assert page.locator('#guide-panel').inner_text().find('Ballistic Skill')>=0
  repeat=page.locator('#guide-panel [data-learning-repeat]').first
  repeat.click();assert page.evaluate('state.phase')==2
  assert page.locator('#guide-panel [data-guide-step="1"] h3').first.is_visible()
  page.locator('[data-phase="4"]').click();page.locator('.next-page').click();page.wait_for_function('guideMotion===null')
  assert page.evaluate('[state.phase,state.turn,state.round]')==[0,'opponent',1]
  page.locator('.previous-page').click();page.wait_for_function('guideMotion===null')
  assert page.evaluate('[state.phase,state.turn,state.round]')==[4,'you',1]
  page.locator('[data-phase="0"]').click()
  page.evaluate("()=>{for(let i=0;i<10;i++)document.querySelector('.next-page').click()}")
  page.wait_for_function('guideMotion===null')
  assert page.evaluate('[state.phase,state.turn,state.round]')==[0,'you',2]
  page.locator('[data-phase="1"]').click()
  page.evaluate('jumpToGuideTiming(Activations.steps(state).length-1)')
  bookmark=page.evaluate('state.open')
  page.reload();page.locator('#guide-panel').wait_for();page.wait_for_function('guidePrepared?.ready')
  assert page.evaluate('state.open')==bookmark
  assert page.locator('#guide-panel [data-guide-step="'+str(bookmark)+'"] h3').first.is_visible()
  page.locator('#guide-panel').evaluate('(el)=>el.scrollTop=0');page.wait_for_function('state.open===0')
  page.locator('#guide-panel').evaluate('(el)=>el.scrollTop=el.scrollHeight')
  page.wait_for_function('state.open===Activations.steps(state).length-1')
  ids=page.locator('[id]').evaluate_all('(els)=>els.map(el=>el.id)');assert len(ids)==len(set(ids))
  page.locator('#phase-tab-1').press('ArrowRight');assert page.evaluate('state.phase')==2
  with page.expect_popup() as info:
   page.locator('.guide-settings>summary').click();page.locator('[data-action=print-guide]').click()
  printed=info.value;printed.wait_for_load_state();assert printed.locator('.phase').count()==10;printed.close()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print(str(width)+': collapsible timings, saved choices, one bottom help group, phase navigation, settings and learning verified')
  page.close()
 b.close()
