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
  page.locator('nav [data-view=guide]').click()
  page.locator('#guide-start-form button[type=submit]').click();page.wait_for_selector('.guide-fixed-header')
  page.locator('.guide-settings>summary').click()
  with page.expect_popup() as result:page.locator('[data-action=print-guide]').click()
  printable=result.value;printable.wait_for_load_state()
  assert printable.locator('.phase').count()==10
  assert printable.locator('.rule').count()>0
  assert printable.locator('h1').inner_text().endswith('— Checklist')
  printable.locator('#print-scope').select_option('current');assert printable.locator('.phase:visible').count()==1
  printable.emulate_media(media='print');assert not printable.locator('.toolbar').is_visible()
  pdf=printable.pdf(format='A4');assert pdf.startswith(b'%PDF') and len(pdf)>1000
  printable.emulate_media(media='screen')
  with printable.expect_download() as download:printable.locator('#save-button').click()
  artifact=download.value;assert artifact.suggested_filename=='warplanner-guide.html'
  offline=Path(artifact.path()).read_text();assert '<!doctype html>' in offline and 'print-scope' in offline
  offline_page=b.new_page();offline_page.set_content(offline);assert offline_page.locator('#print-scope').input_value()=='current';assert offline_page.locator('.phase:visible').count()==1;offline_page.locator('#print-scope').select_option('all');assert offline_page.locator('.phase:visible').count()==10;offline_page.close()
  assert not errors,errors
  print(str(width)+': actual guide export opens; phase filter, PDF rendering and offline HTML download pass')
  printable.close()
  page.close()
 b.close()
