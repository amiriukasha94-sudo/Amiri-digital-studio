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
 const countryDial={"uganda":"256","kenya":"254","tanzania":"255","rwanda":"250","burundi":"257","south sudan":"211","nigeria":"234","ghana":"233","south africa":"27","united states":"1","usa":"1","united kingdom":"44","uk":"44","india":"91","guinea":"224"};
 const whatsappNumber=x=>{
  let raw=String(x.phone||"").trim();if(!raw)return "";
  let digits=raw.replace(/[^0-9]/g,"");if(raw.startsWith("00"))digits=digits.slice(2);
  if(raw.startsWith("+")||raw.startsWith("00"))return digits;
  const country=String(x.address||"").split(",").pop().trim().toLowerCase(),dial=countryDial[country];
  if(dial&&digits.startsWith("0"))return dial+digits.slice(1);
  if(dial&&digits.startsWith(dial))return digits;
  return "";
 };
 const render=rows=>{
  resultBox.innerHTML=rows.length?rows.map(x=>{
   const saved=readSaved().find(s=>s.id===x.id);
   const msg="Hello "+x.name+", I’m reaching out from Amiri Digital Studio. We help businesses improve their online presence with professional, mobile-friendly websites. Would you be open to seeing a few ideas for your business?";
   const waNumber=whatsappNumber(x),wa=waNumber?"https://wa.me/"+waNumber+"?text="+encodeURIComponent(msg):"";
   const details=[x.phone?'<a href="tel:'+esc(x.phone)+'">☎ '+esc(x.phone)+'</a>':'',x.email?'<a href="mailto:'+esc(x.email)+'">✉ '+esc(x.email)+'</a>':'',x.address?'<span>⌖ '+esc(x.address)+'</span>':'',x.openingHours?'<span>◷ '+esc(x.openingHours)+'</span>':'',x.website?'<a href="'+esc(/^https?:\/\//i.test(x.website)?x.website:"https://"+x.website)+'" target="_blank" rel="noopener">🌐 Website ↗</a>':'',x.facebook?'<a href="'+esc(/^https?:\/\//i.test(x.facebook)?x.facebook:"https://"+x.facebook)+'" target="_blank" rel="noopener">Facebook ↗</a>':'',x.instagram?'<a href="'+esc(/^https?:\/\//i.test(x.instagram)?x.instagram:"https://www.instagram.com/"+x.instagram.replace(/^@/,""))+'" target="_blank" rel="noopener">Instagram ↗</a>':''].filter(Boolean).join("");
   return '<article class="lead-card"><div class="lead-card-head"><div><span class="lead-score">OPPORTUNITY '+x.score+'/75</span><h3>'+esc(x.name)+'</h3><small>'+esc(x.category)+'</small></div><span class="lead-status">'+esc(saved?.status||"New")+'</span></div><p class="lead-website">'+esc(x.websiteStatus)+'</p><div class="lead-contacts">'+(details||'<span>No public phone, email or website details were found in this listing.</span>')+'</div><div class="lead-card-actions">'+(wa?'<a class="btn gold whatsapp-lead" href="'+esc(wa)+'" target="_blank" rel="noopener">WhatsApp ↗</a>':'')+(x.phone?'<a class="btn outline" href="tel:'+esc(x.phone)+'">Call</a>':'')+(x.email?'<a class="btn outline" href="mailto:'+esc(x.email)+'">Email</a>':'')+'<button type="button" class="btn outline save-lead" data-id="'+esc(x.id)+'">'+(saved?"Update saved":"Save lead")+'</button><select class="lead-stage" data-id="'+esc(x.id)+'" aria-label="Lead status"><option '+((saved?.status||"New")==="New"?"selected":"")+' >New</option><option '+(saved?.status==="Contacted"?"selected":"")+'>Contacted</option><option '+(saved?.status==="Interested"?"selected":"")+'>Interested</option><option '+(saved?.status==="Quoted"?"selected":"")+'>Quoted</option><option '+(saved?.status==="Won"?"selected":"")+'>Won</option></select><a class="source-link" href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener">Source ↗</a></div></article>';
  }).join(""):'<p class="lead-empty">No matching named businesses were returned. Try a nearby larger city or another category.</p>';
 };
 leadForm.addEventListener("submit",async e=>{
  e.preventDefault();const location=document.querySelector("#lead-location").value.trim(),category=document.querySelector("#lead-category").value;
  searchBtn.disabled=true;searchBtn.textContent="Searching…";countBox.textContent="Searching public listings…";resultBox.innerHTML='<p class="lead-empty">Contacting the public business directory. This can take several seconds.</p>';
  try{
   const r=await fetch("/.netlify/functions/lead-search?location="+encodeURIComponent(location)+"&category="+encodeURIComponent(category),{headers:{"Accept":"application/json"}});
   const contentType=r.headers.get("content-type")||"";
   const raw=await r.text();
   if(!contentType.toLowerCase().includes("json")){
    console.error("Lead search returned non-JSON:",r.status,contentType,raw.slice(0,500));
    throw Error("The lead-search service returned a webpage instead of data (HTTP "+r.status+"). The latest backend may not be deployed yet. Open the preview again after Netlify finishes deploying.");
   }
   let data;try{data=JSON.parse(raw)}catch{throw Error("The lead-search service returned invalid data. Please retry after the site deployment finishes.");}
   if(!r.ok)throw Error(data.error||"Search failed (HTTP "+r.status+").");
   currentLeads=data.leads||[];render(currentLeads);countBox.textContent=currentLeads.length+" businesses found near "+(data.location||location)+(data.radiusKm?" · "+data.radiusKm+" km search area":"");exportBtn.disabled=!currentLeads.length;
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

/* MTN manual payment reference submission */
const paymentForm=document.querySelector("#payment-submit-form");
if(paymentForm){paymentForm.addEventListener("submit",async e=>{e.preventDefault();const btn=document.querySelector("#payment-submit-btn"),status=document.querySelector("#payment-status");btn.disabled=true;btn.textContent="Submitting…";status.textContent="Saving your payment reference.";const data=Object.fromEntries(new FormData(paymentForm).entries());data.consent=paymentForm.querySelector('[name="consent"]').checked;try{const r=await fetch("/.netlify/functions/payment-submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}),out=await r.json();if(!r.ok)throw Error(out.error||"Submission failed.");status.textContent=out.message||"Reference received. Await manual verification.";paymentForm.reset();}catch(err){status.textContent=err.message;btn.disabled=false;btn.textContent="Submit payment reference ↗";}});}


/* Live package currency display — all currencies supplied by the exchange-rate feed */
const currencySelect=document.querySelector("#price-currency");
if(currencySelect){
 const priceNodes=[...document.querySelectorAll(".converted-price[data-base-ugx]")];
 const note=document.querySelector("#currency-rate-note");
 const formatMoney=(amount,code)=>new Intl.NumberFormat(undefined,{style:"currency",currency:code,maximumFractionDigits:code==="UGX"||code==="JPY"||code==="KRW"?0:2}).format(amount);
 const showPrices=(code,rate)=>{
  priceNodes.forEach(node=>{const base=Number(node.dataset.baseUgx);node.innerHTML=code==="UGX"?"UGX "+base.toLocaleString()+" <small>/ week</small>":formatMoney(base*rate,code)+" <small>/ week</small>";});
 };
 const loadCurrencies=async()=>{
  try{
   let payload=null;
   const cached=localStorage.getItem("amiriCurrencyRates");
   if(cached){try{const parsed=JSON.parse(cached);if(Date.now()-parsed.savedAt<12*60*60*1000)payload=parsed.payload;}catch{}}
   if(!payload){
    const response=await fetch("https://open.er-api.com/v6/latest/UGX",{cache:"no-store"});
    if(!response.ok)throw Error("Exchange-rate service unavailable");
    payload=await response.json();
    if(payload.result!=="success"||!payload.rates)throw Error("Exchange-rate data unavailable");
    try{localStorage.setItem("amiriCurrencyRates",JSON.stringify({savedAt:Date.now(),payload}));}catch{}
   }
   const rates=payload.rates;
   const codes=Object.keys(rates).filter(code=>/^[A-Z]{3}$/.test(code)&&Number.isFinite(Number(rates[code]))&&Number(rates[code])>0).sort();
   if(!codes.includes("UGX"))codes.unshift("UGX");
   currencySelect.innerHTML=codes.map(code=>'<option value="'+code+'">'+code+'</option>').join("");
   currencySelect.value="UGX";
   showPrices("UGX",1);
   currencySelect.addEventListener("change",()=>{
    const code=currencySelect.value,rate=code==="UGX"?1:Number(rates[code]);
    showPrices(code,rate);
    note.textContent="Indicative conversion from UGX. Exchange rates are provided by an external service; your bank or transfer provider may apply different rates and fees. Payment remains due in UGX unless agreed directly.";
   });
   note.textContent="Showing UGX prices. "+codes.length+" supported currencies available. Updated: "+(payload.time_last_update_utc||"latest feed")+". Converted prices are estimates only; payment remains due in UGX.";
  }catch(error){
   currencySelect.innerHTML='<option value="UGX">UGX — Ugandan Shilling</option>';
   note.textContent="Live currency conversion is temporarily unavailable. Package prices remain in UGX.";
  }
 };
 loadCurrencies();
}

/* Scroll reveal with reduced-motion and browser fallback support */
(()=>{const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced||!('IntersectionObserver' in window))return;const targets=document.querySelectorAll('main section:not(.hero),.partner-wrap,.partner-hero');targets.forEach(el=>el.classList.add('amiri-reveal-pending'));const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('amiri-revealed');io.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});targets.forEach(el=>io.observe(el));})();
