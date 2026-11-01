import { createHmac, timingSafeEqual } from "node:crypto";
const env=n=>process.env[n]||"";
const originList=()=>[env("SITE_ORIGIN"),env("DEPLOY_PRIME_URL")].filter(Boolean).map(v=>v.replace(/\/$/,""));
const headersFor=req=>{const origin=req.headers.get("origin")||"";const allowed=originList();const h={"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","X-Content-Type-Options":"nosniff"};if(origin&&allowed.includes(origin))h["Access-Control-Allow-Origin"]=origin;return h;};
const reply=(req,data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headersFor(req),"Content-Type":"application/json","Cache-Control":"no-store"}});
const b64=v=>Buffer.from(v).toString("base64url");
const signature=value=>createHmac("sha256",env("ADMIN_SESSION_SECRET")).update(value).digest();
function validToken(token){try{const [payload,sig]=token.split(".");if(!payload||!sig)return false;const expected=signature(payload),actual=Buffer.from(sig,"base64url");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));return data.exp>Date.now()&&data.aud==="amiri-owner-console";}catch{return false;}}
export default async req=>{if(req.method==="OPTIONS")return new Response(null,{headers:headersFor(req)});const origin=req.headers.get("origin")||"";if(origin&&!originList().includes(origin))return reply(req,{error:"Origin not allowed."},403);if(req.method!=="POST")return reply(req,{error:"Method not allowed."},405);
const password=env("ADMIN_PASSWORD"),secret=env("ADMIN_SESSION_SECRET");if(!password||!secret||secret.length<32)return reply(req,{error:"Admin secrets are not configured correctly in Netlify."},503);
try{const body=await req.json();if(body.action==="login"){const supplied=Buffer.from(String(body.password||""));const expected=Buffer.from(password);if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return reply(req,{error:"Incorrect admin password."},401);const payload=b64(JSON.stringify({aud:"amiri-owner-console",exp:Date.now()+8*60*60*1000}));return reply(req,{token:payload+"."+signature(payload).toString("base64url"),expires_in:28800});}
if(body.action==="verify"){const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");return validToken(token)?reply(req,{valid:true}):reply(req,{error:"Session expired. Sign in again."},401);}
return reply(req,{error:"Unknown action."},400);}catch{return reply(req,{error:"Invalid request."},400);}};
