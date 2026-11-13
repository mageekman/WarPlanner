'use strict';
// Supabase owns credentials and sessions; no privileged key belongs in this client.
(function () {
 const screen=document.querySelector('#auth-screen'), app=document.querySelector('#app');
 const form=document.querySelector('#auth-form'), email=document.querySelector('#auth-email'), password=document.querySelector('#auth-password');
 const message=document.querySelector('#auth-message'), submit=document.querySelector('#auth-submit');
 let mode='signin', busy=false;
 const config=window.WARPLANNER_CONFIG;
 function report(text){message.textContent=text;}
 function setMode(value){
  mode=value; report('');
  document.querySelector('#auth-title').textContent={signin:'Your study space',signup:'Create your account',reset:'Reset your password',update:'Choose a new password'}[mode];
  submit.textContent={signin:'Sign in',signup:'Create account',reset:'Send reset email',update:'Save new password'}[mode];
  password.hidden=mode==='reset';password.required=mode!=='reset';
  document.querySelector('label[for="auth-password"]').hidden=mode==='reset';
  email.hidden=mode==='update';email.required=mode!=='update';
  document.querySelector('label[for="auth-email"]').hidden=mode==='update';
  password.autocomplete=mode==='signup'||mode==='update'?'new-password':'current-password';
 }
 function showSession(session){screen.hidden=!!session;app.hidden=!session;}
 if(!config?.supabaseUrl||!window.supabase){report('Account service is unavailable. Please reload and try again.');submit.disabled=true;return;}
 const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{storageKey:'warplanner.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const redirectTo=new URL('./',window.location.href).href;
 // Do not use an async callback here: auth calls inside it can deadlock.
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){showSession(null);setMode('update');}
  else if(mode!=='update')showSession(session);
 });
 client.auth.getSession().then(({data,error})=>{if(error)throw error;if(mode!=='update')showSession(data.session);}).catch(()=>{showSession(null);report('Could not restore your session. Please sign in again.');});
 document.addEventListener('click',async event=>{
  const toggle=event.target.closest('[data-auth-mode]');
  if(toggle&&!busy){setMode(toggle.dataset.authMode);return;}
  if(event.target.closest('[data-auth-signout]')&&!busy){
   busy=true;
   try{const {error}=await client.auth.signOut();if(error)throw error;setMode('signin');showSession(null);}
   catch{window.alert('Sign out failed. Please try again.');}
   finally{busy=false;}
  }
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;submit.disabled=true;report('');
  try{
   let result;
   const credentials={email:email.value.trim(),password:password.value};
   if(mode==='signup')result=await client.auth.signUp({...credentials,options:{emailRedirectTo:redirectTo}});
   else if(mode==='reset')result=await client.auth.resetPasswordForEmail(credentials.email,{redirectTo});
   else if(mode==='update')result=await client.auth.updateUser({password:credentials.password});
   else result=await client.auth.signInWithPassword(credentials);
   if(result.error)throw result.error;
   password.value='';
   if(mode==='signup'&&!result.data.session)report('Check your email to confirm your account, then sign in.');
   else if(mode==='reset')report('If an account exists for that email, you will receive a password reset link.');
   else if(mode==='update'){setMode('signin');showSession((await client.auth.getSession()).data.session);}
   else showSession(result.data.session);
  }catch(error){report(error.message||'Unable to complete that request. Please try again.');}
  finally{busy=false;submit.disabled=false;}
 });
})();
