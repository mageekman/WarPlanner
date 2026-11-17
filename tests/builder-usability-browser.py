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
  page.locator('nav [data-view=army]').click()
  if page.locator('[data-action=list-library]').count():page.locator('[data-action=list-library]').click()
  page.locator('[data-action=create-list]').click()
  assert page.locator('[data-list-field=faction] optgroup').count()>0
  page.locator('#editor-list-name').fill('Builder QA')
  page.locator('#builder-detachment-picker summary').click();page.locator('[data-editor-detachment="Aspect Host"]').check()
  assert page.locator('#editor-disposition option[value="Priority Assets"]').count()==1
  assert page.locator('#editor-disposition option[value="Reconnaissance"]').count()==0
  page.locator('#editor-disposition').select_option('Priority Assets')
  for query in ['Shroud Runners','Guardian Defenders','Farseer']:
   page.locator('#builder-unit-search').fill(query);page.locator('[data-add-unit]').first.click()
   assert page.locator('#builder-unit-search').input_value()==''
   assert query+' added' in page.locator('.builder-unit-notice').inner_text()
  page.locator('[data-duplicate-unit]').first.click();assert page.locator('.builder-unit').count()==4
  assert page.locator('.builder-roster-group>h3').all_text_contents()==['Characters','Battle Line','Other Datasheets']
  page.locator('.builder-save-bottom').click();assert page.locator('.unit-card').count()==4
  assert page.locator('.roster-group-title').all_text_contents()==['Characters','Battle Line','Other Datasheets']
  page.locator('[data-action=open-onboarding]').click();page.locator('[data-onboarding=next]').click()
  # The close action occurs twice (header and footer); compare footer controls directly.
  controls=page.locator('.welcome-dialog footer button');rects=[controls.nth(i).bounding_box() for i in range(3)]
  centers=[r['y']+r['height']/2 for r in rects];assert max(centers)-min(centers)<2,centers
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print(str(width)+': dispositions, faction groups, add feedback, duplication, roster ordering and onboarding alignment pass')
  page.close()
 b.close()
