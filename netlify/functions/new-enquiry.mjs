export default async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  const env = process.env;
  const required = ["AIRTABLE_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];
  const missing = required.filter(k => !env[k]);
  if (missing.length) return Response.json({ error: "Server setup incomplete. Missing: " + missing.join(", ") }, { status: 503, headers: cors });

  try {
    const d = await req.json();
    const clean = v => String(v || "").trim().slice(0, 3000);
    const name = clean(d.name), business = clean(d.business), phone = clean(d.phone), email = clean(d.email);
    const service = clean(d.service), budget = clean(d.package), message = clean(d.message), reference = clean(d.reference), deadline = clean(d.deadline);
    if (!d.consent || !name || !business || !phone || !service || !message) return Response.json({ error: "Please complete all required fields and consent." }, { status: 400, headers: cors });
    if (name.length > 120 || business.length > 160 || phone.length > 30 || email.length > 180) return Response.json({ error: "One or more fields are too long." }, { status: 400, headers: cors });

    const brief = [
      "AMIRI DIGITAL STUDIO — INTERNAL PRODUCTION BRIEF",
      "Client: " + name, "Business: " + business, "Contact: " + phone,
      "Service requested: " + service, "Package / budget: " + (budget || "Not specified"),
      "Project requirements: " + message, "Reference: " + (reference || "None"),
      "Preferred deadline: " + (deadline || "Not specified"),
      "", "REVIEW CHECKLIST: Confirm deliverables, content, dimensions/pages, price, timeline and payment terms with the owner.",
      "STATUS: AWAITING OWNER APPROVAL. Do not deliver or publish."
    ].join("\n");

    const fields = {
      "Lead Name": name, "Business Name": business, "Phone / WhatsApp": phone,
      "Business Type": service, "Lead Source": "Other", "Stage": "New",
      "Notes": brief + (email ? "\nEmail: " + email : "")
    };
    const a = await fetch("https://api.airtable.com/v0/" + (env.AIRTABLE_BASE_ID || "appcX5JXonbBshu9w") + "/" + (env.AIRTABLE_LEADS_TABLE_ID || "tbl2IcCc6R8f0wlo4"), {
      method: "POST", headers: { Authorization: "Bearer " + env.AIRTABLE_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ fields }] })
    });
    const ar = await a.json();
    if (!a.ok) throw new Error("Airtable save failed: " + (ar.error?.message || a.status));
    const recordId = ar.records?.[0]?.id;
    const text = "🔔 NEW AMIRI STUDIO ENQUIRY\n\n" + brief + "\n\nAirtable record: " + recordId + "\nReview and approve scope manually before starting. Nothing has been sent to the customer.";
    const t = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: "✅ Approve for production planning", callback_data: "approve:" + recordId }, { text: "❌ Reject enquiry", callback_data: "reject:" + recordId }]] } })
    });
    const tr = await t.json();
    if (!t.ok || !tr.ok) throw new Error("Enquiry saved to Airtable, but Telegram notification failed.");
    return Response.json({ ok: true, message: "Enquiry received for owner review." }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message || "Unable to process enquiry." }, { status: 500, headers: cors });
  }
};
