// Application-state smoke checks with a minimal DOM adapter, not browser QA.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function app(saved,options={}){
 const listeners={};const elements={};const store=new Map(saved||[]);
 const animations=[],idle=[],frames=[],timers=[];
 for(const id of ['#app','#toast','#import-feedback','#import-form button[type=submit]','#army-text','#import-dialog','#import-form'])elements[id]={innerHTML:'',textContent:'',value:'',style:{},showModal(){this.open=true},close(){this.open=false},addEventListener(type,fn){this[type]=fn}};
 function motionNode(){return {style:{},setAttribute(){},querySelectorAll:()=>[],remove(){},animate(frames,settings){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b});const animation={finished,cancel:()=>reject(new Error('cancelled'))};animations.push({frames,settings,finish:resolve});return animation;}};}
 const viewport={clientWidth:400,children:[],append(node){this.children.push(node);}},slide=motionNode();
 const document={querySelector:s=>s==='.guide-viewport'&&options.motion?viewport:s==='.guide-slide'&&options.motion?slide:elements[s],addEventListener:(type,fn)=>listeners[type]=fn};
 if(options.motion)document.createElement=()=>motionNode();
 const context=vm.createContext({document,window:{WARPLANNER_CONFIG:options.hosted?{}:undefined,requestAnimationFrame:options.preload?fn=>frames.push(fn):undefined,scrollTo(){},requestIdleCallback:options.warm?fn=>{idle.push(fn);return idle.length;}:undefined,cancelIdleCallback(){},matchMedia:()=>({matches:!!options.reducedMotion})},getComputedStyle:()=>({lineHeight:'16.5px'}),structuredClone,console,confirm:()=>options.confirm!==false,setTimeout:fn=>{if(options.preload)timers.push(fn);return 0;},clearTimeout(){},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
 vm.runInContext(fs.readFileSync(require.resolve('../dist/core.js'),'utf8'),context);
 context.WarPlan=context.window.WarPlan;
 vm.runInContext(fs.readFileSync(require.resolve('../dist/aeldari-data.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(require.resolve('../dist/lessons.js'),'utf8'),context);
 context.WarPlanLessons=context.window.WarPlanLessons;
 vm.runInContext(fs.readFileSync(require.resolve('../dist/activations.js'),'utf8'),context);
 context.WarPlanActivations=context.window.WarPlanActivations;
 vm.runInContext(fs.readFileSync(require.resolve('../dist/list-builder.js'),'utf8'),context);
 context.WarPlannerListBuilder=context.window.WarPlannerListBuilder;
 for(const name of ['navigation.js','unit-profiles.js','study-cards.js','practice.js','practice-ui.js'])vm.runInContext(fs.readFileSync(require.resolve('../dist/'+name),'utf8'),context);
 vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),context);
 // Existing navigation tests explicitly enter an active guide; setup tests opt out.
 if(!options.setup)vm.runInContext('state.guideStarted=true;render();',context);
 return {flushGuide(){for(let i=0;i<500&&(frames.length||timers.length);i++){frames.shift()?.();timers.shift()?.();}},prepared:()=>vm.runInContext('guidePrepared&&({ready:guidePrepared.ready,total:guidePrepared.total,count:guidePrepared.pages.size})',context),rejectPageBuilds(){vm.runInContext('buildGuidePageHTML=()=>{throw Error("Page rebuilt during navigation")}',context);},review(key,checked){listeners.change({target:{dataset:{reviewReminder:key},checked}})},toggle(id,checked){listeners.change({target:{id,checked,dataset:{}}})},warm(deadline){idle.shift()?.(deadline);},toggleDetachment(name,checked){listeners.change({target:{id:'',checked,dataset:{editorDetachment:name}}})},editorInput(field,value){listeners.input({target:{id:'',value,dataset:{listField:field}}})},editorChange(field,value){listeners.change({target:{id:'',value,dataset:{listField:field}}})},saveEditor(){listeners.submit({target:{id:'list-editor-form'},preventDefault(){}})},cloudAccount:(user,lists,service,idMap)=>context.window.setWarPlannerAccount(user,lists,service,idMap),localLists:user=>context.window.getWarPlannerLocalLists(user),cloudStatus:status=>context.window.setWarPlannerCloudStatus(status),start(){listeners.submit({target:{id:'guide-start-form'},preventDefault(){}})},change(id,value){listeners.change({target:{id,value,dataset:{}}})},account:(user,army)=>{context.window.setWarPlannerAccount(user,army);if(!options.setup)vm.runInContext('state.guideStarted=true;render();',context);},clearAccount:()=>context.window.clearWarPlannerAccount(),elements,store,animations,slide,viewport,fitPreview:element=>context.fitUnitPreview(element),click(dataset){listeners.click({preventDefault(){},target:{closest:()=>({dataset})}})},touch(type,options={}){let prevented=false;listeners[type]({target:{closest:selector=>selector==='.guide-page-shell'?{}:null},touches:[],changedTouches:[],cancelable:true,preventDefault(){prevented=true},...options});return prevented;},submit(){elements['#import-form'].submit({preventDefault(){}})},html:()=>elements['#app'].innerHTML};
}
test('guide navigation, study bookmarks, player turns and persistence',()=>{
 const a=app();assert.match(a.html(),/id="phase-tab-0"[^>]*aria-selected="true"/);assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).army.points,1965);
 assert.match(a.html(),/Start of Battle Round/);
 a.click({action:'study-next'});assert.equal(Object.keys(JSON.parse(a.store.get('warplan.prototype.v1')).completed).length,0);a.click({action:'study-next'});assert.match(a.html(),/Diviner of Futures/);
 a.click({action:'next'});assert.match(a.html(),/id="phase-tab-1"[^>]*aria-selected="true"/);
 a.click({action:'back'});assert.equal(Object.keys(JSON.parse(a.store.get('warplan.prototype.v1')).completed).length,0);
 a.click({turn:'opponent'});assert.match(a.html(),/data-turn="opponent" class="selected"/);assert.doesNotMatch(a.html(),/Diviner of Futures/);
 const reloaded=app([...a.store]);assert.match(reloaded.html(),/data-turn="opponent" class="selected"/);
 a.click({view:'army'});assert.match(a.html(),/My saved lists/);
 a.click({view:'practice'});assert.match(a.html(),/Start practice/);assert.match(a.html(),/practice_mode/);assert.doesNotMatch(a.html(),/Future update/);
});

test('navigation can be minimized and its preference survives navigation and reload',()=>{
 const a=app();a.click({action:'toggle-nav'});assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).sidebarCollapsed,true);
 a.click({view:'army'});assert.match(a.html(),/class="shell nav-collapsed"/);assert.match(a.html(),/aria-label="Expand navigation"/);
 const reloaded=app([...a.store]);assert.match(reloaded.html(),/class="shell nav-collapsed"/);reloaded.click({action:'toggle-nav'});assert.equal(JSON.parse(reloaded.store.get('warplan.prototype.v1')).sidebarCollapsed,false);
});
test('first player changes round boundaries and keeps source confirmation separate',()=>{
 const a=app();a.click({first:'opponent'});assert.match(a.html(),/data-turn="opponent" class="selected"/);assert.match(a.html(),/Start of Battle Round/);
 a.click({phase:'4'});a.click({action:'next'});assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).turn,'you');assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).round,1);
 a.click({phase:'4'});a.click({action:'next'});assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).turn,'opponent');assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).round,2);
});
test('phase 1 numeric completion marks do not mark new rules lessons studied',()=>{
 const previous={view:'guide',phase:0,round:1,turn:'you',army:require('../dist/core.js').sample,completed:{'1-you-0-0':true}};
 const a=app([['warplan.prototype.v1',JSON.stringify(previous)]]);
 assert.doesNotMatch(a.html(),/<span>✓<\/span>/);
});
test('personal rule confirmation survives reload without changing source status',()=>{
 const a=app();a.click({confirmRule:'battle-focus'});
 const b=app([...a.store]);assert.match(b.html(),/You also marked this checked/);
 assert.match(b.html(),/Compared with community references/);
 b.click({confirmRule:'battle-focus'});
 const c=app([...b.store]);assert.doesNotMatch(c.html(),/You also marked this checked/);
});
test('one instruction surface is rendered and detailed phase list starts closed',()=>{
 const a=app();assert.equal((a.html().match(/class="lesson-focus rule-core"/g)||[]).length,1);
 assert.match(a.html(),/<details class="sequence-outline">/);
 assert.doesNotMatch(a.html(),/class="aside"/);
 a.click({phase:'1'});a.click({step:'1'});
 assert.match(a.html(),/<section class="army-lessons flash-board" aria-label="Your army at this phase">/);
 assert.ok(a.html().indexOf('Your army at this phase') < a.html().indexOf('<summary>Why this matters</summary>'));
});
test('empty steps keep the army section open and show an explicit message',()=>{
 const a=app();a.click({step:'3'}); // Core CP, no unit ability window.
 assert.match(a.html(),/<section class="army-lessons" aria-label="Your army at this step">/);
 assert.match(a.html(),/No matching army abilities are listed for this step/);
 assert.ok(a.html().indexOf('Your army at this step')<a.html().indexOf('Why this matters'));
});
test('phase cards show relevant units without dropdowns or per-unit completion',()=>{
 const a=app();a.click({phase:'1'});a.click({step:'1'});
 assert.match(a.html(),/<h3>Swift as the Wind<\/h3>/);
 assert.match(a.html(),/<h3>Flitting Shadows<\/h3>/);
 assert.match(a.html(),/<h3>Avatar of Khaine<\/h3>/);
 assert.match(a.html(),/<h3>Swooping Hawks<\/h3>/);
 assert.doesNotMatch(a.html(),/<select[^>]*data-unit/);assert.doesNotMatch(a.html(),/finish-unit|Finish unit walkthrough/);
 assert.match(a.html(),/class="flash-fact"/);assert.match(a.html(),/<details class="flash-details">/);
 assert.match(a.html(),/Your army at this phase/);
 const restored=app([...a.store]);assert.match(restored.html(),/<h3>Swooping Hawks<\/h3>/);
});
test('shooting cards preserve sequencing, unit context, and low-click phase progression',()=>{
 const a=app();a.click({phase:'2'});a.click({step:'1'});
 assert.ok(a.html().indexOf('data-unit-card="unit-type-warwalkers"')<a.html().indexOf('data-unit-card="unit-type-firedragons"'));
 assert.match(a.html(),/<h3>Fire Dragons<\/h3>/);
 assert.match(a.html(),/<h4>Assured Destruction<\/h4>/);assert.match(a.html(),/<h4>Aspect Shrine Token<\/h4>/);
 assert.doesNotMatch(a.html(),/Burning Lance/);assert.doesNotMatch(a.html(),/<select[^>]*data-unit/);
 assert.doesNotMatch(a.html(),/data-unit-card="unit-type-(swoopinghawks|warpspiders)"/);
 assert.match(a.html(),/data-shared-rule="token"/);assert.match(a.html(),/Swooping Hawks/);assert.match(a.html(),/Warp Spiders/);
 a.click({action:'study-next'});assert.match(a.html(),/End of Shooting/);
 const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.activationReviewed,undefined);
});
test('collapsed cards preview rule names or the full shared-rule unit list',()=>{
 const a=app();a.click({phase:'2'});a.click({step:'1'});
 const unitHeaders=a.html().match(/<details class="flash-card unit-flash-card[^>]*>[\s\S]*?<\/summary>/g)||[];
 assert.ok(unitHeaders.length>0);
 assert.ok(unitHeaders.every(h=>!/^<details[^>]*\bopen\b/.test(h)));
 const dragons=unitHeaders.find(h=>h.includes('<h3>Fire Dragons</h3>'));
 assert.match(dragons,/class="flash-preview"/);assert.match(dragons,/Assured Destruction/);assert.match(dragons,/Aspect Shrine Token/);assert.match(dragons,/Path of the Warrior/);
 const token=a.html().match(/<details[^>]*data-shared-rule="token"[\s\S]*?<\/summary>/)[0];
 assert.match(token,/Fire Dragons/);assert.doesNotMatch(token,/Fire Dragons [12]/);assert.match(token,/Warp Spiders/);
 assert.doesNotMatch(token,/matching roster groups/);
});
test('unit previews use actual two-line height and restore the list when space increases',()=>{
 const a=app(),element={dataset:{fullPreview:'Fire Dragons · Dark Reapers · Warp Spiders'},clientWidth:200,textContent:'',scrollHeight:33};
 a.fitPreview(element);assert.equal(element.textContent,element.dataset.fullPreview);
 element.scrollHeight=50;a.fitPreview(element);assert.equal(element.textContent,'Multiple Units');
 element.clientWidth=450;element.scrollHeight=33;a.fitPreview(element);assert.equal(element.textContent,element.dataset.fullPreview);
 a.click({phase:'2'});a.click({step:'1'});
 assert.doesNotMatch(a.html(),/data-unit-preview data-full-preview=/); // Guide previews use CSS clamping, without synchronous layout reads.
 const token=a.html().match(/data-shared-rule="token"[\s\S]*?<div class="flash-unit-list">([\s\S]*?)<\/ul>/)[1];
 assert.match(token,/<li>Fire Dragons<\/li>/);assert.equal((token.match(/<li>Fire Dragons<\/li>/g)||[]).length,1);
});
test('visible turn toggle stays above rule labels and preserves the phase and matching step',()=>{
 const a=app();a.click({phase:'2'});a.click({step:'1'});
 assert.ok(a.html().indexOf('class="guide-turn-toggle"')<a.html().indexOf('class="lesson-kind"'));
 assert.match(a.html(),/data-turn="you" class="selected" aria-pressed="true"/);
 a.click({turn:'opponent'});assert.match(a.html(),/id="phase-tab-2"[^>]*aria-selected="true"/);assert.match(a.html(),/Opponent’s Shooting/);
 assert.match(a.html(),/data-turn="opponent" class="selected" aria-pressed="true"/);
 a.click({turn:'you'});assert.match(a.html(),/Unit Shooting/);
 const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.round,1);assert.equal(saved.phase,2);assert.equal(saved.firstPlayer,'you');
 assert.equal(saved.history.length,1); // Only entering Shooting, not turn previews.
});
test('small order button swaps toggle order without resetting the current phase',()=>{
 const a=app();a.click({phase:'2'});a.click({step:'1'});a.click({action:'swap-turn-order'});
 const toggle=a.html().match(/class="guide-turn-toggle"[\s\S]*?class="lesson-kind"/)[0];
 assert.ok(toggle.indexOf('data-turn="opponent"')<toggle.indexOf('data-turn="you"'));
 assert.match(a.html(),/aria-label="Put you first in the turn order"/);assert.match(a.html(),/>⇄<\/button>/);assert.match(a.html(),/Unit Shooting/);
 const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.firstPlayer,'opponent');assert.equal(saved.phase,2);assert.equal(saved.turn,'you');assert.equal(saved.round,1);
 a.click({action:'swap-turn-order'});assert.match(a.html(),/aria-label="Put opponent first in the turn order"/);
});
test('phase navigation sits between turn controls and rule labels without session clutter',()=>{
 const a=app();const html=a.html();
 const turn=html.indexOf('class="guide-turn-toggle"'),timeline=html.indexOf('class="phase-nav"'),rules=html.indexOf('class="lesson-kind"');
 assert.ok(turn>=0&&timeline>turn&&rules>timeline);
 assert.equal((html.match(/class="phase-nav"/g)||[]).length,1);
 assert.doesNotMatch(html,/Session details|class="session-top"|YOUR TURN.*ROUND 1/);
 a.click({phase:'3'});assert.match(a.html(),/id="phase-tab-3"[^>]*aria-selected="true"/);
});
test('side arrows replace footer buttons and navigate back across phase boundaries',()=>{
 const a=app();assert.match(a.html(),/aria-label="Previous page" title="Previous page" disabled/);assert.match(a.html(),/aria-label="Next page"/);
 assert.doesNotMatch(a.html(),/data-action="study-next"|data-action="step-back"|data-action="skip-step"/);
 a.click({action:'page-previous'});assert.match(a.html(),/<h2[^>]*>Start of Battle Round<\/h2>/);
 a.click({action:'page-next'});assert.match(a.html(),/<h2[^>]*>Start of Turn<\/h2>/);
 a.click({action:'page-previous'});assert.match(a.html(),/<h2[^>]*>Start of Battle Round<\/h2>/);
 a.click({phase:'1'});a.click({action:'page-previous'});assert.match(a.html(),/<h2[^>]*>End of Command<\/h2>/);
 a.click({action:'page-next'});assert.match(a.html(),/<h2[^>]*>Start of Movement<\/h2>/);
});
test('page arrows cross player turns and rounds in both directions',()=>{
 const a=app();a.click({phase:'4'});a.click({step:'5'});a.click({action:'page-next'});
 let saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.turn,'opponent');assert.equal(saved.phase,0);assert.equal(saved.round,1);
 a.click({action:'page-previous'});assert.match(a.html(),/<h2[^>]*>End of Turn<\/h2>/);
 a.click({turn:'opponent'});a.click({step:'6'});a.click({action:'page-next'});
 saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.turn,'you');assert.equal(saved.round,2);
 a.click({action:'page-previous'});saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.turn,'opponent');assert.equal(saved.round,1);assert.equal(saved.phase,4);
 assert.match(a.html(),/<h2[^>]*>End of Battle Round<\/h2>/);
});
test('swipes navigate horizontally but ignore scrolling, short gestures, controls and multiple touches',()=>{
 const a=app(),point=(x,y)=>({identifier:1,clientX:x,clientY:y});
 a.touch('touchstart',{touches:[point(130,200)]});assert.ok(a.touch('touchend',{changedTouches:[point(45,205)]}));
 assert.match(a.html(),/<h2[^>]*>Start of Turn<\/h2>/);
 a.touch('touchstart',{touches:[point(90,200)]});a.touch('touchend',{changedTouches:[point(180,203)]});
 assert.match(a.html(),/<h2[^>]*>Start of Battle Round<\/h2>/);
 a.touch('touchstart',{touches:[point(130,200)]});a.touch('touchmove',{touches:[point(135,260)]});a.touch('touchend',{changedTouches:[point(45,205)]});
 assert.match(a.html(),/<h2[^>]*>Start of Battle Round<\/h2>/);
 a.touch('touchstart',{touches:[point(130,200)]});assert.equal(a.touch('touchend',{changedTouches:[point(110,200)]}),false);
 a.touch('touchstart',{touches:[point(130,200)],target:{closest:()=>({})}});assert.equal(a.touch('touchend',{changedTouches:[point(45,200)]}),false);
 a.touch('touchstart',{touches:[point(130,200),{...point(160,200),identifier:2}]});assert.equal(a.touch('touchend',{changedTouches:[point(45,200)]}),false);
});
test('only the page body slides while turn controls and phase tabs stay outside it',()=>{
 const a=app(),html=a.html();
 assert.equal((html.match(/class="guide-slide"/g)||[]).length,1);
 assert.match(html,/role="tabpanel" aria-labelledby="phase-tab-0"/);
 assert.ok(html.indexOf('class="guide-fixed-header"')<html.indexOf('class="guide-viewport"'));
 assert.ok(html.indexOf('class="phase-nav"')<html.indexOf('class="guide-viewport"'));
 assert.doesNotMatch(html,/class="focus-heading"|class="focus-meta"|class="focus-progress"|class="topbar"/);
 assert.ok(html.indexOf('class="guide-viewport"')<html.indexOf('class="lesson-focus'));
 assert.match(html,/aria-label="Next page"[^>]*><svg viewBox="0 0 24 24"/);
});
test('rapid arrow navigation settles the previous page and accepts the next input',async()=>{
 const a=app(undefined,{motion:true});a.click({action:'page-next'});
 assert.equal(a.animations.length,2);assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,0);
 assert.match(a.viewport.children[0].innerHTML,/<h2[^>]*>Start of Turn<\/h2>/);
 assert.doesNotMatch(a.viewport.children[0].innerHTML,/guide-turn-toggle|phase-nav|guide-fixed-header/);
 assert.equal(a.animations[0].frames[1].transform,'translate3d(-400px,0,0)');
 a.click({action:'page-next'});assert.equal(a.animations.length,4);
 assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,1);
 a.animations.forEach(animation=>animation.finish());await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,2);
});
test('a touch drag follows the finger, then completes or snaps back',async()=>{
 const point=x=>({identifier:1,clientX:x,clientY:200});
 const a=app(undefined,{motion:true});a.touch('touchstart',{touches:[point(130)]});a.touch('touchmove',{touches:[point(80)]});
 assert.equal(a.slide.style.transform,'translate3d(-50px,0,0)');
 assert.equal(a.viewport.children[0].style.transform,'translate3d(350px,0,0)');
 a.touch('touchend',{changedTouches:[point(45)]});assert.equal(a.animations[0].frames[0].transform,'translate3d(-85px,0,0)');
 a.animations.forEach(animation=>animation.finish());await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,1);
 const b=app(undefined,{motion:true});b.touch('touchstart',{touches:[point(130)]});b.touch('touchmove',{touches:[point(100)]});b.touch('touchend',{changedTouches:[point(100)]});
 assert.equal(b.animations[0].frames[1].transform,'translate3d(0px,0,0)');
 b.animations.forEach(animation=>animation.finish());await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.parse(b.store.get('warplan.prototype.v1')).open,0);
});
test('reduced motion skips animation and leaving the guide cancels a pending transition',async()=>{
 const a=app(undefined,{motion:true,reducedMotion:true});a.click({action:'page-next'});
 assert.equal(a.animations.length,0);assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,1);
 const b=app(undefined,{motion:true});b.click({action:'page-next'});b.click({view:'army'});
 await new Promise(resolve=>setImmediate(resolve));
 const saved=JSON.parse(b.store.get('warplan.prototype.v1'));assert.equal(saved.view,'army');assert.equal(saved.open,0);
 assert.equal(b.slide.inert,false);
});
test('Fight cards show Fights First and army/stratagem cards show targeting instead of roster lists',()=>{
 const a=app();a.click({phase:'4'});a.click({step:'2'});
 const banshees=a.html().match(/data-unit-card="unit-type-howlingbanshees"[\s\S]*?<\/summary>/)[0];
 assert.match(banshees,/<span class="flash-fights-first">Fights First<\/span>/);
 assert.doesNotMatch(a.html(),/data-unit-card="unit-type-direavengers"/); // Its Fight rules are already shared.
 a.click({phase:'1'});a.click({step:'1'});
 const swift=a.html().match(/data-shared-rule="swift"[\s\S]*?<div class="flash-expanded">/)[0];
 assert.match(swift,/Applies to: One eligible friendly Battle Focus unit/);assert.doesNotMatch(swift,/data-unit-preview|data-full-preview/);
 a.click({phase:'2'});a.click({step:'1'});
 const strat=a.html().match(/data-shared-rule="preternatural-precision-stratagem"[\s\S]*?<p class="flash-timing">/)[0];
 assert.match(strat,/Target: One friendly Aspect Warriors unit/);assert.doesNotMatch(strat,/flash-unit-list|data-unit-preview/);
});
test('empty phase notice excludes round-boundary reminders and distinguishes missing coverage',()=>{
 const {sample}=require('../dist/core.js');
 const army={...sample,units:sample.units.filter(u=>u.name==='Dire Avengers')};
 const a=app([['warplan.prototype.v1',JSON.stringify({army,phase:0,turn:'you',round:1})]]);
 assert.match(a.html(),/No army abilities are listed for this phase in this turn/);
 assert.match(a.html(),/Battle Focus/); // Before the phase, not a Command ability.
 const unknown={...army,faction:'Space Marines'};
 const b=app([['warplan.prototype.v1',JSON.stringify({army:unknown,phase:0,turn:'you',round:1})]]);
 assert.match(b.html(),/Army-ability coverage is incomplete for this phase/);
 assert.doesNotMatch(b.html(),/No army abilities are listed for this phase in this turn/);
});
test('import review is required and untrusted content is escaped',()=>{
 const a=app();a.click({action:'import'});assert.equal(a.elements['#import-dialog'].open,true);
 a.elements['#army-text'].value='Test (100 points)\nAeldari\nAspect Host (3 Detachment Points)\nCHARACTERS\n<img src=x onerror=alert(1)> (100 points)\n • <script>alert(1)</script>';
 a.submit();assert.match(a.elements['#import-feedback'].innerHTML,/&lt;img/);assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).army.points,1965);
 a.submit();assert.equal(a.elements['#import-dialog'].open,false);assert.match(a.html(),/&lt;img/);assert.doesNotMatch(a.html(),/<script>/);
 assert.doesNotMatch(a.html(),/ARMY POINTS|class="points"/);a.click({action:'view-imported-list'});assert.match(a.html(),/Test \(100 points\)/);assert.doesNotMatch(a.html(),/<script>/);
});

test('hosted armies and progress are isolated by authenticated account',()=>{
 const a=app(undefined,{hosted:true});
 assert.doesNotMatch(a.html(),/Battle Focus/);
 a.account({id:'owner'},require('../dist/core.js').sample);
 assert.match(a.html(),/Battle Focus/);a.click({phase:'2'});
 assert.ok(a.store.has('warplanner.account.owner.v1'));
 a.clearAccount();a.account({id:'other'},null);
 assert.match(a.html(),/Bring your army/);assert.doesNotMatch(a.html(),/Asurmen|Aspect Host/);
 assert.equal(JSON.parse(a.store.get('warplanner.account.other.v1')).army.units.length,0);
 a.account({id:'owner'},require('../dist/core.js').sample);
 assert.match(a.html(),/id="phase-tab-2"[^>]*aria-selected="true"/);
});
test('hosted accounts never inherit the old shared browser roster',()=>{
 const saved={army:require('../dist/core.js').sample,phase:0,round:1,turn:'you'};
 const a=app([['warplan.prototype.v1',JSON.stringify(saved)]],{hosted:true});
 a.account({id:'new'},null);assert.match(a.html(),/Bring your army/);assert.doesNotMatch(a.html(),/Aspect Host/);
});

test('My army opens the saved-list library and selected list has metadata without points',()=>{
 const a=app();a.click({view:'army'});
 assert.match(a.html(),/My saved lists/);assert.doesNotMatch(a.html(),/class="unit-card"|1965|135 pts/);
 a.click({openList:'list-1'});
 assert.match(a.html(),/<h1>Aspect Host<\/h1>/);assert.match(a.html(),/<dt>Roster<\/dt>/);assert.match(a.html(),/<dt>Detachment<\/dt>/);assert.match(a.html(),/Priority Assets/);
 assert.match(a.html(),/View imported list/);assert.match(a.html(),/<h3>Asurmen<\/h3>/);assert.doesNotMatch(a.html(),/1965|135 pts|ARMY POINTS/);
 a.click({action:'list-library'});assert.match(a.html(),/My saved lists/);assert.doesNotMatch(a.html(),/class="unit-card"/);
});
test('imports append lists and switching restores the correct army and persists both',()=>{
 const a=app();
 function importList(name,unit){a.click({action:'import'});a.elements['#army-text'].value=name+' (100 points)\nAeldari\nAspect Host (3 Detachment Points)\nPriority Assets\nStrike Force (2000 points)\nCHARACTERS\n'+unit+' (100 points)';a.submit();a.submit();}
 importList('Dragons practice','Fire Dragons');importList('Hawks practice','Swooping Hawks');
 const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.savedLists.length,3);
 a.click({view:'army'});assert.match(a.html(),/Dragons practice/);assert.match(a.html(),/Hawks practice/);
 a.click({openList:saved.savedLists[1].id});assert.match(a.html(),/<h3>Fire Dragons<\/h3>/);assert.doesNotMatch(a.html(),/<h3>Swooping Hawks<\/h3>/);
 a.click({action:'view-imported-list'});assert.match(a.html(),/<pre>Dragons practice \(100 points\)/);
 const restored=app([...a.store]);assert.match(restored.html(),/<h1>Dragons practice<\/h1>/);
 restored.click({view:'army'});assert.match(restored.html(),/Hawks practice/);
});

test('guide opens on Start and moves coverage out of active pages',()=>{
 const a=app(undefined,{setup:true});assert.match(a.html(),/Start your guide/);assert.match(a.html(),/11th edition/);assert.match(a.html(),/Content coverage/);assert.doesNotMatch(a.html(),/phase-tab-0|page-next/);
 a.change('guide-first-player','opponent');a.start();
 assert.match(a.html(),/data-turn="opponent" class="selected"/);assert.match(a.html(),/Start of Battle Round/);assert.match(a.html(),/Guide settings/);
 assert.doesNotMatch(a.html(),/11th edition|Content coverage|class="focus-footer"/);
 const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.guideStarted,true);assert.equal(saved.firstPlayer,'opponent');assert.equal(saved.turn,'opponent');
});
test('guide list selector groups alliances in order and sorts faction and list names',()=>{
 const core=require('../dist/core.js');
 const entries=[['x2','Tyranids','Swarm'],['c2','World Eaters','Axes'],['i2','Space Marines','Zulu'],['x1','Aeldari','Aspects'],['c1','Chaos Space Marines','Raid'],['i1','Adeptus Custodes','Guard'],['i3','Space Marines','Alpha']].map(([id,faction,name])=>({id,army:{...core.sample,faction,name},warnings:[],renames:{}}));
 const a=app([['warplan.prototype.v1',JSON.stringify({army:core.sample,phase:0,savedLists:entries,activeListId:'x1'})]],{setup:true});
 const html=a.html();assert.ok(html.indexOf('label="Space Marines"')<html.indexOf('label="Imperium"'));assert.ok(html.indexOf('label="Imperium"')<html.indexOf('label="Chaos"'));assert.ok(html.indexOf('label="Chaos"')<html.indexOf('label="Xenos"'));
 for(const [first,last] of [['i3','i1'],['i3','i2'],['c1','c2'],['x1','x2']])assert.ok(html.indexOf('value="'+first+'"')<html.indexOf('value="'+last+'"'));
 a.change('guide-army-list','c1');a.start();const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.activeListId,'c1');assert.equal(saved.army.name,'Raid');
});
test('settings returns to setup and resets the walkthrough while keeping lists',()=>{
 const a=app();a.click({action:'page-next'});a.click({phase:'2'});a.click({action:'reset-guide'});
 assert.match(a.html(),/Start your guide/);let saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.phase,0);assert.equal(Object.keys(saved.completed).length,0);assert.equal(saved.savedLists.length,1);
 a.start();a.click({action:'choose-guide-army'});assert.match(a.html(),/Start your guide/);
});
test('empty-account guide setup offers import and disables Start',()=>{
 const a=app(undefined,{hosted:true,setup:true});a.account({id:'empty'},null);a.click({view:'guide'});
 assert.match(a.html(),/Start your guide/);assert.match(a.html(),/class="primary guide-start-button" type="submit" disabled/);a.start();assert.match(a.html(),/Start your guide/);
});

test('font preference persists across reload and guide reset without changing the current step',()=>{
 const a=app();a.click({phase:'2'});a.click({step:'1'});a.change('guide-font-size','large');
 let saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.guideFontSize,'large');assert.equal(saved.phase,2);assert.equal(saved.open,1);
 const b=app([...a.store]);assert.match(b.html(),/data-font-size="large"/);assert.match(b.html(),/<option value="large" selected>/);
 b.click({action:'reset-guide'});b.start();assert.match(b.html(),/data-font-size="large"/);
 b.change('guide-font-size','unexpected');assert.equal(JSON.parse(b.store.get('warplan.prototype.v1')).guideFontSize,'large');
 b.change('guide-font-size','medium');assert.equal(JSON.parse(b.store.get('warplan.prototype.v1')).guideFontSize,'medium');
});

test('account storage loads server lists over a stale cache and submits changes through its service',()=>{
 const army=require('../dist/core.js').sample,old={...army,name:'Old device copy'};
 const cached={army:old,phase:0,activeListId:'a',savedLists:[{id:'a',army:old,warnings:[],renames:{}}]};
 const a=app([['warplanner.account.owner.v1',JSON.stringify(cached)]],{hosted:true,setup:true});
 const calls=[],service={schedule:lists=>calls.push(structuredClone(lists)),dispose(){},flush:()=>Promise.resolve()};
 a.cloudAccount({id:'owner'},[{id:'a',army:{...army,name:'Account version'},warnings:[],renames:{},cloudRevision:2}],service);
 a.click({view:'army'});assert.match(a.html(),/Account version/);assert.doesNotMatch(a.html(),/Old device copy/);assert.match(a.html(),/Lists saved to account/);assert.ok(calls.length>0);
 a.cloudStatus('error');a.click({view:'army'});assert.match(a.html(),/Your lists have not saved to your account yet/);assert.match(a.html(),/data-action="retry-list-save"/);
});
test('migration reads only the authenticated account cache and retains all its local lists',()=>{
 const army=require('../dist/core.js').sample;
 const a=app([['warplanner.account.owner.v1',JSON.stringify({army,phase:0,savedLists:[{id:'local',army,warnings:[],renames:{}}]})]],{hosted:true});
 assert.equal(a.localLists({id:'owner'}).length,1);assert.equal(a.localLists({id:'other'}).length,0);
});

test('site-created lists are saved separately and cancelling an edit preserves the saved version',()=>{
 const a=app();a.click({view:'army'});a.click({action:'create-list'});assert.match(a.html(),/Create a list/);
 a.editorInput('name','Built on site');a.editorChange('detachment','Windrider Host');a.editorChange('disposition','Disruption');a.click({addUnit:'windriders'});a.saveEditor();
 let saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.savedLists.length,2);assert.equal(saved.army.name,'Built on site');assert.equal(saved.army.origin,'builder');assert.equal(saved.army.units[0].name,'Windriders');assert.equal(saved.army.originalExport,undefined);
 a.click({action:'edit-list'});a.editorInput('name','Unsaved rename');a.click({action:'cancel-list-editor'});assert.match(a.html(),/<h1>Built on site<\/h1>/);
 saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.army.name,'Built on site');
});

test('editing a legacy starter preserves the original roster separately from removed units',()=>{
 const a=app();a.click({view:'army'});a.click({openList:'list-1'});a.click({action:'edit-list'});a.editorInput('name','Updated starter');a.click({removeUnit:'sample-17'});a.saveEditor();
 const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.army.units.length,17);assert.equal(saved.army.originalRoster.units.length,18);
 assert.ok(saved.army.originalRoster.units.some(u=>u.name==='Warp Spiders'));a.click({action:'view-imported-list'});assert.match(a.html(),/<pre>[\s\S]*Warp Spiders/);
});

test('the editor saves multiple checked detachments and displays them in the library and reference',()=>{
 const a=app();a.click({view:'army'});a.click({action:'create-list'});a.editorInput('name','Combined host');a.toggleDetachment('Warhost',true);a.toggleDetachment('Aspect Host',true);a.editorChange('disposition','Priority Assets');a.click({addUnit:'fire-dragons'});a.saveEditor();
 const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.deepEqual(saved.army.detachments,['Warhost','Aspect Host']);assert.match(a.html(),/Warhost, Aspect Host/);assert.match(a.html(),/Martial Grace/);assert.match(a.html(),/Path of the Warrior/);
 a.click({view:'army'});assert.match(a.html(),/Warhost, Aspect Host/);
});

test('deleting the last saved list clears the active guide and does not restore the starter roster',()=>{
 const a=app();a.click({view:'army'});assert.match(a.html(),/data-delete-list="list-1"/);a.click({deleteList:'list-1'});const saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.savedLists.length,0);assert.equal(saved.army.units.length,0);assert.equal(saved.guideStarted,false);assert.match(a.html(),/Import list/);assert.doesNotMatch(a.html(),/data-open-list=/);const loaded=app([...a.store],{setup:true});assert.doesNotMatch(loaded.html(),/data-open-list="list-1"/);
});
test('cancelling list deletion preserves the saved roster',()=>{
 const a=app(undefined,{confirm:false});a.click({view:'army'});a.click({deleteList:'list-1'});assert.match(a.html(),/data-open-list="list-1"/);assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).savedLists.length,1);
});
test('account deletion removes only the selected list and switches the active roster safely',async()=>{
 const sample=require('../dist/core.js').sample,a=app(undefined,{hosted:true});let removed;
 const service={schedule(){},dispose(){},remove:async id=>{removed=id;return id;}};
 a.cloudAccount({id:'owner'},[{id:'one',army:structuredClone(sample),renames:{},warnings:[]},{id:'two',army:{...structuredClone(sample),name:'Second roster'},renames:{},warnings:[]}],service);a.click({view:'army'});a.click({deleteList:'one'});await new Promise(r=>setImmediate(r));assert.equal(removed,'one');const saved=JSON.parse(a.store.get('warplanner.account.owner.v1'));assert.equal(saved.savedLists.length,1);assert.equal(saved.activeListId,'two');assert.equal(saved.army.name,'Second roster');assert.equal(saved.guideStarted,false);
});
test('a failed account delete keeps the list and renders a safe error',async()=>{
 const sample=require('../dist/core.js').sample,a=app(undefined,{hosted:true});a.cloudAccount({id:'owner'},[{id:'one',army:structuredClone(sample),renames:{},warnings:[]}],{schedule(){},dispose(){},remove:async()=>{throw Error('<offline>')}});a.click({view:'army'});a.click({deleteList:'one'});await new Promise(r=>setImmediate(r));assert.match(a.html(),/Could not delete this list/);assert.match(a.html(),/&lt;offline&gt;/);assert.match(a.html(),/data-open-list="one"/);
});

test('guide progress stays local while roster edits still reach account list storage',()=>{
 const army=structuredClone(require('../dist/core.js').sample),calls=[];
 const a=app(undefined,{hosted:true,setup:true});
 a.cloudAccount({id:'guide-cache-owner'},[{id:'one',army,warnings:[],renames:{}}],{schedule:lists=>calls.push(structuredClone(lists)),dispose(){}});
 const initial=calls.length;assert.ok(initial>0);
 a.start();a.click({phase:'2'});a.click({step:'1'});a.click({turn:'opponent'});a.click({action:'toggle-nav'});
 assert.equal(calls.length,initial,'navigation should not schedule unchanged lists');
 const saved=JSON.parse(a.store.get('warplanner.account.guide-cache-owner.v1'));
 assert.equal(saved.guideStarted,true);assert.equal(saved.phase,2);assert.equal(saved.turn,'opponent');
 a.click({view:'army'});a.click({openList:'one'});a.click({action:'edit-list'});a.editorInput('name','Updated after game');a.saveEditor();
 assert.equal(calls.length,initial+1);assert.equal(calls.at(-1)[0].army.name,'Updated after game');
 const b=app([...a.store],{hosted:true,setup:true});b.cloudAccount({id:'guide-cache-owner'},calls.at(-1),{schedule:lists=>calls.push(structuredClone(lists)),dispose(){}});
 assert.equal(calls.length,initial+2,'a new account connection must establish its own save baseline');
});

test('swipe settlement shortens with the distance remaining instead of adding a fixed delay',async()=>{
 const point=x=>({identifier:1,clientX:x,clientY:200});
 const arrow=app(undefined,{motion:true});arrow.click({action:'page-next'});assert.equal(arrow.animations[0].settings.duration,140);
 const swipe=app(undefined,{motion:true});swipe.touch('touchstart',{touches:[point(350)]});swipe.touch('touchmove',{touches:[point(50)]});swipe.touch('touchend',{changedTouches:[point(50)]});assert.equal(swipe.animations[0].settings.duration,60);assert.ok(swipe.animations[0].settings.duration<arrow.animations[0].settings.duration);
 swipe.animations.forEach(a=>a.finish());await new Promise(r=>setImmediate(r));assert.equal(JSON.parse(swipe.store.get('warplan.prototype.v1')).open,1);
 const cancelled=app(undefined,{motion:true});cancelled.touch('touchstart',{touches:[point(180)]});cancelled.touch('touchmove',{touches:[point(150)]});cancelled.touch('touchend',{changedTouches:[point(150)]});assert.equal(cancelled.animations[0].settings.duration,110);cancelled.animations.forEach(a=>a.finish());await new Promise(r=>setImmediate(r));assert.equal(JSON.parse(cancelled.store.get('warplan.prototype.v1')).open,0);
});

test('idle preparation reuses the neighboring page and invalidates it when leaving the guide',async()=>{
 const a=app(undefined,{motion:true,warm:true});a.warm();const preview=a.viewport.children[0];assert.ok(preview);const count=a.viewport.children.length;a.click({action:'page-next'});assert.equal(a.viewport.children.length,count);assert.equal(a.animations.length,2);a.animations.forEach(animation=>animation.finish());await new Promise(r=>setImmediate(r));assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,1);
 const b=app(undefined,{motion:true,warm:true});b.click({view:'army'});b.warm();assert.equal(b.viewport.children.length,0);assert.equal(JSON.parse(b.store.get('warplan.prototype.v1')).view,'army');
});

test('Guide reminder settings persist independently and default safely for older saved sessions',()=>{
 const a=app();assert.match(a.html(),/id="guide-show-core-stratagems" type="checkbox" >/);assert.match(a.html(),/id="guide-show-deep-strike" type="checkbox" checked/);
 a.toggle('guide-show-core-stratagems',true);a.toggle('guide-show-deep-strike',false);
 let saved=JSON.parse(a.store.get('warplan.prototype.v1'));assert.equal(saved.guideShowCoreStratagems,true);assert.equal(saved.guideShowDeepStrike,false);
 const b=app([...a.store]);assert.match(b.html(),/id="guide-show-core-stratagems" type="checkbox" checked/);assert.match(b.html(),/id="guide-show-deep-strike" type="checkbox" >/);
 b.click({phase:'1'});b.click({step:'1'});assert.doesNotMatch(b.html(),/<h4>Deep Strike<\/h4>/);b.toggle('guide-show-deep-strike',true);assert.match(b.html(),/<h4>Deep Strike<\/h4>/);
 saved=JSON.parse(b.store.get('warplan.prototype.v1'));assert.equal(saved.guideShowCoreStratagems,true);
});

test('Draw secondaries appears at own Command start and never in the opponent turn',()=>{
 const a=app();a.click({step:'2'});assert.match(a.html(),/Draw secondaries/);assert.match(a.html(),/Fixed Missions/);
 a.click({turn:'opponent'});assert.doesNotMatch(a.html(),/Draw secondaries/);
});

test('saved lists group by army alliance and alphabetize names without changing stored list order',()=>{
 const {sample}=require('../dist/core.js');
 const lists=[['x-z','Orks','Zulu'],['i-z','Astra Militarum','Zulu Guard'],['m-z','Space Marines','Zulu Marines'],['c-z','World Eaters','Zulu Chaos'],['x-a','Aeldari','alpha'],['i-a','Adeptus Custodes','Alpha Guard'],['m-a','Space Marines','Alpha Marines'],['c-a','Chaos Space Marines','Alpha Chaos'],['other','Unlisted faction','Unknown']].map(([id,faction,name])=>({id,army:{...sample,faction,name},warnings:[],renames:{}}));
 const a=app([['warplan.prototype.v1',JSON.stringify({army:lists[0].army,savedLists:lists,activeListId:'x-z',phase:0})]]);a.click({view:'army'});const html=a.html();
 const groups=['Space Marines','Imperium','Chaos','Xenos','Other'];for(let i=1;i<groups.length;i++)assert.ok(html.indexOf('data-army-group="'+groups[i-1]+'"')<html.indexOf('data-army-group="'+groups[i]+'"'),JSON.stringify(groups.map(g=>[g,html.indexOf('data-army-group="'+g+'"')])));
 for(const group of ['x','i','m','c'])assert.ok(html.indexOf('data-open-list="'+group+'-a"')<html.indexOf('data-open-list="'+group+'-z"'));
 assert.deepEqual(JSON.parse(a.store.get('warplan.prototype.v1')).savedLists.map(l=>l.id),lists.map(l=>l.id));
 for(const {id} of lists){assert.match(html,new RegExp('data-open-list="'+id+'"'));assert.match(html,new RegExp('data-delete-list="'+id+'"'));}
 a.click({openList:'x-a'});assert.match(a.html(),/alpha/);
});

test('home development notice retains pending areas, explains accuracy checks and links to rule reports',()=>{
 const a=app(undefined,{setup:true});a.click({view:'overview'});assert.match(a.html(),/WarPlanner is still in early development/);assert.match(a.html(),/confirm it against the current official rules/);assert.match(a.html(),/Early development<\/h2>/);assert.doesNotMatch(a.html(),/<p>(World Eaters|Emperor’s Children|Leagues of Votann|Genestealer Cults) ·/);assert.match(a.html(),/data-view="guide" data-action="open-rule-report">Report a rule error/);a.click({view:'guide',action:'open-rule-report'});assert.match(a.html(),/start the Guide to open the rule-report form/);
});

test('optional review marks persist without changing reminders or blocking navigation',()=>{
 const a=app();a.click({step:'2'});
 const match=a.html().match(/data-review-reminder="([^"]+)"/);assert.ok(match);
 const key=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&');
 a.review(key,true);
 let saved=JSON.parse(a.store.get('warplan.prototype.v1'));
 assert.equal(saved.reviewedReminders[key],true);
 assert.equal(Object.keys(saved.completed).length,0);
 const reloaded=app([...a.store]);assert.match(reloaded.html(),/reminder-reviewed/);
 assert.match(reloaded.html(),/Diviner of Futures/);
 reloaded.review(key,false);
 assert.equal(JSON.parse(reloaded.store.get('warplan.prototype.v1')).reviewedReminders[key],undefined);
 a.click({phase:'1'});assert.match(a.html(),/id="phase-tab-1"[^>]*aria-selected="true"/);
 a.click({action:'clear-phase-reviews'});
 assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).reviewedReminders[key],true);
 a.click({phase:'0'});a.click({action:'clear-phase-reviews'});
 assert.equal(Object.keys(JSON.parse(a.store.get('warplan.prototype.v1')).reviewedReminders).length,0);
 a.review(key,true);a.click({action:'reset-guide'});
 assert.equal(Object.keys(JSON.parse(a.store.get('warplan.prototype.v1')).reviewedReminders).length,0);
});
test('forward page navigation does not mark gameplay or reading as complete',()=>{
 const a=app();a.click({action:'page-next'});a.click({action:'page-next'});
 assert.equal(Object.keys(JSON.parse(a.store.get('warplan.prototype.v1')).completed).length,0);
 assert.match(a.html(),/review marks are optional/);
 assert.match(a.html(),/Explanations &amp; learning|Explanations & learning/);
});

test('idle preparation yields when there is insufficient idle time',()=>{
 const a=app(undefined,{motion:true,warm:true});
 a.warm({timeRemaining:()=>0});assert.equal(a.viewport.children.length,0);
 a.warm({timeRemaining:()=>20});assert.equal(a.viewport.children.length,1);
});

test('Start prepares every page for both players and reuses templates across phases and rounds',()=>{
 const a=app(undefined,{setup:true,preload:true});a.start();
 assert.match(a.html(),/Preparing your guide/);assert.equal(a.prepared().ready,false);
 a.flushGuide();const prepared=a.prepared();assert.equal(prepared.ready,true);assert.equal(prepared.count,prepared.total);assert.ok(prepared.total>30);
 a.rejectPageBuilds();
 for(const turn of ['you','opponent']){a.click({turn});for(let phase=0;phase<5;phase++){a.click({phase:String(phase)});a.click({action:'page-next'});}}
 a.click({action:'round-up'});a.click({action:'page-next'});assert.doesNotMatch(a.html(),/Preparing your guide/);
});
test('leaving during guide preparation cancels it and returning to Start can restart safely',()=>{
 const a=app(undefined,{setup:true,preload:true});a.start();a.click({action:'choose-guide-army'});a.flushGuide();
 assert.match(a.html(),/Start your guide/);assert.equal(a.prepared(),null);
 a.start();a.flushGuide();assert.equal(a.prepared().ready,true);
 a.toggle('guide-show-core-stratagems',true);assert.match(a.html(),/Preparing your guide/);a.flushGuide();assert.equal(a.prepared().ready,true);
});
