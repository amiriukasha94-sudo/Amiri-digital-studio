const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: { Allow: "POST" }, body: JSON.stringify({ error: "Method not allowed" }) };
  let data; try { data = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) }; }
  const required = ["name","business","phone","service","message"];
  if (required.some(key => !String(data[key] || "").trim()) || data.consent !== true) return { statusCode: 400, body: JSON.stringify({ error: "Complete the required fields and consent checkbox." }) };
  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { statusCode: 503, body: JSON.stringify({ error: "The enquiry service is not configured yet. Please contact us on WhatsApp while setup is completed." }) };
  const lines = ["NEW AMIRI WEBSITE ENQUIRY","Name: " + data.name,"Business: " + data.business,"Phone: " + data.phone,"Email: " + (data.email || "Not provided"),"Service: " + data.service,"Package/budget: " + (data.package || "Not specified"),"Deadline: " + (data.deadline || "Not specified"),"Reference: " + (data.reference || "None"),"Message: " + data.message];
  const text = lines.join("\n").slice(0, 3900);
  try {
    const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error("Telegram delivery failed");
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, message: "Enquiry sent to Amiri Digital Studio. We will contact you soon." }) };
  } catch (error) {
    console.error("Telegram enquiry notification failed:", error.message);
    return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "We could not deliver your enquiry right now. Please use WhatsApp instead." }) };
  }
};
