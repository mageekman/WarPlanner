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
  page.evaluate("""() => {WarPlannerContent.apply(WarPlannerContent.seed());refreshWarPlannerContent();const original=WarPlannerPractice.createSession;WarPlannerPractice.createSession=(bank,options)=>{const session=original(bank,options);window.quizTest=session;window.quizRules=bank.studyRules;return session;};}""")
  page.locator('nav [data-view=practice]').click()
  for opponent in [False,True]:
   if opponent:page.locator('[name=practice_goal]').select_option('opponent')
   page.locator('[data-practice-action=no-types]').click();page.locator('[name=practice_modes][value=abilities]').check()
   page.locator('#practice-setup button[type=submit]').click();question=page.evaluate('quizTest.questions[0]');assert question['mode']=='abilities'
   rules={r['id']:r for r in page.evaluate('quizRules')}
   buttons=page.locator('[data-practice-answer]');assert buttons.count()==4
   for option in question['options']:
    assert option['label']!=rules[option['id']]['name'];assert rules[option['id']]['name'].lower() not in option['label'].lower()
    assert option['label'] in page.locator('[data-practice-answer="'+option['id']+'"]').inner_text()
    assert 'description' not in option
   assert len({o['label'] for o in question['options']})==4
   assert page.locator('.practice-explanation').count()==0
   page.locator('[data-practice-answer="'+question['correct']+'"]').click()
   assert question['review']['rule']['name'] in page.locator('.practice-explanation').inner_text()
   assert question['review']['rule']['summary'] in page.locator('.practice-explanation').inner_text()
   page.locator('[data-practice-action=reset]').click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  print(str(width)+': own/opponent ability effect choices, hidden titles and complete answer reveals pass')
  page.close()
 b.close()
