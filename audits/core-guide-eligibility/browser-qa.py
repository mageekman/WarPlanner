from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import json
root=Path('/workspace/warplanner-work/docs')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def route(r):
  path=urlparse(r.request.url).path.lstrip('/') or 'index.html';requests.append(path)
  if path in ['config.js','auth.js','vendor/supabase.js']:r.fulfill(body='',content_type='application/javascript');return
  file=root/path
  if not file.is_file():r.abort();return
  data=file.read_bytes()
  if path=='index.html':data=data.replace(b'id="app" hidden',b'id="app"').replace(b'id="auth-screen"',b'style="display:none" id="auth-screen"')
  r.fulfill(body=data,content_type='text/html' if path.endswith('.html') else 'text/css' if path.endswith('.css') else 'application/javascript')
 page.route('**/*',route);page.goto('http://warplanner.local/');page.wait_for_selector('#guide-start-form')
 rows=json.loads(Path('/tmp/core-eligibility-rows.json').read_text())
 result=page.evaluate("""rows=>{WarPlannerContent.apply(rows);state.army={...state.army,units:['Shroud Runners','Falcon','Wave Serpent','Starweaver','Wraithguard'].map((name,i)=>({id:'verify-'+i,name,group:'',details:[]}))};state.phase=2;state.open=1;state.guideStarted=true;render();const deck=guideSession.deck(state,WarPlanActivations.steps(state)[1]);return Object.fromEntries(deck.shared.filter(a=>a.category==='core').map(a=>[a.sourceRuleId,a.appliesTo.flatMap(u=>u.members.map(m=>m.name))]))}""",rows)
 assert result['firing-deck']==['Starweaver'],result
 assert sorted(result['damaged'])==['Falcon','Wave Serpent'],result
 assert 'feel-no-pain' not in result,result
 page.wait_for_selector('.guide-fixed-header')
 assert not errors,errors
 target=Path('/workspace/warplanner-work/audits/core-guide-eligibility');target.mkdir(exist_ok=True)
 page.screenshot(path=str(target/'guide-mobile.png'),full_page=True)
 (target/'browser-results.json').write_text(json.dumps({'coreTargets':result,'errors':errors},indent=2))
 print(json.dumps(result));browser.close()
