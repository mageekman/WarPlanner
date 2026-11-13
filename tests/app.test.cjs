// Application-state smoke checks with a minimal DOM adapter, not browser QA.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function app(saved,options={}){
 const listeners={};const elements={};const store=new Map(saved||[]);
 const animations=[];
 for(const id of ['#app','#toast','#import-feedback','#import-form button[type=submit]','#army-text','#import-dialog','#import-form'])elements[id]={innerHTML:'',textContent:'',value:'',style:{},showModal(){this.open=true},close(){this.open=false},addEventListener(type,fn){this[type]=fn}};
 function motionNode(){return {style:{},setAttribute(){},querySelectorAll:()=>[],remove(){},animate(frames,settings){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b});const animation={finished,cancel:()=>reject(new Error('cancelled'))};animations.push({frames,settings,finish:resolve});return animation;}};}
 const viewport={clientWidth:400,children:[],append(node){this.children.push(node);}},slide=motionNode();
 const document={querySelector:s=>s==='.guide-viewport'&&options.motion?viewport:s==='.guide-slide'&&options.motion?slide:elements[s],addEventListener:(type,fn)=>listeners[type]=fn};
 if(options.motion)document.createElement=()=>motionNode();
 const context=vm.createContext({document,window:{WARPLANNER_CONFIG:options.hosted?{}:undefined,scrollTo(){},matchMedia:()=>({matches:!!options.reducedMotion})},getComputedStyle:()=>({lineHeight:'16.5px'}),structuredClone,console,confirm:()=>true,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
 vm.runInContext(fs.readFileSync(require.resolve('../dist/core.js'),'utf8'),context);
 context.WarPlan=context.window.WarPlan;
 vm.runInContext(fs.readFileSync(require.resolve('../dist/aeldari-data.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(require.resolve('../dist/lessons.js'),'utf8'),context);
 context.WarPlanLessons=context.window.WarPlanLessons;
 vm.runInContext(fs.readFileSync(require.resolve('../dist/activations.js'),'utf8'),context);
 context.WarPlanActivations=context.window.WarPlanActivations;
 vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'),'utf8'),context);
 // Existing navigation tests explicitly enter an active guide; setup tests opt out.
 if(!options.setup)vm.runInContext('state.guideStarted=true;render();',context);
 return {start(){listeners.submit({target:{id:'guide-start-form'},preventDefault(){}})},change(id,value){listeners.change({target:{id,value,dataset:{}}})},account:(user,army)=>{context.window.setWarPlannerAccount(user,army);if(!options.setup)vm.runInContext('state.guideStarted=true;render();',context);},clearAccount:()=>context.window.clearWarPlannerAccount(),elements,store,animations,slide,viewport,fitPreview:element=>context.fitUnitPreview(element),click(dataset){listeners.click({target:{closest:()=>({dataset})}})},touch(type,options={}){let prevented=false;listeners[type]({target:{closest:selector=>selector==='.guide-page-shell'?{}:null},touches:[],changedTouches:[],cancelable:true,preventDefault(){prevented=true},...options});return prevented;},submit(){elements['#import-form'].submit({preventDefault(){}})},html:()=>elements['#app'].innerHTML};
}
test('guide navigation, study bookmarks, player turns and persistence',()=>{
 const a=app();assert.match(a.html(),/id="phase-tab-0"[^>]*aria-selected="true"/);assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).army.points,1965);
 assert.match(a.html(),/Start of Battle Round/);
 a.click({action:'study-next'});assert.equal(Object.keys(JSON.parse(a.store.get('warplan.prototype.v1')).completed).length,1);a.click({action:'study-next'});assert.match(a.html(),/Diviner of Futures/);
 a.click({action:'next'});assert.match(a.html(),/id="phase-tab-1"[^>]*aria-selected="true"/);
 a.click({action:'back'});assert.equal(Object.keys(JSON.parse(a.store.get('warplan.prototype.v1')).completed).length,2);
 a.click({turn:'opponent'});assert.match(a.html(),/data-turn="opponent" class="selected"/);assert.doesNotMatch(a.html(),/Diviner of Futures/);
 const reloaded=app([...a.store]);assert.match(reloaded.html(),/data-turn="opponent" class="selected"/);
 a.click({view:'army'});assert.match(a.html(),/My saved lists/);
 a.click({view:'practice'});assert.match(a.html(),/Future update/);
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
 assert.match(a.html(),/<details class="army-lessons flash-board" open>/);
 assert.ok(a.html().indexOf('Your army at this phase') < a.html().indexOf('<summary>Why this matters</summary>'));
});
test('empty steps keep the army section open and show an explicit message',()=>{
 const a=app();a.click({step:'3'}); // Core CP, no unit ability window.
 assert.match(a.html(),/<details class="army-lessons" open>/);
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
 assert.ok(a.html().indexOf('data-unit-card="sample-16"')<a.html().indexOf('data-unit-card="sample-12"'));
 assert.match(a.html(),/<h3>Fire Dragons<\/h3>/);
 assert.match(a.html(),/<h4>Assured Destruction<\/h4>/);assert.match(a.html(),/<h4>Aspect Shrine Token<\/h4>/);
 assert.doesNotMatch(a.html(),/Burning Lance/);assert.doesNotMatch(a.html(),/<select[^>]*data-unit/);
 assert.doesNotMatch(a.html(),/data-unit-card="sample-(14|15|17)"/);
 assert.match(a.html(),/data-shared-rule="token"/);assert.match(a.html(),/Swooping Hawks 1/);assert.match(a.html(),/Warp Spiders/);
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
 assert.match(token,/Fire Dragons 1/);assert.match(token,/Fire Dragons 2/);assert.match(token,/Warp Spiders/);
 assert.doesNotMatch(token,/matching roster groups/);
});
test('unit previews use actual two-line height and restore the list when space increases',()=>{
 const a=app(),element={dataset:{fullPreview:'Fire Dragons 1 · Fire Dragons 2 · Warp Spiders'},clientWidth:200,textContent:'',scrollHeight:33};
 a.fitPreview(element);assert.equal(element.textContent,element.dataset.fullPreview);
 element.scrollHeight=50;a.fitPreview(element);assert.equal(element.textContent,'Multiple Units');
 element.clientWidth=450;element.scrollHeight=33;a.fitPreview(element);assert.equal(element.textContent,element.dataset.fullPreview);
 a.click({phase:'2'});a.click({step:'1'});
 assert.match(a.html(),/data-unit-preview data-full-preview=/);
 const token=a.html().match(/data-shared-rule="token"[\s\S]*?<div class="flash-unit-list">([\s\S]*?)<\/ul>/)[1];
 assert.match(token,/<li>Fire Dragons 1<\/li>/);assert.match(token,/<li>Fire Dragons 2<\/li>/);
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
test('arrow animation previews the next whole page and commits only once at the end',async()=>{
 const a=app(undefined,{motion:true});a.click({action:'page-next'});
 assert.equal(a.animations.length,2);assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,0);
 assert.match(a.viewport.children[0].innerHTML,/<h2[^>]*>Start of Turn<\/h2>/);
 assert.doesNotMatch(a.viewport.children[0].innerHTML,/guide-turn-toggle|phase-nav|guide-fixed-header/);
 assert.equal(a.animations[0].frames[1].transform,'translate3d(-400px,0,0)');
 a.click({action:'page-next'});assert.equal(a.animations.length,2);
 a.animations.forEach(animation=>animation.finish());await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.parse(a.store.get('warplan.prototype.v1')).open,1);
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
 const banshees=a.html().match(/data-unit-card="group-3"[\s\S]*?<\/summary>/)[0];
 assert.match(banshees,/<span class="flash-fights-first">Fights First<\/span>/);
 assert.doesNotMatch(a.html(),/data-unit-card="group-1"/); // Its Fight rules are already shared.
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
 const html=a.html();assert.ok(html.indexOf('label="Imperium"')<html.indexOf('label="Chaos"'));assert.ok(html.indexOf('label="Chaos"')<html.indexOf('label="Xenos"'));
 for(const [first,last] of [['i1','i3'],['i3','i2'],['c1','c2'],['x1','x2']])assert.ok(html.indexOf('value="'+first+'"')<html.indexOf('value="'+last+'"'));
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
