# Capes King storefront

Mobile-first storefront for Capes King, connected to the dedicated Supabase project.

## Included
- Product catalogue, category filters, cart and quantities
- Optional extras/upsells
- Customer details, delivery address and payment preference
- Pending order saved to Supabase, then full order message opened in WhatsApp
- Admin sign-in, product creation/editing/removal, photo upload, price/stock editing, upsells, order status and delivery fee settings
- Database row-level security remains the authority for all admin operations

## Supabase configuration
The storefront uses the project's public publishable key in the browser. Never add a Supabase secret/service-role key to this file.

Project URL: https://wwwerfvlofvfouupeijs.supabase.co

## Deploy on Netlify
Create a **new Netlify site** connected to this repository. Set:
- Base directory: `capes-king`
- Publish directory: `.`
- Build command: leave blank

The live site entry file is `capes-king/index.html`.

Do not change the existing Amiri Digital Studio site's build settings.

## Owner admin account
The approved owner email is `amiriukasha94@gmail.com`. A database trigger automatically adds only a newly registered account with this exact email to `public.admin_users`; other sign-ups do not receive admin access.
1. Open the storefront and select **Admin** in the footer.
2. Enter `amiriukasha94@gmail.com` and a strong password, then select **Create admin account**.
3. Verify the email using the message sent by Supabase.
4. Return to **Admin** and sign in with that email and password.

Do not share the password. Admin access is also enforced by database row-level security.

## Important
Orders are saved with status `pending`. The customer must press Send in WhatsApp to message the store. No card/mobile-money payment is processed by this website. Delivery fee defaults to zero until an admin sets it.
