-- Amiri Digital Studio: Supabase starter schema
-- Run in Supabase SQL Editor after creating a project.
-- IMPORTANT: Create your own Auth account first. After signup, replace OWNER_AUTH_USER_UUID below
-- with that account's auth.users.id, then run the final UPDATE statement.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('owner','customer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_amiri_owner()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner');
$$;

create table if not exists public.website_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  category text,
  headline text,
  description text,
  services text[] not null default '{}',
  phone text,
  brand_colour text,
  status text not null default 'draft' check (status in ('draft','submitted','in_review','approved','published','rejected')),
  preview_url text,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  business_name text,
  rating int not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 10 and 1200),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  amount_ugx bigint not null check (amount_ugx > 0),
  billing_period text not null default 'weekly' check (billing_period in ('weekly','monthly','yearly','custom')),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','active','overdue','suspended','cancelled')),
  last_reminder_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_name text not null,
  extension text,
  status text not null default 'requested' check (status in ('requested','availability_check','quoted','awaiting_payment','registered','rejected','expired')),
  quoted_amount_ugx bigint,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.website_drafts enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.domain_requests enable row level security;

create policy "profile owner or self read" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_amiri_owner());
create policy "self profile insert" on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'customer');
create policy "self profile update" on public.profiles for update to authenticated
using (id = auth.uid() and role = 'customer') with check (id = auth.uid() and role = 'customer');

create policy "customers manage own drafts" on public.website_drafts for all to authenticated
using (user_id = auth.uid() or public.is_amiri_owner())
with check (user_id = auth.uid() or public.is_amiri_owner());

create policy "public read approved reviews" on public.reviews for select to anon, authenticated
using (status = 'approved' or user_id = auth.uid() or public.is_amiri_owner());
create policy "customers submit own reviews" on public.reviews for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');
create policy "owner moderate reviews" on public.reviews for update to authenticated
using (public.is_amiri_owner()) with check (public.is_amiri_owner());

create policy "customers read own subscriptions" on public.subscriptions for select to authenticated
using (user_id = auth.uid() or public.is_amiri_owner());
create policy "owner manage subscriptions" on public.subscriptions for all to authenticated
using (public.is_amiri_owner()) with check (public.is_amiri_owner());

create policy "customers read own domain requests" on public.domain_requests for select to authenticated
using (user_id = auth.uid() or public.is_amiri_owner());
create policy "customers request domains" on public.domain_requests for insert to authenticated
with check (user_id = auth.uid() and status = 'requested');
create policy "owner manage domain requests" on public.domain_requests for update to authenticated
using (public.is_amiri_owner()) with check (public.is_amiri_owner());

-- Set owner role only for your own verified Auth user ID.
-- UPDATE public.profiles SET role = 'owner' WHERE id = 'OWNER_AUTH_USER_UUID';
-- Do not store admin status in browser localStorage or user-editable metadata.
