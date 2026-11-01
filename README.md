# Amiri Digital Studio

Responsive static website starter.

## Deploy with Netlify
1. Sign in to Netlify.
2. Choose **Add new project** → **Import an existing project**.
3. Connect GitHub and select `Amiri-digital-studio`.
4. Leave build command empty and set publish directory to `.`.
5. Deploy, then test the live site and enquiry form.

## Before launch
- Confirm business contact details and add a verified WhatsApp click-to-chat URL if required.
- Confirm package scope, billing terms, setup fees, domain and hosting responsibilities.
- Submit a test enquiry and verify Netlify Forms captures it.
- Do not publish API keys, passwords, payment credentials or customer records.

## Limitations
This is a marketing website with an enquiry form, not a checkout. It does not verify MTN MoMo or Airtel Money payments, create subscriptions, automatically publish client websites or send WhatsApp messages. Netlify Forms must be enabled and tested after deployment.

## AI Website Studio setup
The Website Creator is an AI-powered draft workspace, not just a contact form. It generates standalone HTML drafts in an isolated preview and provides a JARVIS assistant for design guidance and requested edits.

To enable AI generation in Netlify:
1. Open Site configuration → Environment variables.
2. Add `OPENAI_API_KEY` as a **server-only** secret. Never add it to HTML, JavaScript served to visitors, GitHub, or chat.
3. Optionally add `OPENAI_MODEL` with a model available to your OpenAI API project (default: `gpt-5.5`).
4. Trigger a new Netlify deploy so the function receives the variables.
5. Test generation using a non-sensitive sample brief.

The AI function is `netlify/functions/ai-studio.mjs`. It uses the OpenAI Responses API and does not require Airtable or Telegram to generate a website. API usage may incur charges. Set provider/project usage limits before opening the tool to customers.

Generated HTML is a draft only. Exporting downloads the HTML; it does not register a domain, configure hosting, or publish a customer website. Publishing requires a separate owner-approved deployment workflow.

## Existing enquiry submission setup
The general enquiry form currently uses Airtable and Telegram. It will continue to report missing environment variables until `AIRTABLE_TOKEN`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` are configured in Netlify. These are separate from AI generation.
