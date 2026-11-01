export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const env = process.env;
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.TELEGRAM_WEBHOOK_SECRET || !env.AIRTABLE_TOKEN) {
    return new Response("Server setup incomplete", { status: 503 });
  }
  if (req.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }
  const api = "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/";
  const base = env.AIRTABLE_BASE_ID || "appcX5JXonbBshu9w";
  const table = env.AIRTABLE_LEADS_TABLE_ID || "tbl2IcCc6R8f0wlo4";
  const headers = { Authorization: "Bearer " + env.AIRTABLE_TOKEN, "Content-Type": "application/json" };
  try {
    const update = await req.json();
    const cb = update.callback_query;
    if (!cb) return Response.json({ ok: true });
    const chatId = String(cb.message?.chat?.id || "");
    const actorId = String(cb.from?.id || "");
    if (chatId !== String(env.TELEGRAM_CHAT_ID) || actorId !== String(env.TELEGRAM_CHAT_ID)) {
      await fetch(api + "answerCallbackQuery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cb.id, text: "Not authorised." }) });
      return Response.json({ ok: true });
    }
    const match = /^(approve|reject):(rec[A-Za-z0-9]+)$/.exec(cb.data || "");
    if (!match) return Response.json({ ok: true });
    const decision = match[1] === "approve" ? "APPROVED FOR PRODUCTION PLANNING" : "REJECTED";
    const recordId = match[2];
    const recordUrl = "https://api.airtable.com/v0/" + base + "/" + table + "/" + recordId;
    const read = await fetch(recordUrl, { headers });
    const record = await read.json();
    if (!read.ok) throw new Error(record.error?.message || "Could not find Airtable lead.");
    const stamp = new Date().toISOString();
    const note = (record.fields?.Notes || "") + "\\n\\nOWNER DECISION: " + decision + "\\nDecision time (UTC): " + stamp + "\\nDecision by Telegram owner.";
    const save = await fetch(recordUrl, { method: "PATCH", headers, body: JSON.stringify({ fields: { Notes: note } }) });
    if (!save.ok) throw new Error("Could not save owner decision to Airtable.");
    await fetch(api + "answerCallbackQuery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: cb.id, text: decision }) });
    const original = cb.message?.text || "New enquiry";
    const revised = original + "\\n\\nOWNER DECISION: " + decision + "\\nRecorded in Airtable. This action does not send anything to the customer or publish a project.";
    await fetch(api + "editMessageText", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, message_id: cb.message.message_id, text: revised, disable_web_page_preview: true }) });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "Webhook error" }, { status: 500 });
  }
};
