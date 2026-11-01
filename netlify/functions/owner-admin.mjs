const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const env=n=>process.env[n]||"";
async function call(url,init={}){const r=await fetch(url,init),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{}if(!r.ok)throw Error(d.msg||d.message||d.error_description||"Request failed");return d;}
export default async req=>{if(req.method==="OPTIONS")return new Response(null,{headers:cors});try{
const base=env("SUPABASE_URL").replace(/\/$/,""),anon=env("SUPABASE_ANON_KEY"),service=env("SUPABASE_SERVICE_ROLE_KEY");if(!base||!anon||!service)return json({error:"Configure SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in Netlify."},503);
const action=new URL(req.url).searchParams.get("action");
if(action==="config"&&req.method==="GET")return json({supabaseUrl:base,anonKey:anon});
if(action==="login"&&req.method==="POST"){const b=await req.json();if(!b.email||!b.password)return json({error:"Email and password required."},400);
const s=await call(base+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json",apikey:anon},body:JSON.stringify({email:b.email,password:b.password})});
const u=await call(base+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+s.access_token}});
const p=await call(base+"/rest/v1/profiles?id=eq."+encodeURIComponent(u.id)+"&select=role",{headers:{apikey:service,Authorization:"Bearer "+service}});
if(p[0]?.role!=="owner")return json({error:"This account is not authorised as an Amiri owner."},403);
return json({access_token:s.access_token,user:{email:u.email}});}
const h=req.headers.get("authorization")||"",jwt=h.startsWith("Bearer ")?h.slice(7):"";if(!jwt)return json({error:"Sign in required."},401);
const u=await call(base+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+jwt}});
const p=await call(base+"/rest/v1/profiles?id=eq."+encodeURIComponent(u.id)+"&select=role",{headers:{apikey:service,Authorization:"Bearer "+service}});
if(p[0]?.role!=="owner")return json({error:"Owner access required."},403);
const headers={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"return=representation"};
if(req.method==="GET"){const rows=await call(base+"/rest/v1/platform_licenses?select=*,license_brand_workspaces(brand_name,primary_domain,primary_colour)&order=created_at.desc",{headers});return json({licenses:rows});}
if(req.method==="POST"){const b=await req.json(),now=new Date().toISOString();
if(b.action==="create"){if(!b.legal_entity||!b.contact_email||!["white_label","franchise","enterprise"].includes(b.model)||!["reseller","business_partner","regional_operator","enterprise"].includes(b.tier))return json({error:"Complete all required licence fields."},400);
const code="AMR-"+crypto.randomUUID().replace(/-/g,"").slice(0,12).toUpperCase();
const rows=await call(base+"/rest/v1/platform_licenses",{method:"POST",headers,body:JSON.stringify({license_code:code,legal_entity:String(b.legal_entity).slice(0,180),contact_email:String(b.contact_email).slice(0,254),model:b.model,tier:b.tier,territory:String(b.territory||"").slice(0,120)||null,setup_fee_ugx:Math.max(0,Number(b.setup_fee_ugx)||0),recurring_fee_ugx:Math.max(0,Number(b.recurring_fee_ugx)||0),billing_period:b.billing_period||"monthly",status:"pending"})});
await call(base+"/rest/v1/license_audit_events",{method:"POST",headers,body:JSON.stringify({license_id:rows[0].id,actor_user_id:u.id,event_type:"license_created",details:{license_code:code}})});return json({license:rows[0]});}
if(b.action==="status"){if(!b.id||!["pending","active","suspended","expired","terminated"].includes(b.status))return json({error:"Invalid status."},400);
const rows=await call(base+"/rest/v1/platform_licenses?id=eq."+encodeURIComponent(b.id),{method:"PATCH",headers,body:JSON.stringify({status:b.status,updated_at:now})});
if(rows[0])await call(base+"/rest/v1/license_audit_events",{method:"POST",headers,body:JSON.stringify({license_id:b.id,actor_user_id:u.id,event_type:"status_changed",details:{status:b.status}})});return json({license:rows[0]||null});}
if(b.action==="brand"){if(!b.license_id||!String(b.brand_name||"").trim())return json({error:"Licence and brand name required."},400);
const old=await call(base+"/rest/v1/license_brand_workspaces?license_id=eq."+encodeURIComponent(b.license_id)+"&select=id",{headers});
const data={license_id:b.license_id,brand_name:String(b.brand_name).slice(0,140),logo_url:String(b.logo_url||"").slice(0,500)||null,primary_domain:String(b.primary_domain||"").slice(0,253)||null,primary_colour:String(b.primary_colour||"").slice(0,20)||null,updated_at:now};
const rows=await call(base+"/rest/v1/license_brand_workspaces"+(old.length?"?id=eq."+old[0].id:""),{method:old.length?"PATCH":"POST",headers,body:JSON.stringify(data)});return json({workspace:rows[0]||null});}}
return json({error:"Method not allowed."},405);
}catch(e){return json({error:e.message||"Owner API error."},500);}};