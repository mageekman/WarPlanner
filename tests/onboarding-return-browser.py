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
  page.evaluate("setWarPlannerAccount({id:'returning-test'},[])")
  assert page.locator('.welcome-dialog').is_visible()
  page.locator('.welcome-dialog footer [data-onboarding=close]').click()
  page.reload();page.evaluate("setWarPlannerAccount({id:'returning-test'},[])")
  assert not page.locator('.welcome-dialog[open]').count()
  page.locator('[data-action=open-onboarding]').click();assert page.locator('.welcome-dialog').is_visible()
  page.keyboard.press('Escape');page.evaluate('clearWarPlannerAccount()');page.evaluate("setWarPlannerAccount({id:'returning-test'},[])")
  assert not page.locator('.welcome-dialog').is_visible()
  assert not errors,errors
  print(str(width)+': dismissal survives reload and sign-out/sign-in; Getting started manually reopens')
  page.close()
 b.close()
