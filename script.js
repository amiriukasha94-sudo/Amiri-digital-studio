const menu=document.querySelector(".menu"),nav=document.querySelector("nav");if(menu&&nav){menu.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open))});nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu.setAttribute("aria-expanded","false")}))}document.querySelectorAll("[data-plan]").forEach(a=>a.addEventListener("click",()=>{const select=document.querySelector('[name="package"]');if(select){const match=[...select.options].find(o=>o.textContent.toLowerCase().startsWith(a.dataset.plan.toLowerCase()));if(match)select.value=match.value}}));const year=document.querySelector("#year");if(year)year.textContent=new Date().getFullYear();
const enquiryForm=document.querySelector("#project-enquiry");
if(enquiryForm){enquiryForm.addEventListener("submit",async e=>{e.preventDefault();const btn=document.querySelector("#enquiry-submit"),status=document.querySelector("#enquiry-status");btn.disabled=true;btn.textContent="Preparing brief…";status.textContent="Submitting securely.";const data=Object.fromEntries(new FormData(enquiryForm).entries());data.consent=enquiryForm.querySelector('[name="consent"]').checked;try{const r=await fetch("/.netlify/functions/new-enquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const out=await r.json();if(!r.ok)throw Error(out.error||"Submission failed.");status.textContent="Enquiry received. Our team will review your project and contact you.";enquiryForm.reset();}catch(err){status.textContent=err.message+" Use the WhatsApp button if this continues.";btn.disabled=false;btn.textContent="Send project brief ↗";}});}

/* Amiri Lead Intelligence — public OpenStreetMap listings */
const leadForm=document.querySelector("#lead-search-form");
if(leadForm){
 const resultBox=document.querySelector("#lead-results"),countBox=document.querySelector("#lead-count"),searchBtn=document.querySelector("#lead-search-button"),exportBtn=document.querySelector("#lead-export");
 let currentLeads=[];
 const readSaved=()=>{try{return JSON.parse(localStorage.getItem("amiriSavedLeads")||"[]")}catch{return []}};
 const writeSaved=rows=>{try{localStorage.setItem("amiriSavedLeads",JSON.stringify(rows))}catch{}};
 const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const render=rows=>{
  resultBox.innerHTML=rows.length?rows.map(x=>{
   const saved=readSaved().find(s=>s.id===x.id);
   const msg="Hello "+x.name+", I’m reaching out from Amiri Digital Studio. We help businesses improve their online presence with professional, mobile-friendly websites. Would you be open to seeing a few ideas for your business?";
   const wa=x.phone?"https://wa.me/"+x.phone.replace(/[^0-9]/g,"")+"?text="+encodeURIComponent(msg):"";
   return '<article class="lead-card"><div class="lead-card-head"><div><span class="lead-score">OPPORTUNITY '+x.score+'/85</span><h3>'+esc(x.name)+'</h3><small>'+esc(x.category)+'</small></div><span class="lead-status">'+esc(saved?.status||"New")+'</span></div><p class="lead-website">'+esc(x.websiteStatus)+'</p><div class="lead-contacts">'+(x.phone?'<span>☎ '+esc(x.phone)+'</span>':'')+(x.email?'<span>✉ '+esc(x.email)+'</span>':'')+(x.address?'<span>⌖ '+esc(x.address)+'</span>':'')+'</div><div class="lead-card-actions"><button type="button" class="btn outline save-lead" data-id="'+esc(x.id)+'">'+(saved?"Update saved":"Save lead")+'</button><select class="lead-stage" data-id="'+esc(x.id)+'" aria-label="Lead status"><option '+((saved?.status||"New")==="New"?"selected":"")+' >New</option><option '+(saved?.status==="Contacted"?"selected":"")+'>Contacted</option><option '+(saved?.status==="Interested"?"selected":"")+'>Interested</option><option '+(saved?.status==="Quoted"?"selected":"")+'>Quoted</option><option '+(saved?.status==="Won"?"selected":"")+'>Won</option></select><a class="source-link" href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener">Source ↗</a>'+(wa?'<a class="source-link" href="'+esc(wa)+'" target="_blank" rel="noopener">Prepare WhatsApp ↗</a>':'')+'</div></article>';
  }).join(""):'<p class="lead-empty">No matching named businesses were returned. Try a nearby larger city or another category.</p>';
 };
 leadForm.addEventListener("submit",async e=>{
  e.preventDefault();const location=document.querySelector("#lead-location").value.trim(),category=document.querySelector("#lead-category").value;
  searchBtn.disabled=true;searchBtn.textContent="Searching…";countBox.textContent="Searching public listings…";resultBox.innerHTML='<p class="lead-empty">Contacting the public business directory. This can take several seconds.</p>';
  try{
   const r=await fetch("/.netlify/functions/lead-search?location="+encodeURIComponent(location)+"&category="+encodeURIComponent(category));
   const data=await r.json();if(!r.ok)throw Error(data.error||"Search failed.");
   currentLeads=data.leads||[];render(currentLeads);countBox.textContent=currentLeads.length+" businesses found near "+data.location+" · "+data.radiusKm+" km search area";exportBtn.disabled=!currentLeads.length;
  }catch(err){countBox.textContent="Search unavailable";resultBox.innerHTML='<p class="lead-empty">'+esc(err.message)+'</p>'}
  finally{searchBtn.disabled=false;searchBtn.textContent="Search businesses ↗"}
 });
 resultBox.addEventListener("click",e=>{
  const btn=e.target.closest(".save-lead");if(!btn)return;
  const lead=currentLeads.find(x=>x.id===btn.dataset.id);if(!lead)return;
  const rows=readSaved(),idx=rows.findIndex(x=>x.id===lead.id),item={...lead,status:idx>=0?rows[idx].status:"New",savedAt:new Date().toISOString()};
  if(idx>=0)rows[idx]=item;else rows.unshift(item);writeSaved(rows);render(currentLeads);
 });
 resultBox.addEventListener("change",e=>{
  if(!e.target.matches(".lead-stage"))return;
  const rows=readSaved(),id=e.target.dataset.id,idx=rows.findIndex(x=>x.id===id),lead=currentLeads.find(x=>x.id===id);if(!lead)return;
  const item={...lead,status:e.target.value,savedAt:new Date().toISOString()};if(idx>=0)rows[idx]=item;else rows.unshift(item);writeSaved(rows);render(currentLeads);
 });
 exportBtn.addEventListener("click",()=>{
  const rows=readSaved();if(!rows.length)return;
  const cols=["name","category","websiteStatus","website","phone","email","address","score","status","sourceUrl"];
  const csv=[cols.join(","),...rows.map(x=>cols.map(k=>'"'+String(x[k]??"").replace(/"/g,'""')+'"').join(","))].join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})),a=document.createElement("a");a.href=url;a.download="amiri-saved-leads.csv";a.click();URL.revokeObjectURL(url);
 });
}
