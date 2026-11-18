const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function boot(methods={},options={}){
 const nodes=new Map(),events={};let callback,redirect;const loaded=[];
 for(const id of ['#auth-screen','#app','#auth-form','#auth-email','#auth-password','#auth-password-confirm','label[for="auth-password-confirm"]','#auth-message','#auth-submit','#auth-title','#auth-loading','#auth-entry','#auth-loading-title','#auth-loading-message','label[for="auth-password"]','label[for="auth-email"]'])nodes.set(id,{value:'',hidden:false,textContent:'',setAttribute(name,value){this[name]=value;},removeAttribute(name){delete this[name];},focus(){this.focused=true;},addEventListener:(type,fn)=>events[id+type]=fn});
 const auth={onAuthStateChange(fn){callback=fn;},getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:{id:'one'}}}),signInWithPassword:async()=>({data:{session:{user:{id:'one'}}}}),signUp:async args=>{redirect=args.options.emailRedirectTo;return {data:{session:null}}},resetPasswordForEmail:async()=>({}),signOut:async()=>({}),...methods};
 vm.runInNewContext(fs.readFileSync('dist/auth.js','utf8'),{document:{querySelector:s=>nodes.get(s),addEventListener:(t,f)=>events[t]=f},window:{WarPlannerAccount:options.account,WarPlannerAccountService:options.accountService,WarPlannerContent:options.content,flushWarPlannerLists:options.flush,WarPlannerCloudLists:{create:()=>({load:options.load|| (async()=>({lists:[],idMap:{}})),dispose(){}})},WARPLANNER_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},setWarPlannerAccount:(user,army)=>loaded.push({user,army}),supabase:{createClient:()=>({auth,from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})})},location:{href:'https://mageekman.github.io/WarPlanner/?test=1'},alert(){}},URL,setTimeout});
 return {signout:()=>events.click({target:{closest:s=>s==='[data-auth-signout]'?{}:null}}),nodes,events,loaded,callback:(...args)=>callback(...args),redirect:()=>redirect,mode(value){return events.click({target:{closest:s=>s==='[data-auth-mode]'?{dataset:{authMode:value}}:null}})},submit:()=>events['#auth-formsubmit']({preventDefault(){}})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
const authTick=()=>new Promise(resolve=>setTimeout(resolve,5));
test('signed-out entry gates the app and a valid sign-in unlocks it',async()=>{
 const a=boot();await flush();assert.equal(a.nodes.get('#app').hidden,true);
 await a.submit();assert.equal(a.nodes.get('#app').hidden,false);assert.equal(a.nodes.get('#auth-screen').hidden,true);
 a.callback('SIGNED_OUT',null);await new Promise(r=>setTimeout(r,5));assert.equal(a.nodes.get('#app').hidden,true);
});
test('signup keeps the app gated pending confirmation and uses the Pages subpath',async()=>{
 const a=boot();await flush();await a.mode('signup');a.nodes.get('#auth-password').value='test-password';a.nodes.get('#auth-password-confirm').value='test-password';await a.submit();
 assert.equal(a.nodes.get('#app').hidden,true);assert.match(a.nodes.get('#auth-message').textContent,/confirm/);
 assert.equal(a.redirect(),'https://mageekman.github.io/WarPlanner/');
});
test('failed login reports text safely and restores the submit button',async()=>{
 const a=boot({signInWithPassword:async()=>({error:{message:'Invalid credentials'}})});await flush();await a.submit();
 assert.equal(a.nodes.get('#app').hidden,true);assert.equal(a.nodes.get('#auth-message').textContent,'Invalid credentials');assert.equal(a.nodes.get('#auth-submit').disabled,false);
});
test('recovery event opens password update without revealing the app',async()=>{
 const a=boot();await flush();a.callback('PASSWORD_RECOVERY',{user:{id:'one'}});
 assert.equal(a.nodes.get('#app').hidden,true);assert.equal(a.nodes.get('#auth-email').hidden,true);assert.equal(a.nodes.get('#auth-submit').textContent,'Save new password');
});
test('password reset hides password input and avoids account enumeration in response',async()=>{
 const a=boot();await flush();await a.mode('reset');await a.submit();
 assert.equal(a.nodes.get('#auth-password').required,false);assert.match(a.nodes.get('#auth-message').textContent,/If an account exists/);
});

test('a new account receives an empty army instead of a shared default roster',async()=>{
 const a=boot();await flush();await a.submit();
 assert.equal(a.loaded.length,1);assert.equal(a.loaded[0].user.id,'one');assert.equal(a.loaded[0].army.length,0);
});
test('failed identity verification keeps the account gated',async()=>{
 const a=boot({getUser:async()=>({data:{user:null},error:{message:'Expired'}})});await flush();await a.submit();
 assert.equal(a.nodes.get('#app').hidden,true);assert.equal(a.loaded.length,0);
});

test('sign-out waits for account saves and stays signed in if saving fails',async()=>{
 let signedOut=0;const a=boot({signOut:async()=>{signedOut++;return {}}},{flush:async()=>{throw new Error('Offline')}});await flush();await a.submit();await a.signout();
 assert.equal(signedOut,0);assert.equal(a.nodes.get('#app').hidden,false);
});
test('account library read failure never unlocks an empty replacement library',async()=>{
 const a=boot({}, {load:async()=>{throw new Error('Cannot load account lists')}});await flush();await a.submit();
 assert.equal(a.nodes.get('#app').hidden,true);assert.equal(a.loaded.length,0);assert.match(a.nodes.get('#auth-message').textContent,/Cannot load account lists/);
});

test('a catalog read failure keeps the app gated instead of using a stale role or rules',async()=>{
 const a=boot({}, {content:{create:()=>({load:async()=>{throw Error('Cannot load rules catalog')},dispose(){}})}});await flush();await a.submit();assert.equal(a.nodes.get('#app').hidden,true);assert.equal(a.loaded.length,0);assert.match(a.nodes.get('#auth-message').textContent,/Cannot load rules catalog/);
});
test('account access loads the rules service for the verified account identity',async()=>{
 let id,loaded=false;const a=boot({}, {content:{create:(client,userId)=>{id=userId;return {load:async()=>{loaded=true},dispose(){}}}}});await flush();await a.submit();assert.equal(id,'one');assert.ok(loaded);assert.equal(a.loaded.length,1);
});

test('restoration shows a loading state instead of a signed-out form',async()=>{
 const restored=deferred(),library=deferred();const a=boot({getSession:()=>restored.promise},{load:()=>library.promise});
 assert.equal(a.nodes.get('#auth-loading').hidden,false);assert.equal(a.nodes.get('#auth-entry').hidden,true);assert.equal(a.nodes.get('#app').hidden,true);
 restored.resolve({data:{session:{user:{id:'one'}}}});await flush();assert.equal(a.nodes.get('#auth-entry').hidden,true);assert.match(a.nodes.get('#auth-loading-message').textContent,/account is verified/);
 library.resolve({lists:[],idMap:{}});await flush();assert.equal(a.loaded.length,1);assert.equal(a.nodes.get('#auth-screen').hidden,true);
});
test('duplicate auth notifications share one identity check and parallel account-data load',async()=>{
 const identity=deferred(),library=deferred(),catalog=deferred();let checked=0,listLoads=0,catalogLoads=0;
 const a=boot({getUser:()=>{checked++;return identity.promise}},{load:()=>{listLoads++;return library.promise},content:{create:()=>({load:()=>{catalogLoads++;return catalog.promise},dispose(){}})}});await flush();
 const submitted=a.submit();a.callback('SIGNED_IN',{user:{id:'one'}});a.callback('TOKEN_REFRESHED',{user:{id:'one'}});await authTick();assert.equal(checked,1);
 identity.resolve({data:{user:{id:'one'}}});await flush();assert.equal(listLoads,1);assert.equal(catalogLoads,1);assert.equal(a.loaded.length,0);assert.equal(a.nodes.get('#auth-entry').hidden,true);
 catalog.resolve();await flush();assert.equal(a.loaded.length,0);library.resolve({lists:[],idMap:{}});await submitted;assert.equal(a.loaded.length,1);
 a.callback('SIGNED_IN',{user:{id:'one'}});await authTick();assert.equal(checked,1);assert.equal(a.nodes.get('#app').hidden,false);
});
test('a late initial session result cannot replace a newer signed-in account',async()=>{
 const initial=deferred();let checked=0;const a=boot({getSession:()=>initial.promise,getUser:async()=>{checked++;return {data:{user:{id:'one'}}}}});
 a.callback('INITIAL_SESSION',{user:{id:'one'}});await authTick();assert.equal(a.loaded.length,1);
 initial.resolve({data:{session:null}});await flush();assert.equal(checked,1);assert.equal(a.nodes.get('#app').hidden,false);assert.equal(a.loaded.length,1);
});
test('sign-out cancels pending account loading and late results never unlock the app',async()=>{
 const library=deferred(),catalog=deferred();let disposed=0;
 const a=boot({}, {load:()=>library.promise,content:{create:()=>({load:()=>catalog.promise,dispose(){disposed++}})}});await flush();const submitted=a.submit();await flush();
 a.callback('SIGNED_OUT',null);assert.equal(a.nodes.get('#auth-entry').hidden,false);assert.equal(a.nodes.get('#app').hidden,true);assert.ok(disposed);
 library.resolve({lists:[],idMap:{}});catalog.resolve();await submitted;assert.equal(a.loaded.length,0);assert.equal(a.nodes.get('#app').hidden,true);
});
test('queued sign-in events cannot resurrect a signed-out session',async()=>{
 let checked=0;const a=boot({getUser:async()=>{checked++;return {data:{user:{id:'one'}}}}});await flush();
 a.callback('SIGNED_IN',{user:{id:'one'}});a.callback('SIGNED_OUT',null);await authTick();assert.equal(checked,0);assert.equal(a.loaded.length,0);assert.equal(a.nodes.get('#auth-entry').hidden,false);
});
test('switching accounts during loading cannot publish the old account library',async()=>{
 const old=deferred();let user='one',loads=0;
 const a=boot({getUser:async()=>({data:{user:{id:user}}})},{load:()=>++loads===1?old.promise:Promise.resolve({lists:[],idMap:{}})});await flush();
 a.callback('SIGNED_IN',{user:{id:'one'}});await authTick();user='two';a.callback('SIGNED_IN',{user:{id:'two'}});await authTick();assert.equal(a.loaded.length,1);assert.equal(a.loaded[0].user.id,'two');
 old.resolve({lists:[{id:'old-private-list'}],idMap:{}});await flush();assert.equal(a.loaded.length,1);assert.equal(a.loaded[0].user.id,'two');
});
test('restoration errors leave the loader and show a usable sign-in form',async()=>{
 const a=boot({getSession:async()=>({error:{message:'Offline'}})});await flush();assert.equal(a.nodes.get('#auth-loading').hidden,true);assert.equal(a.nodes.get('#auth-entry').hidden,false);assert.match(a.nodes.get('#auth-message').textContent,/Could not restore/);
});

test('signup requires matching confirmation before making an account request',async()=>{
 let calls=0;const a=boot({signUp:async()=>{calls++;return {data:{session:null}};}});await flush();await a.mode('signup');
 const password=a.nodes.get('#auth-password'),confirmation=a.nodes.get('#auth-password-confirm');
 assert.equal(confirmation.hidden,false);assert.equal(confirmation.disabled,false);assert.equal(confirmation.required,true);
 password.value='test-password';confirmation.value='different-password';await a.submit();assert.equal(calls,0);assert.match(a.nodes.get('#auth-message').textContent,/don’t match/);assert.equal(confirmation.focused,true);assert.equal(confirmation['aria-invalid'],'true');
 confirmation.value='';await a.submit();assert.equal(calls,0);assert.match(a.nodes.get('#auth-message').textContent,/confirm your password/);
 confirmation.value=password.value;a.events['#auth-password-confirminput']();assert.equal(confirmation['aria-invalid'],undefined);
 await a.submit();assert.equal(calls,1);assert.equal(password.value,'');assert.equal(confirmation.value,'');
});
test('confirmation is cleared and excluded from sign-in and password recovery',async()=>{
 const a=boot();await flush();await a.mode('signup');const confirmation=a.nodes.get('#auth-password-confirm');confirmation.value='private-password';
 for(const mode of ['signin','reset','update']){await a.mode(mode);assert.equal(confirmation.hidden,true);assert.equal(confirmation.disabled,true);assert.equal(confirmation.required,false);assert.equal(confirmation.value,'');assert.equal(a.nodes.get('label[for="auth-password-confirm"]').hidden,true);}
});

test('account controls are bound to the verified user and cleared on sign-out',async()=>{
 const calls=[],account={setService:(service,user)=>calls.push({service,user}),setUser:user=>calls.push({updated:user})},accountService={create:args=>({getAccountId:args.getAccountId})};
 const h=boot({}, {account,accountService});await flush();await h.submit();const bound=calls.find(c=>c.user);assert.equal(bound.user.id,'one');assert.equal(bound.service.getAccountId(),'one');
 h.callback('SIGNED_OUT',null);await authTick();assert.equal(calls.at(-1).service,null);assert.equal(bound.service.getAccountId(),null);
});
