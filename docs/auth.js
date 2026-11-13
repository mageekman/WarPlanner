'use strict';
// Supabase owns credentials and sessions; no privileged key belongs in this client.
(function () {
 const screen=document.querySelector('#auth-screen'), app=document.querySelector('#app');
 const form=document.querySelector('#auth-form'), email=document.querySelector('#auth-email'), password=document.querySelector('#auth-password');
 const message=document.querySelector('#auth-message'), submit=document.querySelector('#auth-submit');
 let mode='signin', busy=false, accountId=null, sessionRevision=0, loadingLibrary=null;
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
 async function showSession(session){
  const revision=++sessionRevision;
  if(!session){loadingLibrary?.dispose();loadingLibrary=null;accountId=null;screen.hidden=false;app.hidden=true;window.clearWarPlannerAccount?.();return;}
  if(accountId===session.user.id){screen.hidden=true;app.hidden=false;return;}
  screen.hidden=false;app.hidden=true;loadingLibrary?.dispose();loadingLibrary=null;
  let service=null,contentService=null;
  try{
   const {data:identity,error:identityError}=await client.auth.getUser();
   if(revision!==sessionRevision)return;
   if(identityError||!identity.user||identity.user.id!==session.user.id)throw new Error('Please sign in again.');
   report('Loading your account lists…');
   service=window.WarPlannerCloudLists.create(client,identity.user.id,{status:status=>window.setWarPlannerCloudStatus?.(status),saved:result=>window.applyWarPlannerCloudSave?.(result)});
   loadingLibrary=service;
   const local=window.getWarPlannerLocalLists?.(identity.user)||[];
   const {lists,idMap}=await service.load(local);
   if(revision!==sessionRevision){service.dispose();return;}
   if(window.WarPlannerContent){contentService=window.WarPlannerContent.create(client,identity.user.id);await contentService.load();}
   if(revision!==sessionRevision){service.dispose();contentService?.dispose();return;}
   window.setWarPlannerAccount?.(identity.user,lists,service,idMap,contentService);loadingLibrary=null;
   report('');
   accountId=identity.user.id;screen.hidden=true;app.hidden=false;
  }catch(error){service?.dispose();contentService?.dispose();if(revision===sessionRevision){accountId=null;window.clearWarPlannerAccount?.();report(error.message||'Could not load your account lists. Please reload and try again.');}}
 }
 if(!config?.supabaseUrl||!window.supabase){report('Account service is unavailable. Please reload and try again.');submit.disabled=true;return;}
 const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{storageKey:'warplanner.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const redirectTo=new URL('./',window.location.href).href;
 // Do not use an async callback here: auth calls inside it can deadlock.
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){showSession(null);setMode('update');}
  else if(mode!=='update')setTimeout(()=>showSession(session),0);
 });
 client.auth.getSession().then(({data,error})=>{if(error)throw error;if(mode!=='update')showSession(data.session);}).catch(()=>{showSession(null);report('Could not restore your session. Please sign in again.');});
 document.addEventListener('click',async event=>{
  const toggle=event.target.closest('[data-auth-mode]');
  if(toggle&&!busy){setMode(toggle.dataset.authMode);return;}
  if(event.target.closest('[data-auth-signout]')&&!busy){
   if(window.hasUnsavedListDraft?.()){window.alert('Save or cancel your edits before signing out.');return;}
   busy=true;
   try{await window.flushWarPlannerLists?.();const {error}=await client.auth.signOut();if(error)throw error;setMode('signin');showSession(null);}
   catch{window.alert('Could not finish saving or sign out. Your lists are still here; retry saving before signing out.');}
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
   else if(mode==='update'){setMode('signin');await showSession((await client.auth.getSession()).data.session);}
   else await showSession(result.data.session);
  }catch(error){report(error.message||'Unable to complete that request. Please try again.');}
  finally{busy=false;submit.disabled=false;}
 });
})();
