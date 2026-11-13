const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function boot(methods={}){
 const nodes=new Map(),events={};let callback,redirect;
 for(const id of ['#auth-screen','#app','#auth-form','#auth-email','#auth-password','#auth-message','#auth-submit','#auth-title','label[for="auth-password"]','label[for="auth-email"]'])nodes.set(id,{value:'',hidden:false,textContent:'',addEventListener:(type,fn)=>events[id+type]=fn});
 const auth={onAuthStateChange(fn){callback=fn;},getSession:async()=>({data:{session:null}}),signInWithPassword:async()=>({data:{session:{user:{id:'one'}}}}),signUp:async args=>{redirect=args.options.emailRedirectTo;return {data:{session:null}}},resetPasswordForEmail:async()=>({}),signOut:async()=>({}),...methods};
 vm.runInNewContext(fs.readFileSync('dist/auth.js','utf8'),{document:{querySelector:s=>nodes.get(s),addEventListener:(t,f)=>events[t]=f},window:{WARPLANNER_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},supabase:{createClient:()=>({auth})},location:{href:'https://mageekman.github.io/WarPlanner/?test=1'},alert(){}},URL});
 return {nodes,events,callback:(...args)=>callback(...args),redirect:()=>redirect,mode(value){return events.click({target:{closest:s=>s==='[data-auth-mode]'?{dataset:{authMode:value}}:null}})},submit:()=>events['#auth-formsubmit']({preventDefault(){}})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('signed-out entry gates the app and a valid sign-in unlocks it',async()=>{
 const a=boot();await flush();assert.equal(a.nodes.get('#app').hidden,true);
 await a.submit();assert.equal(a.nodes.get('#app').hidden,false);assert.equal(a.nodes.get('#auth-screen').hidden,true);
 a.callback('SIGNED_OUT',null);assert.equal(a.nodes.get('#app').hidden,true);
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
