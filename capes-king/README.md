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

## Admin activation (not yet assigned)
The admin email was intentionally left blank. To activate an administrator:
1. Create the owner's user in Supabase Authentication.
2. Insert that exact auth user's UUID into `public.admin_users(user_id)` using the Supabase SQL editor.
3. Keep sign-up disabled for the public; create admin accounts manually.
4. Sign in through the **Admin** link in the storefront footer.

Until the UUID is assigned, no account can access admin functions. RLS policies enforce the same restriction in the database.

## Important
Orders are saved with status `pending`. The customer must press Send in WhatsApp to message the store. No card/mobile-money payment is processed by this website. Delivery fee defaults to zero until an admin sets it.
