create table if not exists public.customer_websites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_name text not null default 'My Website',
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','published','suspended')),
  public_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists customer_websites_owner_idx on public.customer_websites(owner_id);
alter table public.customer_websites enable row level security;
grant select, insert, update, delete on public.customer_websites to authenticated;
grant select on public.customer_websites to anon;
create policy "Owners read own websites" on public.customer_websites for select to authenticated using ((select auth.uid()) = owner_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');
create policy "Owners create own websites" on public.customer_websites for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners update own websites" on public.customer_websites for update to authenticated using ((select auth.uid()) = owner_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner') with check ((select auth.uid()) = owner_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');
create policy "Owners delete own websites" on public.customer_websites for delete to authenticated using ((select auth.uid()) = owner_id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');
create policy "Public can view published websites" on public.customer_websites for select to anon, authenticated using (status = 'published');

create table if not exists public.customer_website_payments (
  website_id uuid primary key references public.customer_websites(id) on delete cascade,
  currency text not null default 'UGX',
  methods jsonb not null default '[]'::jsonb,
  receiving_contacts jsonb not null default '{}'::jsonb,
  payment_instructions text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.customer_website_payments enable row level security;
grant select, insert, update, delete on public.customer_website_payments to authenticated;
grant select on public.customer_website_payments to anon;
create policy "Owners read own website payment settings" on public.customer_website_payments for select to authenticated using (exists (select 1 from public.customer_websites w where w.id = website_id and (w.owner_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')));
create policy "Owners insert own website payment settings" on public.customer_website_payments for insert to authenticated with check (exists (select 1 from public.customer_websites w where w.id = website_id and (w.owner_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')));
create policy "Owners update own website payment settings" on public.customer_website_payments for update to authenticated using (exists (select 1 from public.customer_websites w where w.id = website_id and (w.owner_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'))) with check (exists (select 1 from public.customer_websites w where w.id = website_id and (w.owner_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')));
create policy "Owners delete own website payment settings" on public.customer_website_payments for delete to authenticated using (exists (select 1 from public.customer_websites w where w.id = website_id and (w.owner_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')));
create policy "Public can read published website payment details" on public.customer_website_payments for select to anon, authenticated using (exists (select 1 from public.customer_websites w where w.id = website_id and w.status = 'published'));

create table if not exists public.customer_website_audit_log (
  id bigint generated always as identity primary key,
  website_id uuid references public.customer_websites(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.customer_website_audit_log enable row level security;
grant select, insert on public.customer_website_audit_log to authenticated;
create policy "Admins read website audit log" on public.customer_website_audit_log for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');
create policy "Owners log own website actions" on public.customer_website_audit_log for insert to authenticated with check (actor_id = (select auth.uid()) and exists (select 1 from public.customer_websites w where w.id = website_id and w.owner_id = (select auth.uid())));
