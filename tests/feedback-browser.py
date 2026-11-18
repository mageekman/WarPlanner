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
  page.evaluate("""() => {
   window.feedbackTest={calls:[],rows:[],fail:true};
   const service={isAdmin:false,submitFeedback:async payload=>{feedbackTest.calls.push(structuredClone(payload));if(feedbackTest.fail){feedbackTest.fail=false;throw Error('Offline. Please retry.');}const row={...payload,status:'new',created_at:new Date().toISOString()};feedbackTest.rows.push(row);return row;}};
   WarPlannerReports.setService(service);
  }""")
  page.locator('nav [data-open-feedback]').click();dialog=page.locator('.feedback-dialog');assert dialog.is_visible()
  page.locator('[name=area]').select_option('guide');page.locator('[name=title]').fill('Guide swipe bug <script>bad</script>')
  page.locator('textarea[name=description]').fill('Swiping quickly stopped the guide moving.');page.locator('[name=steps]').fill('Start a guide and swipe twice.');page.locator('[name=expected]').fill('The next step should open.');page.locator('[name=frequency]').select_option('sometimes');page.locator('[name=impact]').select_option('blocked');page.locator('[name=contact_email]').fill('tester@example.com')
  assert 'originalExport' not in page.locator('.feedback-context pre').inner_text()
  page.locator('[name=includeDiagnostics]').uncheck();page.locator('[data-feedback-form] button[type=submit]').click()
  assert 'Offline' in dialog.locator('[role=alert]').inner_text();assert page.locator('[name=title]').input_value().startswith('Guide swipe bug')
  page.locator('[data-feedback-form] button[type=submit]').click();assert dialog.locator('.feedback-receipt').is_visible()
  assert page.evaluate('feedbackTest.calls[0].id===feedbackTest.calls[1].id');assert page.evaluate('Object.keys(feedbackTest.calls[1].context).length')==0
  page.locator('[data-feedback-action=another]').click();page.locator('[name=kind]').select_option('suggestion');assert page.locator('[name=steps]').count()==0
  page.locator('[name=title]').fill('An improvement');page.locator('textarea[name=description]').fill('Please add a useful shortcut.');page.locator('[data-feedback-form] button[type=submit]').click();assert dialog.locator('.feedback-receipt').is_visible()
  assert page.evaluate('feedbackTest.calls[2].context.page')=='overview'
  assert dialog.evaluate('(d)=>d.scrollWidth<=d.clientWidth');page.keyboard.press('Escape');assert not dialog.is_visible()
  page.evaluate("""() => {
   const service={isAdmin:true,listFeedback:async filter=>feedbackTest.rows.filter(row=>filter==='all'||(filter==='resolved'?row.status==='resolved':row.status!=='resolved')),setFeedbackStatus:async(id,status)=>{feedbackTest.rows.find(row=>row.id===id).status=status;}};
   const box=document.createElement('div');box.id='user-feedback-inbox';document.body.append(box);WarPlannerFeedback.setService(service);box.innerHTML=WarPlannerFeedback.inboxHTML();
  }""")
  page.wait_for_function("document.querySelectorAll('.feedback-inbox-card').length===2");page.locator('[data-feedback-inbox]>summary').click()
  assert page.locator('.feedback-inbox script').count()==0
  page.locator('[data-feedback-status="in-progress"]').first.click();page.wait_for_function("feedbackTest.rows.some(row=>row.status==='in-progress')")
  page.locator('[data-feedback-status=resolved]').first.click();page.wait_for_function("document.querySelectorAll('.feedback-inbox-card').length===1")
  page.locator('[data-feedback-filter]').select_option('resolved');page.wait_for_function("document.querySelector('.feedback-inbox').innerText.includes('Resolved')")
  page.evaluate('WarPlannerFeedback.setService(null)');page.locator('.site-feedback-button').click();assert 'Sign in to send feedback' in dialog.inner_text();assert dialog.locator('button[type=submit]').is_disabled()
  assert not errors,errors
  print(str(width)+': popup, diagnostics opt-out, failed-send retry, suggestions, private drafts and admin triage pass')
  page.close()
 b.close()
