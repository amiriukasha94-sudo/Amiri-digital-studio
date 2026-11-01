import { createHmac, timingSafeEqual } from "node:crypto";
const env=n=>process.env[n]||"";
const b64=v=>Buffer.from(v).toString("base64url");
const signature=value=>createHmac("sha256",env("ADMIN_SESSION_SECRET")).update(value).digest();
const allowedOrigins=()=>[env("SITE_ORIGIN"),env("DEPLOY_PRIME_URL")].filter(Boolean).map(v=>v.replace(/\/$/,""));
const headers=req=>{const origin=req.headers.get("origin")||"";const h={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Vary":"Origin","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET, POST, PATCH, OPTIONS"};if(origin&&allowedOrigins().includes(origin))h["Access-Control-Allow-Origin"]=origin;return h;};
const reply=(req,data,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(req)});
function validToken(token){try{const [payload,sig]=token.split(".");if(!payload||!sig)return false;const expected=signature(payload),actual=Buffer.from(sig,"base64url");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;const d=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));return d.exp>Date.now()&&d.aud==="amiri-owner-console";}catch{return false;}}
async function supabase(path,method="GET",body){const url=env("SUPABASE_URL")||"https://lsbaldpeillqsmmaplef.supabase.co";const key=env("SUPABASE_SERVICE_ROLE_KEY");if(!key)throw Error("Missing SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.");const res=await fetch(url+"/rest/v1/"+path,{method,headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Prefer":"return=representation"},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await res.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}if(!res.ok)throw Error(data?.message||data?.hint||"Database request failed ("+res.status+").");return data;}
export default async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:headers(req)});
 const origin=req.headers.get("origin")||"";if(origin&&!allowedOrigins().includes(origin))return reply(req,{error:"Origin not allowed."},403);
 if(req.method==="GET")return reply(req,{service:"amiri-owner-admin",configured:Boolean(env("ADMIN_PASSWORD")&&env("ADMIN_SESSION_SECRET").length>=32&&env("SUPABASE_SERVICE_ROLE_KEY"))});
 if(req.method!=="POST"&&req.method!=="PATCH")return reply(req,{error:"Method not allowed."},405);
 if(!env("ADMIN_PASSWORD")||env("ADMIN_SESSION_SECRET").length<32)return reply(req,{error:"Configure ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Netlify."},503);
 try{
  const body=await req.json();
  if(req.method==="POST"&&body.action==="login"){
   const a=Buffer.from(String(body.password||"")),b=Buffer.from(env("ADMIN_PASSWORD"));
   if(a.length!==b.length||!timingSafeEqual(a,b))return reply(req,{error:"Incorrect password."},401);
   const payload=b64(JSON.stringify({aud:"amiri-owner-console",exp:Date.now()+8*60*60*1000}));
   return reply(req,{token:payload+"."+signature(payload).toString("base64url"),expires_in:28800});
  }
  const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  if(!validToken(token))return reply(req,{error:"Session expired. Sign in again."},401);
  if(req.method==="POST"&&body.action==="dashboard"){
   const [orders,quotations,updates]=await Promise.all([supabase("orders?select=*&order=created_at.desc&limit=200"),supabase("quotations?select=*&order=created_at.desc&limit=200"),supabase("project_updates?select=*&order=created_at.desc&limit=100")]);
   return reply(req,{orders,quotations,updates});
  }
  if(req.method==="PATCH"&&body.action==="update_order"){
   const allowed=["submitted","reviewing","quoted","approved","in_progress","review","completed","cancelled"];if(!body.id||!allowed.includes(body.status))return reply(req,{error:"Invalid order or status."},400);
   return reply(req,{order:await supabase("orders?id=eq."+encodeURIComponent(body.id),"PATCH",{status:body.status})});
  }
  if(req.method==="POST"&&body.action==="create_quotation"){
   if(!body.order_id||!Number.isFinite(Number(body.amount))||Number(body.amount)<0||!String(body.scope||"").trim())return reply(req,{error:"Order, valid amount and quotation scope are required."},400);
   const prior=await supabase("quotations?select=version&order_id=eq."+encodeURIComponent(body.order_id)+"&order=version.desc&limit=1");
   const version=(Number(prior?.[0]?.version)||0)+1;
   const quotation=await supabase("quotations","POST",{order_id:body.order_id,version,amount:Number(body.amount),currency:"UGX",scope:String(body.scope).slice(0,10000),terms:String(body.terms||"").slice(0,5000),status:"sent"});
   await supabase("orders?id=eq."+encodeURIComponent(body.order_id),"PATCH",{status:"quoted"});
   return reply(req,{quotation});
  }
  return reply(req,{error:"Unknown action."},400);
 }catch(error){return reply(req,{error:error.message||"Request failed."},500);}
};
