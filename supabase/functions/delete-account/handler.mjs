// Caller identity always comes from a verified session, never from request data.
export function createHandler({createClient,url,anonKey,serviceKey}){
 return async function(request){
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
  const reply=(status,body)=>Response.json(body,{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,{error:'Use POST.'});
  const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)return reply(401,{error:'Please sign in again.'});
  if(!url||!anonKey||!serviceKey)return reply(503,{error:'Account deletion is unavailable. Please try again later.'});
  const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
  const admin=createClient(url,serviceKey,options);
  try{
   const {data:identity,error:identityError}=await admin.auth.getUser(token);
   if(identityError||!identity?.user?.id||!identity.user.email)return reply(401,{error:'Please sign in again.'});
   let body;try{body=await request.json();}catch{return reply(400,{error:'Enter your current password and type DELETE.'});}
   if(body?.confirmation!=='DELETE'||typeof body.password!=='string'||!body.password||body.password.length>1024)return reply(400,{error:'Enter your current password and type DELETE.'});
   const verifier=createClient(url,anonKey,options);
   const {data:verified,error}=await verifier.auth.signInWithPassword({email:identity.user.email,password:body.password});
   if(error||verified?.user?.id!==identity.user.id)return reply(403,{error:'Your current password could not be verified.'});
   // Revoking globally also removes the short-lived verification session.
   const revoked=await admin.auth.admin.signOut(token,'global');
   if(revoked.error)return reply(503,{error:'Could not secure your sessions for deletion. Please try again.'});
   const deleted=await admin.auth.admin.deleteUser(identity.user.id,false);
   if(deleted.error)return reply(503,{error:'Could not delete your account. Please sign in again and retry.'});
   return reply(200,{deleted:true});
  }catch{return reply(503,{error:'Could not delete your account. Please try again later.'});}
 };
}
