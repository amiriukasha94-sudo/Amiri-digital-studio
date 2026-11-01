export default async (req) => {
 const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST, OPTIONS"};
 if(req.method==="OPTIONS") return new Response(null,{headers:cors});
 if(req.method!=="POST") return Response.json({error:"Method not allowed"},{status:405,headers:cors});
 const e=process.env, required=["AIRTABLE_TOKEN","RESEND_API_KEY"];
 const missing=required.filter(k=>!e[k]); if(missing.length) return Response.json({error:"Payment notifications are not configured yet."},{status:503,headers:cors});
 try{
  const d=await req.json(), clean=v=>String(v||"").trim().slice(0,500);
  const name=clean(d.name),business=clean(d.business),phone=clean(d.phone),email=clean(d.email),pkg=clean(d.package),amount=clean(d.amount),txn=clean(d.transactionId);
  if(!name||!phone||!pkg||!amount||!txn||!d.consent) return Response.json({error:"Complete the required fields and consent."},{status:400,headers:cors});
  if(!/^\d{4,30}$/.test(txn.replace(/\s/g,""))) return Response.json({error:"Enter the MTN transaction ID from your confirmation message."},{status:400,headers:cors});
  const note=["PAYMENT SUBMISSION — PENDING MANUAL VERIFICATION","Customer: "+name,"Business: "+business,"Phone: "+phone,"Email: "+email,"Package: "+pkg,"Amount stated: UGX "+amount,"MTN transaction ID: "+txn,"Status: PENDING — NOT VERIFIED","Owner must check the MTN account transaction history before activating any package."].join("\n");
  const base=e.AIRTABLE_BASE_ID||"appcX5JXonbBshu9w", table=e.AIRTABLE_LEADS_TABLE_ID||"tbl2IcCc6R8f0wlo4";
  const a=await fetch("https://api.airtable.com/v0/"+base+"/"+table,{method:"POST",headers:{Authorization:"Bearer "+e.AIRTABLE_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({records:[{fields:{"Lead Name":name,"Business Name":business||"Website customer","Phone / WhatsApp":phone,"Business Type":"Website package payment","Lead Source":"Website payment","Stage":"New","Notes":note}}]})});
  const ar=await a.json(); if(!a.ok) throw Error(ar.error?.message||"Could not save payment submission.");
  const rec=ar.records?.[0]?.id;
  const body={from:e.RESEND_FROM_EMAIL||"Amiri Digital Studio <onboarding@resend.dev>",to:["amiriukasha94@gmail.com"],subject:"New Amiri website payment submitted — verify MTN manually",text:"A customer submitted a payment reference. This is NOT proof of payment.\n\n"+note+"\n\nAirtable record: "+rec+"\nCheck the MTN SMS/account transaction history before approving."};
  const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+e.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!mail.ok){const m=await mail.json().catch(()=>({}));return Response.json({ok:true,warning:"Payment reference saved, but email alert failed. Check Netlify email configuration.",record:rec},{headers:cors});}
  return Response.json({ok:true,message:"Payment reference received. Your payment is pending manual verification."},{headers:cors});
 }catch(err){return Response.json({error:err.message||"Unable to submit payment."},{status:500,headers:cors});}
};