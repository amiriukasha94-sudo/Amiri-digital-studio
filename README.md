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

## Private client draft sharing
The AI Studio now supports a private cloud preview handoff. A client can generate a website, then choose **Save & send to Amiri**. The server creates an unguessable 256-bit share token, stores only its SHA-256 hash in Supabase, and opens normal WhatsApp with the private preview URL. The recipient must still tap Send in WhatsApp. Links expire after 30 days.

Setup:
1. Create a Supabase project.
2. In its SQL Editor, run `supabase/draft-sharing.sql`.
3. In Netlify environment variables, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key server-side only; never expose it in browser code or GitHub.
4. Redeploy the development branch and test with a sample draft.
5. Open the preview link on a different device and test both **Approve design** and **Request changes**.

The client approval is a design sign-off only. It does not publish the website, verify payment or activate hosting. The draft preview page is `/draft-preview.html`. Repeat saves from the same browser update the same share link and add a revision-history entry. Clearing browser storage loses the local token; the existing cloud link remains available to anyone who already has it.

Security note: the share URL is a bearer link. Anyone who receives it can view the draft and submit feedback. Do not put sensitive personal data in a website brief. The initial version does not yet include customer accounts, owner authentication, automated rate limiting or automatic publication. Add those controls before large-scale public launch. Configure Supabase backups and monitor function/database usage.

## Investor licensing foundation (development branch)
The investor page is `/partners.html`. It presents two commercial models:
- White-label: a partner operates under their own brand using a licensed Amiri platform workspace.
- Franchise: a partner operates within a separately agreed territory and franchise contract.
- Enterprise: negotiated deployment and service terms.

The page describes proposed starting prices only; they are not a binding quote, revenue promise or completed franchise offer. Use a written agreement reviewed for the relevant jurisdiction before accepting investor funds. The agreement should define term, territory, permitted use, fees, renewals, support, data ownership/access/export, security, third-party costs, termination, transition and dispute resolution.

To prepare the database foundation, run `supabase/licensing.sql` after `supabase/schema.sql`. It creates central licence, brand-workspace and audit tables. RLS currently permits only the verified Amiri owner role to access these tables. Investor/customer policies are deliberately not enabled until tenant authentication and isolation are implemented and tested. This is a schema foundation, not a functioning investor dashboard or automated licence enforcement.

Do not promise investors that they own the underlying website, source code, platform or Amiri business. They receive only the rights expressly granted in a signed licence. Third-party software, fonts, images and services remain subject to their own licences.

## Simple owner console (no database required for this first version)

The owner route is `/admin/`. It uses one password stored as a Netlify environment secret. The server issues a signed session token that expires after 8 hours. The password is never embedded in the website source.

In Netlify → Site configuration → Environment variables, add:
- `ADMIN_PASSWORD`: a long, unique password (at least 16 characters).
- `ADMIN_SESSION_SECRET`: a separate random secret of at least 32 characters.
- `SITE_ORIGIN`: exact site origin, e.g. `https://your-site.netlify.app` (no trailing slash).

Save the variables and trigger a new deploy. Then visit `/admin/` and sign in. Do not put either secret in GitHub, HTML, or chat. Use a password manager and enable Netlify account MFA.

**Important limitation:** this no-database version saves investor/licence records only in the browser's local storage on the device where you use the dashboard. It does not sync between phones/computers, and clearing browser data can erase the records. Use **Export CSV backup** regularly. These records are drafts only, not signed contracts or proof of payment. Do not sell this as a multi-investor cloud platform yet. The old Supabase owner setup is not required for this simple console, though other site features may still use Supabase.
