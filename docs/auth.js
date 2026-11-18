'use strict';
// Supabase owns credentials and sessions; no privileged key belongs in this client.
(function () {
 const screen=document.querySelector('#auth-screen'), app=document.querySelector('#app');
 const form=document.querySelector('#auth-form'), email=document.querySelector('#auth-email'), password=document.querySelector('#auth-password');
 const confirmPassword=document.querySelector('#auth-password-confirm');
 const message=document.querySelector('#auth-message'), submit=document.querySelector('#auth-submit');
 const loading=document.querySelector('#auth-loading'),entry=document.querySelector('#auth-entry');
 let mode='signin',busy=false,accountId=null,sessionRevision=0,pendingAccount=null,authEventVersion=0,latestAuthUser;
 const config=window.WARPLANNER_CONFIG;
 function report(text){message.textContent=text;}
 function showView(view){screen.hidden=view==='app';app.hidden=view!=='app';loading.hidden=view!=='loading';entry.hidden=view!=='entry';}
 function showLoading(title,detail){document.querySelector('#auth-loading-title').textContent=title;document.querySelector('#auth-loading-message').textContent=detail;showView('loading');}
 function disposePending(){pendingAccount?.service?.dispose();pendingAccount?.content?.dispose();pendingAccount=null;}
 function setMode(value){
  mode=value; report('');
  confirmPassword.value='';confirmPassword.hidden=mode!=='signup';confirmPassword.disabled=mode!=='signup';confirmPassword.required=mode==='signup';
  document.querySelector('label[for="auth-password-confirm"]').hidden=mode!=='signup';
  confirmPassword.removeAttribute('aria-invalid');
  document.querySelector('#auth-title').textContent={signin:'Your study space',signup:'Create your account',reset:'Reset your password',update:'Choose a new password'}[mode];
  submit.textContent={signin:'Sign in',signup:'Create account',reset:'Send reset email',update:'Save new password'}[mode];
  password.hidden=mode==='reset';password.required=mode!=='reset';
  document.querySelector('label[for="auth-password"]').hidden=mode==='reset';
  email.hidden=mode==='update';email.required=mode!=='update';
  document.querySelector('label[for="auth-email"]').hidden=mode==='update';
  password.autocomplete=mode==='signup'||mode==='update'?'new-password':'current-password';
 }
 function showSession(session){
  if(!session){window.WarPlannerAccount?.setService(null);const hadAccount=!!accountId||!!pendingAccount;++sessionRevision;disposePending();accountId=null;if(hadAccount)window.clearWarPlannerAccount?.();showView('entry');return Promise.resolve();}
  if(accountId===session.user.id){window.WarPlannerAccount?.setUser(session.user);showView('app');return Promise.resolve();}
  // INITIAL_SESSION, SIGNED_IN and the password response can describe the same
  // login. They share one verified load instead of cancelling each other.
  if(pendingAccount?.id===session.user.id)return pendingAccount.promise;
  const hadAccount=!!accountId;disposePending();accountId=null;window.WarPlannerAccount?.setService(null);if(hadAccount)window.clearWarPlannerAccount?.();
  const request={id:session.user.id,revision:++sessionRevision,eventVersion:authEventVersion,service:null,content:null,promise:null};pendingAccount=request;
  showLoading('Opening your study space…','Verifying your account…');
  request.promise=loadAccount(request).finally(()=>{if(pendingAccount===request)pendingAccount=null;});return request.promise;
 }
 async function loadAccount(request){
  const current=()=>pendingAccount===request&&sessionRevision===request.revision&&(request.eventVersion===authEventVersion||latestAuthUser===request.id);
  try{
   const {data:identity,error:identityError}=await client.auth.getUser();
   if(!current())return;
   if(identityError||!identity.user||identity.user.id!==request.id)throw new Error('Please sign in again.');
   showLoading('Loading your study space…','Your account is verified. Loading your lists and rules…');
   request.service=window.WarPlannerCloudLists.create(client,identity.user.id,{status:status=>window.setWarPlannerCloudStatus?.(status),saved:result=>window.applyWarPlannerCloudSave?.(result),deleted:id=>window.applyWarPlannerCloudDeletion?.(id)});
   if(window.WarPlannerContent)request.content=window.WarPlannerContent.create(client,identity.user.id,{runtime:true});
   const local=window.getWarPlannerLocalLists?.(identity.user)||[];
   const [{lists,idMap}]=await Promise.all([request.service.load(local),request.content?.load()]);
   if(!current()){request.service.dispose();request.content?.dispose();return;}
   window.WarPlannerAccount?.setService(window.WarPlannerAccountService?.create({client,createClient:window.supabase.createClient,config,getAccountId:()=>accountId,onDeleted:async user=>{
    await client.auth.signOut({scope:'local'}).catch(()=>{});setMode('signin');showSession(null);
    try{const prefix='warplanner.account.'+user.id+'.';for(const key of Object.keys(localStorage))if(key.startsWith(prefix)||key==='warplanner.onboarding.'+user.id+'.v1')localStorage.removeItem(key);}catch{}
    await window.WarPlannerRuntimeCache?.remove('runtime-v1:'+config.supabaseUrl+':'+user.id).catch(()=>{});
    report('Your account has been deleted.');
   }}),identity.user);
   window.setWarPlannerAccount?.(identity.user,lists,request.service,idMap,request.content);
   report('');
   accountId=identity.user.id;showView('app');
  }catch(error){request.service?.dispose();request.content?.dispose();if(current()){accountId=null;window.WarPlannerAccount?.setService(null);window.clearWarPlannerAccount?.();showView('entry');report(error.message||'Could not load your study space. Please reload and try again.');}}
 }
 showLoading('Restoring your session…','Checking whether you are already signed in…');
 if(!config?.supabaseUrl||!window.supabase){showView('entry');report('Account service is unavailable. Please reload and try again.');submit.disabled=true;return;}
 const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{storageKey:'warplanner.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const redirectTo=new URL('./',window.location.href).href;
 // Do not use an async callback here: auth calls inside it can deadlock.
 client.auth.onAuthStateChange((event,session)=>{
  const version=++authEventVersion;latestAuthUser=session?.user.id||null;
  if(event==='PASSWORD_RECOVERY'){showSession(null);setMode('update');}
  else if(!session)showSession(null);
  else if(mode!=='update')setTimeout(()=>{if(version===authEventVersion&&mode!=='update')showSession(session);},0);
 });
 const initialVersion=authEventVersion;
 client.auth.getSession().then(({data,error})=>{if(initialVersion!==authEventVersion||mode==='update')return;if(error)throw error;return showSession(data.session);}).catch(()=>{if(initialVersion===authEventVersion&&mode!=='update'){showSession(null);report('Could not restore your session. Please sign in again.');}});
 document.addEventListener('click',async event=>{
  const toggle=event.target.closest('[data-auth-mode]');
  if(toggle&&!busy){setMode(toggle.dataset.authMode);return;}
  if(event.target.closest('[data-auth-signout]')&&!busy){
   if(window.WarPlannerAccount?.busy){window.alert('Please wait for your account change to finish.');return;}
   if(window.hasUnsavedListDraft?.()){window.alert('Save or cancel your edits before signing out.');return;}
   busy=true;
   try{await window.flushWarPlannerLists?.();const {error}=await client.auth.signOut();if(error)throw error;setMode('signin');showSession(null);}
   catch{window.alert('Could not finish saving or sign out. Your lists are still here; retry saving before signing out.');}
   finally{busy=false;}
  }
 });
 for(const field of [password,confirmPassword])field.addEventListener('input',()=>{if(mode==='signup'){confirmPassword.removeAttribute('aria-invalid');report('');}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  if(mode==='signup'&&(!confirmPassword.value||confirmPassword.value!==password.value)){report(confirmPassword.value?"Passwords don’t match. Please enter the same password in both fields.":'Please confirm your password.');confirmPassword.setAttribute('aria-invalid','true');confirmPassword.focus();return;}
  busy=true;submit.disabled=true;report('');
  const operationVersion=authEventVersion;
  try{
   let result;
   const credentials={email:email.value.trim(),password:password.value};
   showLoading({signin:'Signing you in…',signup:'Creating your account…',reset:'Sending reset email…',update:'Saving your password…'}[mode],'Please wait a moment…');
   if(mode==='signup')result=await client.auth.signUp({...credentials,options:{emailRedirectTo:redirectTo}});
   else if(mode==='reset')result=await client.auth.resetPasswordForEmail(credentials.email,{redirectTo});
   else if(mode==='update')result=await client.auth.updateUser({password:credentials.password});
   else result=await client.auth.signInWithPassword(credentials);
   if(result.error)throw result.error;
   password.value='';confirmPassword.value='';confirmPassword.removeAttribute('aria-invalid');
   if(mode==='signup'&&!result.data.session){showView('entry');report('Check your email to confirm your account, then sign in.');}
   else if(mode==='reset'){showView('entry');report('If an account exists for that email, you will receive a password reset link.');}
   else if(mode==='update'){setMode('signin');await showSession((await client.auth.getSession()).data.session);}
   else if(operationVersion===authEventVersion||latestAuthUser===result.data.session?.user.id)await showSession(result.data.session);
  }catch(error){if(!accountId&&!pendingAccount){showView('entry');report(error.message||'Unable to complete that request. Please try again.');}}
  finally{busy=false;submit.disabled=false;}
 });
})();
