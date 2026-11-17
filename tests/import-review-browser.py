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
  page.locator('button[data-action="import"]').first.click()
  export='Test army (200 points)\nAeldari\nUnrecognised Host\nShroud Runners (100 points)\n<svg onload=alert(1)> (100 points)'
  page.locator('#army-text').fill(export);page.locator('#import-form button[type=submit]').click()
  review=page.locator('#import-feedback')
  assert '1 of 2 units matched' in review.inner_text()
  assert 'Not recognised: Unrecognised Host' in review.inner_text()
  assert review.locator('svg').count()==0
  assert 'No matching datasheet found' in review.inner_text()
  assert page.locator('#import-dialog').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
  page.locator('[data-action=revise-import]').click();assert page.locator('#army-text').input_value()==export
  assert review.inner_text()==''
  page.locator('#army-text').fill('Updated army (100 points)\nAeldari\nWarhost\nShroud Runners (100 points)')
  page.locator('#import-form button[type=submit]').click();assert '1 of 1 units matched' in review.inner_text()
  page.locator('#import-form button[type=submit]').click();assert not page.locator('#import-dialog').is_visible()
  assert 'Updated army' in page.locator('#app').inner_text();assert not errors,errors
  print(str(width)+': import matching, detachment feedback, escaped names, editing and saving pass')
  page.close()
 b.close()
