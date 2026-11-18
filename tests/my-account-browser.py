# Run with Python Playwright and Chromium installed. Uses local files; no account or network writes.
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(1280,720),(1024,600),(1280,500),(390,844)]:
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
   localStorage.setItem('warplanner.onboarding.account-qa.v1','done');setWarPlannerAccount({id:'account-qa',email:'player@example.com'},[]);
   window.accountTest={updates:[],deletions:0,fail:false};let id='account-qa';const user={id,email:'player@example.com'};
   const client={auth:{getUser:async()=>({data:{user}}),updateUser:async args=>{accountTest.updates.push(args);return {data:{user:{...user,...(args.email?{new_email:args.email}:{})}}};}},functions:{invoke:async(_name,args)=>{accountTest.request=args;return {data:{deleted:true}};}}};
   const service=WarPlannerAccountService.create({client,config:{supabaseUrl:'https://example.test',supabasePublishableKey:'public'},getAccountId:()=>id,createClient:()=>({auth:{signInWithPassword:async()=>accountTest.fail?{error:{}}:{data:{user}},signOut:async()=>({})}}),onDeleted:async()=>{accountTest.deletions++;id=null;WarPlannerAccount.setService(null);clearWarPlannerAccount();}});
   WarPlannerAccount.setService(service,user);
  }""")
  page.locator('nav [data-view=account]').click();assert page.locator('.account-page h1').inner_text()=='My Account'
  if width>650:
   page.locator('[data-auth-signout]').scroll_into_view_if_needed();rect=page.locator('[data-auth-signout]').bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=height+1
   sidebar=page.locator('.sidebar');assert sidebar.evaluate('(s)=>getComputedStyle(s).overflowY')=='auto'
   page.locator('.site-footer').scroll_into_view_if_needed();assert sidebar.bounding_box()['y']+sidebar.bounding_box()['height']<=page.locator('.site-footer').bounding_box()['y']+1
   page.locator('[data-action=toggle-nav]').click();assert page.locator('nav [data-view=account]').is_visible();page.locator('[data-action=toggle-nav]').click()
  page.locator('#current-password').fill('old-password');page.locator('#new-password').fill('new-password');page.locator('#confirm-new-password').fill('different-password');page.locator('[data-account-form=password] button').click()
  assert 'don’t match' in page.locator('[data-account-form=password] .account-result').inner_text();assert page.evaluate('accountTest.updates.length')==0
  page.locator('#confirm-new-password').fill('new-password');page.locator('[data-account-form=password] button').click();page.wait_for_function('accountTest.updates.length===1')
  assert page.locator('#current-password').input_value()=='';assert page.locator('[data-account-form=password] .account-result').inner_text()=='Password updated.'
  page.locator('#new-email').fill('updated@example.com');page.locator('#email-password').fill('old-password');page.locator('[data-account-form=email] button').click();page.wait_for_function('accountTest.updates.length===2')
  assert 'Check your email' in page.locator('[data-account-form=email] .account-result').inner_text();assert page.locator('[data-account-email]').inner_text()=='player@example.com'
  page.locator('.account-danger summary').click();page.locator('#delete-password').fill('old-password');page.locator('#delete-confirmation').fill('NO');page.locator('[data-account-form=delete] button').click();assert page.evaluate('accountTest.deletions')==0
  page.locator('#delete-confirmation').fill('DELETE');page.locator('[data-account-form=delete] button').click();page.wait_for_function('accountTest.deletions===1');assert not page.locator('.account-page').count()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  print(str(width)+'×'+str(height)+': navigation, compact sidebar, password mismatch, updates, email confirmation and explicit deletion checks pass')
  page.close()
 b.close()
