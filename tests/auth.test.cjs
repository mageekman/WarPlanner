const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function boot(methods={},options={}){
 const nodes=new Map(),events={};let callback,redirect;const loaded=[];
 for(const id of ['#auth-screen','#app','#auth-form','#auth-email','#auth-password','#auth-message','#auth-submit','#auth-title','label[for="auth-password"]','label[for="auth-email"]'])nodes.set(id,{value:'',hidden:false,textContent:'',addEventListener:(type,fn)=>events[id+type]=fn});
 const auth={onAuthStateChange(fn){callback=fn;},getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:{id:'one'}}}),signInWithPassword:async()=>({data:{session:{user:{id:'one'}}}}),signUp:async args=>{redirect=args.options.emailRedirectTo;return {data:{session:null}}},resetPasswordForEmail:async()=>({}),signOut:async()=>({}),...methods};
 vm.runInNewContext(fs.readFileSync('dist/auth.js','utf8'),{document:{querySelector:s=>nodes.get(s),addEventListener:(t,f)=>events[t]=f},window:{flushWarPlannerLists:options.flush,WarPlannerCloudLists:{create:()=>({load:options.load|| (async()=>({lists:[],idMap:{}})),dispose(){}})},WARPLANNER_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},setWarPlannerAccount:(user,army)=>loaded.push({user,army}),supabase:{createClient:()=>({auth,from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})})},location:{href:'https://mageekman.github.io/WarPlanner/?test=1'},alert(){}},URL,setTimeout});
 return {signout:()=>events.click({target:{closest:s=>s==='[data-auth-signout]'?{}:null}}),nodes,events,loaded,callback:(...args)=>callback(...args),redirect:()=>redirect,mode(value){return events.click({target:{closest:s=>s==='[data-auth-mode]'?{dataset:{authMode:value}}:null}})},submit:()=>events['#auth-formsubmit']({preventDefault(){}})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('signed-out entry gates the app and a valid sign-in unlocks it',async()=>{
 const a=boot();await flush();assert.equal(a.nodes.get('#app').hidden,true);
 await a.submit();assert.equal(a.nodes.get('#app').hidden,false);assert.equal(a.nodes.get('#auth-screen').hidden,true);
 a.callback('SIGNED_OUT',null);await new Promise(r=>setTimeout(r,5));assert.equal(a.nodes.get('#app').hidden,true);
});
test('signup keeps the app gated pending confirmation and uses the Pages subpath',async()=>{
 const a=boot();await flush();await a.mode('signup');await a.submit();
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
