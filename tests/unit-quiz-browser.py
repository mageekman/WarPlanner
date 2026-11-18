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
  page.evaluate("""() => {WarPlannerContent.apply(WarPlannerContent.seed());refreshWarPlannerContent();const original=WarPlannerPractice.createSession;WarPlannerPractice.createSession=(bank,options)=>{const session=original(bank,options);window.quizTest=session;return session;};}""")
  page.locator('nav [data-view=practice]').click()
  assert page.locator('[name=practice_modes][value=rules]').count()==0
  assert page.locator('[name=practice_modes][value=units]').is_checked()
  assert not page.locator('[name=practice_modes][value=abilities]').is_checked()
  page.locator('#practice-setup button[type=submit]').click()
  question=page.evaluate('quizTest.questions[0]');assert question['mode']=='units'
  assert page.locator('.practice-clue').inner_text()==question['clue']
  assert question['review']['rule']['name'].lower() not in question['clue'].lower()
  assert page.locator('.practice-explanation').count()==0
  assert page.locator('[data-practice-answer]').count()==4
  page.locator('[data-practice-answer="'+question['correct']+'"]').click()
  assert question['review']['rule']['name'] in page.locator('.practice-explanation').inner_text()
  page.locator('[data-practice-action=reset]').click()
  page.locator('[name=practice_goal]').select_option('opponent')
  assert page.locator('[name=practice_modes][value=rules]').count()==0
  page.locator('[data-practice-action=no-types]').click();page.locator('[name=practice_modes][value=units]').check()
  page.locator('#practice-setup button[type=submit]').click();question=page.evaluate('quizTest.questions[0]');assert question['mode']=='units';assert 'opposing units' in question['prompt']
  assert page.locator('.practice-clue').inner_text()==question['clue']
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  print(str(width)+': rule-text default, unit answers, hidden rule title, answer reveal and opponent practice pass')
  page.close()
 b.close()
