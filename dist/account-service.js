/* Auth operations for the current user; no privileged credentials in this client. */
(function(root){
 'use strict';
 function create({client,createClient,config,getAccountId,onDeleted}){
  async function identity(){const {data,error}=await client.auth.getUser();if(error||!data?.user?.id||data.user.id!==getAccountId())throw Error('Please sign in again.');return data.user;}
  async function verify(password){
   if(!password)throw Error('Enter your current password.');
   const user=await identity(),verifier=createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   let verifiedUser;
   try{const {data,error}=await verifier.auth.signInWithPassword({email:user.email,password});if(error||data?.user?.id!==user.id)throw Error('Your current password could not be verified.');if(user.id!==getAccountId())throw Error('This account session has ended.');verifiedUser=user;}
   finally{await verifier.auth.signOut({scope:'local'}).catch(()=>{});}
   if(verifiedUser.id!==getAccountId())throw Error('This account session has ended.');return verifiedUser;
  }
  return {
   async changePassword({currentPassword,password,confirmation}){if(password.length<8)throw Error('Use at least 8 characters for your new password.');if(password!==confirmation)throw Error('The new passwords don’t match.');await verify(currentPassword);const {data,error}=await client.auth.updateUser({password,current_password:currentPassword});if(error)throw error;return data.user;},
   async changeEmail({currentPassword,email}){const address=String(email||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw Error('Enter a valid email address.');const user=await verify(currentPassword);if(address.toLowerCase()===user.email.toLowerCase())throw Error('Enter a different email address.');const {data,error}=await client.auth.updateUser({email:address},{emailRedirectTo:new URL('./',root.location.href).href});if(error)throw error;return data.user;},
   async deleteAccount({currentPassword,confirmation}){if(confirmation!=='DELETE')throw Error('Type DELETE to confirm account deletion.');const user=await identity();if(!currentPassword)throw Error('Enter your current password.');await root.flushWarPlannerLists?.();if(user.id!==getAccountId())throw Error('This account session has ended.');const {data,error}=await client.functions.invoke('delete-account',{body:{password:currentPassword,confirmation}});if(error){let message='Could not delete your account. Please try again.';try{message=(await error.context.json()).error||message;}catch{}throw Error(message);}if(data?.deleted!==true)throw Error('Account deletion was not confirmed. Please try again.');await onDeleted(user);}
  };
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerAccountService=api;
})(typeof window!=='undefined'?window:globalThis);
