const env=n=>process.env[n]||"";
const allowedOrigins=()=>[env("SITE_ORIGIN"),env("DEPLOY_PRIME_URL")].filter(Boolean).map(v=>v.replace(/\/$/,""));
const corsFor=req=>{const origin=req.headers.get("origin")||"";const allowed=allowedOrigins();const headers={"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Vary":"Origin"};if(!origin||allowed.includes(origin))headers["Access-Control-Allow-Origin"]=origin||allowed[0]||"";return headers;};
const json=(req,b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...corsFor(req),"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
async function call(url,init={}){const r=await fetch(url,init),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{}if(!r.ok)throw Error(d.msg||d.message||d.error_description||"Request failed");return d;}
const money=v=>{const n=Number(v??0);return Number.isSafeInteger(n)&&n>=0&&n<=1000000000000?n:null;};
export default async req=>{if(req.method==="OPTIONS")return new Response(null,{headers:corsFor(req)});try{
const origin=req.headers.get("origin")||"";if(origin&&!allowedOrigins().includes(origin))return json(req,{error:"Origin not allowed."},403);
if(!["GET","POST"].includes(req.method))return json(req,{error:"Method not allowed."},405);
const base=env("SUPABASE_URL").replace(/\/$/,""),anon=env("SUPABASE_ANON_KEY"),service=env("SUPABASE_SERVICE_ROLE_KEY");if(!base||!anon||!service)return json(req,{error:"Configure SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in Netlify."},503);
const action=new URL(req.url).searchParams.get("action");
if(action==="login"&&req.method==="POST"){const b=await req.json();if(typeof b.email!=="string"||typeof b.password!=="string"||!b.email.trim()||!b.password)return json(req,{error:"Email and password required."},400);
const s=await call(base+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json",apikey:anon},body:JSON.stringify({email:b.email.trim(),password:b.password})});
const u=await call(base+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+s.access_token}});
const p=await call(base+"/rest/v1/profiles?id=eq."+encodeURIComponent(u.id)+"&select=role",{headers:{apikey:service,Authorization:"Bearer "+service}});
if(p[0]?.role!=="owner")return json(req,{error:"This account is not authorised as an Amiri owner."},403);
return json(req,{access_token:s.access_token,user:{email:u.email}});}
const h=req.headers.get("authorization")||"",jwt=h.startsWith("Bearer ")?h.slice(7):"";if(!jwt)return json(req,{error:"Sign in required."},401);
const u=await call(base+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+jwt}});
const p=await call(base+"/rest/v1/profiles?id=eq."+encodeURIComponent(u.id)+"&select=role",{headers:{apikey:service,Authorization:"Bearer "+service}});
if(p[0]?.role!=="owner")return json(req,{error:"Owner access required."},403);
const headers={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"return=representation"};
if(req.method==="GET"){const rows=await call(base+"/rest/v1/platform_licenses?select=*,license_brand_workspaces(brand_name,primary_domain,primary_colour)&order=created_at.desc",{headers});return json(req,{licenses:rows});}
const b=await req.json(),now=new Date().toISOString();
if(b.action==="create"){const setup=money(b.setup_fee_ugx),recurring=money(b.recurring_fee_ugx);if(!b.legal_entity||!b.contact_email||![ "white_label","franchise","enterprise"].includes(b.model)||!["reseller","business_partner","regional_operator","enterprise"].includes(b.tier)||setup===null||recurring===null||!["monthly","quarterly","yearly","custom"].includes(b.billing_period||"monthly"))return json(req,{error:"Check required fields and fee amounts (whole UGX values only)."},400);
const code="AMR-"+crypto.randomUUID().replace(/-/g,"").slice(0,12).toUpperCase();
const rows=await call(base+"/rest/v1/platform_licenses",{method:"POST",headers,body:JSON.stringify({license_code:code,legal_entity:String(b.legal_entity).trim().slice(0,180),contact_email:String(b.contact_email).trim().slice(0,254),model:b.model,tier:b.tier,territory:String(b.territory||"").slice(0,120)||null,setup_fee_ugx:setup,recurring_fee_ugx:recurring,billing_period:b.billing_period||"monthly",status:"pending"})});
await call(base+"/rest/v1/license_audit_events",{method:"POST",headers,body:JSON.stringify({license_id:rows[0].id,actor_user_id:u.id,event_type:"license_created",details:{license_code:code}})});return json(req,{license:rows[0]});}
if(b.action==="status"){if(!b.id||!["pending","active","suspended","expired","terminated"].includes(b.status))return json(req,{error:"Invalid status."},400);
const rows=await call(base+"/rest/v1/platform_licenses?id=eq."+encodeURIComponent(b.id),{method:"PATCH",headers,body:JSON.stringify({status:b.status,updated_at:now})});
if(rows[0])await call(base+"/rest/v1/license_audit_events",{method:"POST",headers,body:JSON.stringify({license_id:b.id,actor_user_id:u.id,event_type:"status_changed",details:{status:b.status}})});return json(req,{license:rows[0]||null});}
if(b.action==="brand"){if(!b.license_id||!String(b.brand_name||"").trim())return json(req,{error:"Licence and brand name required."},400);
const old=await call(base+"/rest/v1/license_brand_workspaces?license_id=eq."+encodeURIComponent(b.license_id)+"&select=id",{headers});
const data={license_id:b.license_id,brand_name:String(b.brand_name).trim().slice(0,140),logo_url:String(b.logo_url||"").slice(0,500)||null,primary_domain:String(b.primary_domain||"").trim().slice(0,253)||null,primary_colour:String(b.primary_colour||"").slice(0,20)||null,updated_at:now};
const rows=await call(base+"/rest/v1/license_brand_workspaces"+(old.length?"?id=eq."+old[0].id:""),{method:old.length?"PATCH":"POST",headers,body:JSON.stringify(data)});return json(req,{workspace:rows[0]||null});}
return json(req,{error:"Unknown action."},400);
}catch(e){return json(req,{error:e.message||"Owner API error."},500);}};
