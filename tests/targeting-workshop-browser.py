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
   const rows=WarPlannerContent.seed();window.targetTest={rows,saved:null};
   const service={isAdmin:true,version:1,get records(){return structuredClone(rows)},async history(){return []},async save(row){WarPlannerContent.validate(row);targetTest.saved=structuredClone(row);const i=rows.findIndex(r=>r.key===row.key);rows[i]={...structuredClone(row),revision:row.revision+1};this.version++;return rows[i];}};
   if(!document.querySelector('#guide-rule-editor-container')){const host=document.createElement('div');host.id='guide-rule-editor-container';document.body.append(host);}
   WarPlannerAdminPage.setService(service);window.openTargetTest=()=>WarPlannerAdminPage.openGuideRules([{id:'walker'}]);openTargetTest();
  }""")
  dialog=page.locator('#guide-rule-editor-dialog');dialog.wait_for(state='visible')
  section=dialog.locator('.admin-targeting');assert not section.evaluate('(el)=>el.open');section.locator('summary').click()
  assert not section.locator('[name=targeting-verified]').is_checked()
  section.locator('[name=targeting-side]').select_option('enemy');section.locator('[name=targeting-scope]').select_option('unit')
  section.locator('[name=targeting-requiredKeywords]').fill('Vehicle');section.locator('[name=targeting-excludedKeywords]').fill('Titanic')
  section.locator('[name=targeting-range]').fill('6.5');section.locator('[name=targeting-visibility]').select_option('required')
  section.locator('[name=targeting-conditions]').fill('Measure range from the bearer.');section.locator('[name=targeting-verified]').check()
  dialog.locator('textarea[name=summary]').fill('Select an eligible enemy unit and resolve this test effect.')
  assert not section.locator('[name=targeting-verified]').is_checked()
  section.locator('[name=targeting-verified]').check();section.locator('[name=targeting-range]').fill('12')
  assert not section.locator('[name=targeting-verified]').is_checked()
  section.locator('[name=targeting-verified]').check();dialog.locator('[name=referenceOnly]').uncheck()
  section.locator('[name=targeting-verified]').check()
  assert section.evaluate('(el)=>el.scrollWidth<=el.clientWidth')
  dialog.locator('button[type=submit]').click();page.wait_for_function('targetTest.saved!==null')
  saved=page.evaluate('targetTest.saved');assert saved['data']['targeting']['verified'];assert saved['data']['targeting']['range']==12
  assert saved['data']['targeting']['requiredKeywords']==['Vehicle'];assert saved['data']['units']==page.evaluate("WarPlannerContent.seed().find(r=>r.key==='rule:walker').data.units")
  page.evaluate('openTargetTest()');section=page.locator('.admin-targeting');assert section.locator('[name=targeting-verified]').is_checked()
  assert 'Verified' in section.locator('summary').inner_text()
  section.locator('[name=targeting-side]').select_option('friendly');assert not section.locator('[name=targeting-verified]').is_checked()
  page.locator('#guide-rule-editor-dialog button[type=submit]').click();page.wait_for_function('targetTest.saved.data.targeting.side==="friendly"')
  assert not page.evaluate('targetTest.saved.data.targeting.verified')
  assert not errors,errors
  print(str(width)+': targeting editor, validation, save/reopen, ownership and verification invalidation pass')
  page.close()
 b.close()
