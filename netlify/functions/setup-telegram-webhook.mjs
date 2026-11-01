export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const env = process.env;
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return Response.json({ error: "Missing Telegram environment variables." }, { status: 503 });
  if (req.headers.get("x-setup-secret") !== env.TELEGRAM_WEBHOOK_SECRET) return Response.json({ error: "Unauthorised." }, { status: 401 });
  const webhookUrl = "https://visionary-scone-0d0836.netlify.app/.netlify/functions/telegram-webhook";
  const response = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/setWebhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["callback_query"],
      drop_pending_updates: false
    })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) return Response.json({ error: result.description || "Telegram webhook registration failed." }, { status: 502 });
  return Response.json({ ok: true, description: result.description, webhook: webhookUrl });
};
