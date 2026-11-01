// Private, unguessable draft links. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function digest(s){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));}
async function db(path,init={}){const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)throw Error("Cloud drafts are not configured. Owner must add Supabase environment variables in Netlify.");const r=await fetch(base.replace(/\/$/,"")+"/rest/v1/"+path,{...init,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation",...(init.headers||{})}});const t=await r.text();if(!r.ok)throw Error("Draft database request failed ("+r.status+"): "+t.slice(0,240));return t?JSON.parse(t):[];}
export default async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 try{
  const url=new URL(req.url);
  if(req.method==="GET"){
   const token=url.searchParams.get("token")||"";if(!/^[a-f0-9]{64}$/.test(token))return json({error:"Invalid or expired draft link."},404);
   const rows=await db("website_draft_shares?token_hash=eq."+await digest(token)+"&select=id,client_name,business_name,brief,html_content,status,client_feedback,created_at,updated_at,expires_at");
   const d=rows[0];if(!d||new Date(d.expires_at)<new Date())return json({error:"This draft link has expired or does not exist."},404);
   return json({draft:d});
  }
  if(req.method!=="POST")return json({error:"Method not allowed."},405);
  const body=await req.json(), action=body.action;
  if(action==="create"){
   const html=String(body.html||"");const brief=String(body.brief||"").trim();
   if(html.length<30||html.length>450000||brief.length<10||brief.length>12000)return json({error:"Add a website brief and a generated website under 450 KB."},400);
   const token=hex(crypto.getRandomValues(new Uint8Array(32))),hash=await digest(token);
   const rows=await db("website_draft_shares",{method:"POST",body:JSON.stringify({token_hash:hash,client_name:String(body.client_name||"").slice(0,100),business_name:String(body.business_name||"").slice(0,140),client_phone:String(body.client_phone||"").slice(0,35),client_email:String(body.client_email||"").slice(0,140),brief,html_content:html,status:"draft",expires_at:new Date(Date.now()+30*86400000).toISOString()})});
   const d=rows[0];await db("website_draft_revisions",{method:"POST",body:JSON.stringify({draft_id:d.id,revision_number:1,html_content:html,note:"Initial client draft"})});
   return json({url:new URL("/draft-preview.html?t="+token,req.url).toString(),expires_at:d.expires_at});
  }
  const token=String(body.token||"");if(!/^[a-f0-9]{64}$/.test(token))return json({error:"Invalid draft link."},400);
  const rows=await db("website_draft_shares?token_hash=eq."+await digest(token)+"&select=id,status,expires_at");
  const d=rows[0];if(!d||new Date(d.expires_at)<new Date())return json({error:"Draft link expired."},404);
  if(action==="feedback"){
   const feedback=String(body.feedback||"").trim().slice(0,2000);if(!feedback)return json({error:"Please enter feedback."},400);
   const status=body.decision==="approve"?"client_approved":"changes_requested";
   await db("website_draft_shares?id=eq."+d.id,{method:"PATCH",body:JSON.stringify({status,client_feedback:feedback,updated_at:new Date().toISOString()})});
   return json({ok:true,status});
  }
  if(action==="revision"){
   const html=String(body.html||"");if(html.length<30||html.length>450000)return json({error:"Invalid website HTML."},400);
   const old=await db("website_draft_revisions?draft_id=eq."+d.id+"&select=revision_number&order=revision_number.desc&limit=1");
   const n=(old[0]?.revision_number||0)+1;
   await db("website_draft_revisions",{method:"POST",body:JSON.stringify({draft_id:d.id,revision_number:n,html_content:html,note:String(body.note||"Updated draft").slice(0,300)})});
   await db("website_draft_shares?id=eq."+d.id,{method:"PATCH",body:JSON.stringify({html_content:html,status:"draft",updated_at:new Date().toISOString()})});
   return json({ok:true,revision:n});
  }
  return json({error:"Unknown action."},400);
 }catch(e){return json({error:e.message||"Draft service failed."},500);}
};