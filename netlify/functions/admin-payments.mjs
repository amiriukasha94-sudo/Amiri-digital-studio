export default async (req)=>{
 const e=process.env, cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, X-Admin-Key","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
 if(req.method==="OPTIONS") return new Response(null,{headers:cors});
 if(!e.ADMIN_ACCESS_KEY||!e.AIRTABLE_TOKEN) return Response.json({error:"Admin service is not configured."},{status:503,headers:cors});
 if(req.headers.get("x-admin-key")!==e.ADMIN_ACCESS_KEY) return Response.json({error:"Unauthorised."},{status:401,headers:cors});
 const base=e.AIRTABLE_BASE_ID||"appcX5JXonbBshu9w",table=e.AIRTABLE_LEADS_TABLE_ID||"tbl2IcCc6R8f0wlo4",url="https://api.airtable.com/v0/"+base+"/"+table;
 const headers={Authorization:"Bearer "+e.AIRTABLE_TOKEN,"Content-Type":"application/json"};
 try{
  if(req.method==="GET"){
   const u=new URL(url);u.searchParams.set("maxRecords","100");u.searchParams.set("sort[0][field]","Created");u.searchParams.set("sort[0][direction]","desc");
   const r=await fetch(u,{headers});const j=await r.json();if(!r.ok)throw Error(j.error?.message||"Could not load records.");
   const records=(j.records||[]).filter(x=>(x.fields?.Notes||"").includes("PAYMENT SUBMISSION"));
   return Response.json({records:records.map(x=>({id:x.id,name:x.fields["Lead Name"]||"",business:x.fields["Business Name"]||"",phone:x.fields["Phone / WhatsApp"]||"",notes:x.fields.Notes||"",stage:x.fields.Stage||"New"}))},{headers:cors});
  }
  if(req.method==="POST"){
   const d=await req.json();if(!/^rec[A-Za-z0-9]+$/.test(d.recordId||"")||!["VERIFIED","REJECTED"].includes(d.decision))return Response.json({error:"Invalid admin action."},{status:400,headers:cors});
   const target=url+"/"+d.recordId,read=await fetch(target,{headers}),record=await read.json();if(!read.ok)throw Error(record.error?.message||"Record not found.");
   const current=record.fields?.Notes||"";if(!current.includes("PAYMENT SUBMISSION"))return Response.json({error:"This is not a payment record."},{status:400,headers:cors});
   const note=current+"\n\nOWNER PAYMENT DECISION: "+d.decision+"\nRecorded: "+new Date().toISOString()+"\n"+(d.decision==="VERIFIED"?"Owner checked MTN transaction history. Package may now be activated manually.":"Payment not accepted. Contact customer if clarification is needed.");
   const save=await fetch(target,{method:"PATCH",headers,body:JSON.stringify({fields:{Notes:note,Stage:d.decision==="VERIFIED"?"Won":"Lost"}})});const sj=await save.json();if(!save.ok)throw Error(sj.error?.message||"Could not save decision.");
   return Response.json({ok:true},{headers:cors});
  }
  return Response.json({error:"Method not allowed"},{status:405,headers:cors});
 }catch(err){return Response.json({error:err.message||"Admin error."},{status:500,headers:cors});}
};