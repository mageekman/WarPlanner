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
  import json,subprocess
  code="const S=require('./scripts/split-ynnari.cjs'),before=require('./tests/fixtures/ynnari-split-before.json');process.stdout.write(JSON.stringify(S.split(before,{sourceHash:'a'.repeat(64)})));"
  rows=json.loads(subprocess.check_output(['node','-e',code],cwd=root.parent))
  page.evaluate("""rows=>{WarPlannerContent.apply(rows);state.army={...structuredClone(WarPlan.sample),name:'Ynnari test',detachment:'Devoted of Ynnead',detachments:['Devoted of Ynnead']};state.guideStarted=true;state.view='guide';state.phase=2;state.turn='opponent';state.open=0;guidePrepared=null;render();}""",rows)
  page.locator('#guide-panel').wait_for();page.wait_for_function('guidePrepared?.ready')
  assert page.locator('#guide-panel [data-shared-rule="expanded-strength-from-death-aeldari"]').count()==0
  assert page.locator('#guide-panel [data-timing-id="opponent-shooting-activations"] [data-shared-rule="expanded-strength-from-death-lethal-surge-aeldari"]').count()==1
  assert page.locator('#guide-panel [data-timing-id="shooting-end"] [data-shared-rule="expanded-strength-from-death-lethal-intent-aeldari"]').count()==1
  assert page.locator('#guide-anytime [data-shared-rule="expanded-strength-from-death-lethal-surge-aeldari"]').count()==0
  page.screenshot(path='/tmp/ynnari-shooting-'+str(width)+'.png')
  for turn in ['you','opponent']:
   page.locator('[data-turn="'+turn+'"]').click();page.locator('[data-phase="4"]').click()
   assert page.locator('#guide-panel [data-timing-id="fight-start"] [data-shared-rule="expanded-strength-from-death-lethal-reprisal-aeldari"]').count()==1
   assert page.locator('#guide-panel [data-shared-rule="expanded-strength-from-death-aeldari"]').count()==0
  page.locator('nav [data-view=army]').click();page.locator('[data-open-list]').first.click()
  page.locator('.army-rules-reference>summary').click()
  names=page.locator('.army-rules-reference .ability-card>summary strong').all_text_contents()
  assert 'Strength from Death' in names,names
  for name in ['Lethal Intent','Lethal Surge','Lethal Reprisal']:assert name in names,names
  assert not errors,errors
  print(str(width)+': split Shooting/Fight reminders and parent army reference verified')
  page.close()
 b.close()
